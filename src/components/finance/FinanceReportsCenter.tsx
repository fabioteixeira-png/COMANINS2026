import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Building2, Download, Printer, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import * as XLSX from 'xlsx';
import { FinanceAuditEntry, FinanceOperation, FinanceTransaction } from '../../types';
import { fetchFinanceAudit, syncFinanceCollection, syncFinanceOperations, syncFinanceTransactions } from '../../lib/firebase';
import CadastrosFinanceiros from './CadastrosFinanceiros';
import { financeTodayLocal, financeYearLocal } from './finance-date';

interface Props {
  requestAdminDelete?: (type: string, id: string, name: string) => void;
  canEdit?: boolean;
}

type Area = 'relatorios' | 'cadastros' | 'auditoria';
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const openOf = (item: FinanceTransaction) => Math.max(0, Number.isFinite(Number(item.openBalance)) ? Number(item.openBalance) : Number(item.amount || 0) - Number(item.paidAmount || 0));
const datePt = (value?: string) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : '—';

export default function FinanceReportsCenter({ requestAdminDelete, canEdit = false }: Props) {
  const [area, setArea] = useState<Area>('relatorios');
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [operations, setOperations] = useState<FinanceOperation[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [year, setYear] = useState(financeYearLocal());
  const [audit, setAudit] = useState<FinanceAuditEntry[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditBusy, setAuditBusy] = useState(false);

  useEffect(() => {
    const t = syncFinanceTransactions(setTransactions);
    const o = syncFinanceOperations(setOperations);
    const b = syncFinanceCollection<any>('financeBankAccounts', setBankAccounts, 200);
    return () => { t(); o(); b(); };
  }, []);

  const loadAudit = async () => {
    setAuditBusy(true);
    try { setAudit(await fetchFinanceAudit(200)); }
    catch (error: any) { alert(error?.message || 'Não foi possível carregar a auditoria financeira.'); }
    finally { setAuditBusy(false); }
  };

  useEffect(() => { if (area === 'auditoria' && audit.length === 0) void loadAudit(); }, [area]);

  const report = useMemo(() => {
    const yearTx = transactions.filter(item => String(item.date || '').startsWith(year) && item.status !== 'cancelado');
    const revenueGross = yearTx.filter(item => item.type === 'receita').reduce((sum, item) => sum + Number(item.grossAmount || item.amount || 0), 0);
    const retentions = yearTx.filter(item => item.type === 'receita').reduce((sum, item) => sum + Number(item.retentions || 0), 0);
    const revenueNet = yearTx.filter(item => item.type === 'receita').reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const expenses = yearTx.filter(item => item.type === 'despesa').reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const result = revenueNet - expenses;
    const openReceivable = transactions.filter(item => item.type === 'receita' && item.status !== 'cancelado').reduce((sum, item) => sum + openOf(item), 0);
    const openPayable = transactions.filter(item => item.type === 'despesa' && item.status !== 'cancelado').reduce((sum, item) => sum + openOf(item), 0);
    const bankBalance = bankAccounts.reduce((sum, item) => sum + Number(item.balance || 0), 0);

    // Fluxo realizado pertence ao ano da baixa, independentemente do ano de
    // competência/origem do título. Ex.: NF de dezembro recebida em janeiro
    // precisa aparecer no caixa de janeiro do novo exercício.
    let cashIn = 0; let cashOut = 0;
    transactions.filter(item => item.status !== 'cancelado').forEach(item => {
      (item.settlements || []).forEach(settlement => {
        if (!String(settlement.date || '').startsWith(year)) return;
        if (item.type === 'receita') cashIn += Number(settlement.amount || 0); else cashOut += Number(settlement.amount || 0);
      });
    });

    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    const budgets = operations
      .filter(item => item.kind === 'orcamento' && String(item.date || '') <= yearEnd && String(item.dueDate || '') >= yearStart)
      .map(item => {
        const periodStart = String(item.date || '') > yearStart ? String(item.date || '') : yearStart;
        const periodEnd = String(item.dueDate || '') < yearEnd ? String(item.dueDate || '') : yearEnd;
        const realized = transactions.filter(tx =>
          tx.type === 'despesa'
          && tx.status !== 'cancelado'
          && tx.date >= periodStart
          && tx.date <= periodEnd
          && (!item.costCenter || tx.costCenter === item.costCenter)
          && (!item.category || tx.category === item.category)
        ).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
        const planned = Number(item.amount || 0);
        return { id: item.id, center: item.costCenter || '—', category: item.category || '—', planned, realized, variance: planned - realized };
      });

    // Rateios ativos são aplicados apenas na visão gerencial por centro de custo.
    // O lançamento original permanece imutável no razão financeiro; assim a
    // distribuição pode ser revisada sem apagar ou reescrever o histórico.
    const activeRateios = operations
      .filter(item => item.kind === 'rateio' && item.status !== 'inativo' && Array.isArray(item.details?.targets))
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    const rateioBySource = new Map<string, FinanceOperation>();
    activeRateios.forEach(rule => {
      const source = String(rule.details?.sourceCostCenter || rule.costCenter || '').trim();
      if (source && !rateioBySource.has(source)) rateioBySource.set(source, rule);
    });

    const centerTotals = new Map<string, { revenue: number; expense: number }>();
    const ensureCenter = (center: string) => {
      const key = center || 'Sem centro de custo';
      if (!centerTotals.has(key)) centerTotals.set(key, { revenue: 0, expense: 0 });
      return centerTotals.get(key)!;
    };
    yearTx.forEach(tx => {
      const center = String(tx.costCenter || 'Sem centro de custo').trim() || 'Sem centro de custo';
      const amount = Number(tx.amount || 0);
      if (tx.type === 'receita') {
        ensureCenter(center).revenue += amount;
        return;
      }
      const rule = rateioBySource.get(center);
      const targets = Array.isArray(rule?.details?.targets) ? rule!.details!.targets : [];
      const validTargets = targets.filter((target: any) => String(target?.costCenter || '').trim() && Number(target?.percent || 0) > 0);
      const totalPercent = validTargets.reduce((sum: number, target: any) => sum + Number(target.percent || 0), 0);
      if (!rule || validTargets.length === 0 || Math.abs(totalPercent - 100) > 0.01) {
        ensureCenter(center).expense += amount;
        return;
      }
      validTargets.forEach((target: any) => {
        ensureCenter(String(target.costCenter).trim()).expense += amount * (Number(target.percent || 0) / 100);
      });
    });
    const margins = Array.from(centerTotals.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([center, values]) => {
      const revenue = Number(values.revenue.toFixed(2));
      const expense = Number(values.expense.toFixed(2));
      const margin = revenue > 0 ? ((revenue - expense) / revenue) * 100 : 0;
      return { center, revenue, expense, result: revenue - expense, margin };
    });

    const businessToday = financeTodayLocal();
    const currentYear = Number(businessToday.slice(0, 4));
    const currentMonth = Number(businessToday.slice(5, 7));
    const assets = operations.filter(item => item.kind === 'ativo' && item.status !== 'baixado').map(item => {
      const d = item.details || {};
      const acquisitionYear = Number(String(item.date || businessToday).slice(0, 4));
      const acquisitionMonth = Number(String(item.date || businessToday).slice(5, 7));
      const months = Math.max(0, (currentYear - acquisitionYear) * 12 + currentMonth - acquisitionMonth);
      const cost = Number(item.amount || 0); const residual = Number(d.salvageValue || 0); const life = Math.max(1, Number(d.lifeMonths || 1));
      const monthly = Math.max(0, cost - residual) / life; const accumulated = Math.min(Math.max(0, cost - residual), monthly * months);
      return { id: item.id, name: item.title, cost, residual, life, monthly, accumulated, bookValue: Math.max(residual, cost - accumulated) };
    });

    return { revenueGross, retentions, revenueNet, expenses, result, openReceivable, openPayable, bankBalance, cashIn, cashOut, cashNet: cashIn - cashOut, budgets, margins, assets, rateiosApplied: rateioBySource.size };
  }, [transactions, operations, bankAccounts, year]);

  const exportWorkbook = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { Indicador: 'Receita Bruta', Valor: report.revenueGross }, { Indicador: 'Retenções / Deduções', Valor: report.retentions },
      { Indicador: 'Receita Líquida', Valor: report.revenueNet }, { Indicador: 'Despesas', Valor: report.expenses }, { Indicador: 'Resultado', Valor: report.result },
      { Indicador: 'Saldo Bancário Informado', Valor: report.bankBalance }, { Indicador: 'Contas a Receber em Aberto', Valor: report.openReceivable }, { Indicador: 'Contas a Pagar em Aberto', Valor: report.openPayable },
    ]), 'Resumo');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ 'Entradas realizadas': report.cashIn, 'Saídas realizadas': report.cashOut, 'Fluxo líquido': report.cashNet }]), 'Fluxo_Caixa');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(report.budgets.map(item => ({ 'Centro de Custo': item.center, Categoria: item.category, Orçado: item.planned, Realizado: item.realized, Saldo: item.variance }))), 'Orcamento');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(report.margins.map(item => ({ 'Centro de Custo': item.center, Receita: item.revenue, Despesa: item.expense, Resultado: item.result, 'Margem %': Number(item.margin.toFixed(2)) }))), 'Margens');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(report.assets.map(item => ({ Ativo: item.name, Custo: item.cost, Residual: item.residual, 'Vida útil meses': item.life, 'Depreciação mensal': item.monthly, 'Depreciação acumulada': item.accumulated, 'Valor contábil': item.bookValue }))), 'Ativos');
    XLSX.writeFile(wb, `relatorio_financeiro_${year}.xlsx`, { compression: true });
  };

  const filteredAudit = audit.filter(item => `${item.actorName || ''} ${item.action || ''} ${item.summary || ''} ${item.entityType || ''}`.toLowerCase().includes(auditSearch.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <button onClick={() => setArea('relatorios')} className={`rounded-2xl border p-4 text-left ${area === 'relatorios' ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-700'}`}><div className="flex items-center gap-2 font-extrabold"><BarChart3 className="h-5 w-5" />Relatórios</div><p className="mt-1 text-[11px] opacity-70">DRE gerencial, caixa, orçamento, margem e ativos</p></button>
        <button onClick={() => setArea('cadastros')} className={`rounded-2xl border p-4 text-left ${area === 'cadastros' ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-700'}`}><div className="flex items-center gap-2 font-extrabold"><Building2 className="h-5 w-5" />Cadastros</div><p className="mt-1 text-[11px] opacity-70">Contas bancárias e plano de contas</p></button>
        <button onClick={() => setArea('auditoria')} className={`rounded-2xl border p-4 text-left ${area === 'auditoria' ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-700'}`}><div className="flex items-center gap-2 font-extrabold"><ShieldCheck className="h-5 w-5" />Auditoria</div><p className="mt-1 text-[11px] opacity-70">Quem fez cada ação financeira e quando</p></button>
      </div>

      {area === 'relatorios' && <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end sm:justify-between"><label><span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Ano do relatório</span><input type="number" min="2020" max="2100" value={year} onChange={e => setYear(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label><div className="flex gap-2"><button onClick={exportWorkbook} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"><Download className="h-4 w-4" />Excel</button><button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"><Printer className="h-4 w-4" />Imprimir / PDF</button></div></div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">{[
          ['Receita líquida', report.revenueNet, 'text-emerald-700'], ['Despesas', report.expenses, 'text-rose-700'], ['Resultado', report.result, report.result >= 0 ? 'text-blue-700' : 'text-rose-700'], ['Caixa realizado', report.cashNet, report.cashNet >= 0 ? 'text-emerald-700' : 'text-rose-700'], ['Saldo bancário', report.bankBalance, 'text-slate-800'],
        ].map(([label, value, tone]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div><div className={`mt-2 text-lg font-extrabold ${tone}`}>{money(Number(value))}</div></div>)}</div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-100 p-4"><h4 className="font-extrabold text-slate-900">DRE gerencial simplificada — {year}</h4><p className="text-xs text-slate-500">Visão administrativa pelos lançamentos de competência. Não substitui a escrituração contábil/fiscal.</p></div><div className="space-y-2 p-4 text-sm"><div className="flex justify-between"><span>Receita bruta</span><strong>{money(report.revenueGross)}</strong></div><div className="flex justify-between text-slate-500"><span>(-) Retenções / deduções</span><strong>- {money(report.retentions)}</strong></div><div className="flex justify-between border-t pt-2"><span>Receita líquida</span><strong>{money(report.revenueNet)}</strong></div><div className="flex justify-between text-rose-700"><span>(-) Despesas</span><strong>- {money(report.expenses)}</strong></div><div className="flex justify-between border-t pt-2 text-base font-extrabold"><span>Resultado</span><span className={report.result >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{money(report.result)}</span></div></div></div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-100 p-4"><h4 className="font-extrabold text-slate-900">Fluxo de caixa realizado — {year}</h4><p className="text-xs text-slate-500">Somente baixas efetivamente registradas.</p></div><div className="space-y-2 p-4 text-sm"><div className="flex justify-between text-emerald-700"><span>Entradas recebidas</span><strong>{money(report.cashIn)}</strong></div><div className="flex justify-between text-rose-700"><span>Saídas pagas</span><strong>{money(report.cashOut)}</strong></div><div className="flex justify-between border-t pt-2 text-base font-extrabold"><span>Fluxo líquido</span><span>{money(report.cashNet)}</span></div><div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Em aberto: <strong>{money(report.openReceivable)}</strong> a receber e <strong>{money(report.openPayable)}</strong> a pagar.</div></div></div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-100 p-4"><h4 className="font-extrabold text-slate-900">Orçamento previsto x realizado</h4></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">Centro</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3 text-right">Orçado</th><th className="px-4 py-3 text-right">Realizado</th><th className="px-4 py-3 text-right">Saldo</th></tr></thead><tbody className="divide-y divide-slate-100">{report.budgets.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Nenhum orçamento cadastrado para o período.</td></tr> : report.budgets.map(item => <tr key={item.id}><td className="px-4 py-3 font-bold">{item.center}</td><td className="px-4 py-3">{item.category}</td><td className="px-4 py-3 text-right">{money(item.planned)}</td><td className="px-4 py-3 text-right">{money(item.realized)}</td><td className={`px-4 py-3 text-right font-bold ${item.variance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{money(item.variance)}</td></tr>)}</tbody></table></div></div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-100 p-4"><h4 className="font-extrabold text-slate-900">Resultado por centro de custo / contrato</h4><p className="mt-1 text-xs text-slate-500">{report.rateiosApplied > 0 ? `${report.rateiosApplied} regra(s) de rateio ativa(s) aplicada(s) nesta visão.` : 'Sem regras de rateio ativas; os custos permanecem no centro de origem.'}</p></div><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">Centro</th><th className="px-4 py-3 text-right">Receita</th><th className="px-4 py-3 text-right">Despesa</th><th className="px-4 py-3 text-right">Resultado</th><th className="px-4 py-3 text-right">Margem</th></tr></thead><tbody className="divide-y divide-slate-100">{report.margins.map(item => <tr key={item.center}><td className="px-4 py-3 font-bold">{item.center}</td><td className="px-4 py-3 text-right">{money(item.revenue)}</td><td className="px-4 py-3 text-right">{money(item.expense)}</td><td className={`px-4 py-3 text-right font-bold ${item.result >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{money(item.result)}</td><td className="px-4 py-3 text-right">{item.margin.toFixed(1)}%</td></tr>)}</tbody></table></div></div>


        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="border-b border-slate-100 p-4"><h4 className="font-extrabold text-slate-900">Ativos e depreciação gerencial</h4><p className="mt-1 text-xs text-slate-500">Controle dos investimentos cadastrados, com cálculo linear estimado para acompanhamento interno.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">Ativo</th><th className="px-4 py-3 text-right">Custo</th><th className="px-4 py-3 text-right">Residual</th><th className="px-4 py-3 text-right">Vida útil</th><th className="px-4 py-3 text-right">Deprec. mensal</th><th className="px-4 py-3 text-right">Deprec. acumulada</th><th className="px-4 py-3 text-right">Valor contábil estimado</th></tr></thead><tbody className="divide-y divide-slate-100">{report.assets.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Nenhum ativo cadastrado.</td></tr> : report.assets.map(item => <tr key={item.id}><td className="px-4 py-3 font-bold text-slate-800">{item.name}</td><td className="px-4 py-3 text-right">{money(item.cost)}</td><td className="px-4 py-3 text-right">{money(item.residual)}</td><td className="px-4 py-3 text-right">{item.life} meses</td><td className="px-4 py-3 text-right">{money(item.monthly)}</td><td className="px-4 py-3 text-right">{money(item.accumulated)}</td><td className="px-4 py-3 text-right font-bold">{money(item.bookValue)}</td></tr>)}</tbody></table></div></div>
      </div>}

      {area === 'cadastros' && <CadastrosFinanceiros requestAdminDelete={requestAdminDelete} canEdit={canEdit} />}

      {area === 'auditoria' && <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h4 className="font-extrabold text-slate-900">Auditoria financeira</h4><p className="text-xs text-slate-500">Histórico autoritativo de importações, baixas, conciliações e rotinas.</p></div><div className="flex gap-2"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={auditSearch} onChange={e => setAuditSearch(e.target.value)} placeholder="Buscar..." className="rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm" /></div><button onClick={loadAudit} disabled={auditBusy} className="rounded-lg border border-slate-300 p-2 text-slate-600"><RefreshCw className={`h-4 w-4 ${auditBusy ? 'animate-spin' : ''}`} /></button></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Usuário</th><th className="px-4 py-3">Ação</th><th className="px-4 py-3">Resumo</th><th className="px-4 py-3">Registro</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredAudit.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Nenhum registro financeiro encontrado.</td></tr> : filteredAudit.map(item => <tr key={item.id}><td className="px-4 py-3 whitespace-nowrap">{item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : '—'}</td><td className="px-4 py-3 font-bold">{item.actorName || 'Sistema'}</td><td className="px-4 py-3 font-mono text-[10px]">{item.action}</td><td className="px-4 py-3">{item.summary || '—'}</td><td className="px-4 py-3 text-slate-500">{item.entityType} / {item.entityId}</td></tr>)}</tbody></table></div>
      </div>}
    </div>
  );
}
