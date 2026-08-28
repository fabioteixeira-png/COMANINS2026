import React, { useEffect, useMemo, useState } from 'react';
import { Archive, Check, Edit3, Plus, Search, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { FinanceOperation, FinanceOperationKind, FinanceTransaction } from '../../types';
import { archiveFinanceOperation, createFinanceOperation, decideFinanceOperation, syncFinanceOperations, syncFinanceTransactions, updateFinanceOperationRecord } from '../../lib/firebase';
import FinanceOperationSpreadsheetActions from './FinanceOperationSpreadsheetActions';
import { financeFormatDatePt, financeMonthLocal, financeTodayLocal, financeYearLocal } from './finance-date';

interface Props {
  kinds: FinanceOperationKind[];
  defaultKind: FinanceOperationKind;
  canEdit?: boolean;
}

const LABELS: Record<FinanceOperationKind, string> = {
  orcamento: 'Orçamento',
  emprestimo: 'Empréstimos',
  cartao: 'Cartões',
  despesa_cartao: 'Despesas de cartão',
  reembolso: 'Reembolsos e adiantamentos',
  custo_pessoal: 'Custos de pessoal',
  rateio: 'Rateio de custos',
  ativo: 'Ativos e investimentos',
  tributo: 'Tributos e retenções',
};

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const datePt = financeFormatDatePt;
const openOf = (item: FinanceTransaction) => Math.max(0, Number.isFinite(Number(item.openBalance)) ? Number(item.openBalance) : Number(item.amount || 0) - Number(item.paidAmount || 0));

const today = financeTodayLocal;
const month = financeMonthLocal;

const defaultForm = (kind: FinanceOperationKind): Record<string, any> => {
  const base = { title: '', description: '', amount: '', date: today(), dueDate: today(), costCenter: 'Administrativo', category: '' };
  if (kind === 'orcamento') { const businessYear = financeYearLocal(); return { ...base, amount: '', startDate: `${businessYear}-01-01`, endDate: `${businessYear}-12-31`, category: 'Geral' }; }
  if (kind === 'emprestimo') return { ...base, creditor: '', loanType: 'Capital de Giro', interestRate: '1.20', installments: '12', dueDay: '10' };
  if (kind === 'cartao') return { ...base, holder: '', role: '', last4: '', limit: '', closingDay: '2', dueDay: '10' };
  if (kind === 'despesa_cartao') return { ...base, cardId: '', cardLast4: '', establishment: '', receiptAttached: false, category: 'Despesas de Cartão' };
  if (kind === 'reembolso') return { ...base, employee: '', reimbursementType: 'reembolso', purpose: '', category: 'Reembolsos' };
  if (kind === 'custo_pessoal') return { ...base, employee: 'Equipe', competence: month(), baseSalary: '', charges: '', benefits: '', category: 'Custos de Pessoal' };
  if (kind === 'rateio') return { ...base, ruleName: '', sourceCostCenter: 'Administrativo', target1: '', percent1: '', target2: '', percent2: '', target3: '', percent3: '', target4: '', percent4: '', target5: '', percent5: '' };
  if (kind === 'ativo') return { ...base, assetName: '', salvageValue: '0', lifeMonths: '60', supplier: '', createExpense: false, category: 'Ativos e Investimentos' };
  return { ...base, taxType: '', competence: month(), category: 'Tributos e Retenções', documentNumber: '' };
};

const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <label className="block">
    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-[10px] text-slate-400">{hint}</span>}
  </label>
);

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

export default function FinanceOperationRegistry({ kinds, defaultKind, canEdit = false }: Props) {
  const [operations, setOperations] = useState<FinanceOperation[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [kind, setKind] = useState<FinanceOperationKind>(defaultKind);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<Record<string, any>>(() => defaultForm(defaultKind));
  const [editing, setEditing] = useState<FinanceOperation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsubOps = syncFinanceOperations(setOperations);
    const unsubTx = syncFinanceTransactions(setTransactions);
    return () => { unsubOps(); unsubTx(); };
  }, []);

  useEffect(() => {
    if (!kinds.includes(kind)) setKind(defaultKind);
  }, [kinds, kind, defaultKind]);

  const cards = useMemo(() => operations.filter(item => item.kind === kind && `${item.title} ${item.description || ''} ${item.costCenter || ''} ${item.contactName || ''}`.toLowerCase().includes(query.toLowerCase())), [operations, kind, query]);
  const cardsOnly = operations.filter(item => item.kind === 'cartao' && item.status !== 'inativo');

  const linkedTransactions = (operation: FinanceOperation) => transactions.filter(tx => Array.isArray(operation.financeTransactionIds) && operation.financeTransactionIds.includes(tx.id));
  const displayStatus = (operation: FinanceOperation) => {
    const linked = linkedTransactions(operation);
    if (linked.length > 0 && linked.every(tx => openOf(tx) <= 0.009)) return 'Pago / concluído';
    if (operation.approvalStatus === 'pendente') return 'Aguardando aprovação';
    if (operation.approvalStatus === 'rejeitado') return 'Rejeitado';
    if (operation.kind === 'emprestimo' && linked.length > 0) return `${linked.filter(tx => openOf(tx) > 0.009).length} parcela(s) em aberto`;
    return operation.status || 'Ativo';
  };

  const detailText = (operation: FinanceOperation) => {
    const d = operation.details || {};
    if (operation.kind === 'orcamento') {
      const realized = transactions.filter(tx => tx.type === 'despesa' && tx.status !== 'cancelado' && (!operation.costCenter || tx.costCenter === operation.costCenter) && (!operation.category || tx.category === operation.category) && tx.date >= (operation.date || '') && tx.date <= (operation.dueDate || '9999-12-31')).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      return `Realizado: ${money(realized)} • Saldo do orçamento: ${money(Math.max(0, Number(operation.amount || 0) - realized))}`;
    }
    if (operation.kind === 'emprestimo') return `${d.creditor || ''} • ${d.interestRate || 0}% a.m. • ${d.installments || 0} parcelas`;
    if (operation.kind === 'cartao') {
      const spent = operations.filter(item => item.kind === 'despesa_cartao' && (item.details?.cardId === operation.id || item.details?.cardLast4 === d.last4)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
      return `•••• ${d.last4 || ''} • Limite usado: ${money(spent)} de ${money(Number(operation.amount || 0))}`;
    }
    if (operation.kind === 'despesa_cartao') return `Cartão •••• ${d.cardLast4 || ''} • ${d.establishment || ''} • fatura ${datePt(operation.dueDate)}`;
    if (operation.kind === 'reembolso') return `${d.employee || ''} • ${d.reimbursementType || 'reembolso'} • ${d.purpose || ''}`;
    if (operation.kind === 'custo_pessoal') return `${d.employee || 'Equipe'} • competência ${d.competence || ''} • base ${money(Number(d.baseSalary || 0))}`;
    if (operation.kind === 'rateio') return `${d.sourceCostCenter || operation.costCenter || ''} → ${(d.targets || []).map((target: any) => `${target.costCenter} ${target.percent}%`).join(' • ')}`;
    if (operation.kind === 'ativo') {
      const businessToday = today();
      const monthsElapsed = operation.date ? Math.max(0, (Number(businessToday.slice(0, 4)) - Number(operation.date.slice(0, 4))) * 12 + (Number(businessToday.slice(5, 7)) - Number(operation.date.slice(5, 7)))) : 0;
      const depreciable = Math.max(0, Number(operation.amount || 0) - Number(d.salvageValue || 0));
      const accumulated = Math.min(depreciable, (depreciable / Math.max(1, Number(d.lifeMonths || 1))) * monthsElapsed);
      return `${d.supplier || 'Sem fornecedor'} • Valor contábil estimado: ${money(Math.max(Number(d.salvageValue || 0), Number(operation.amount || 0) - accumulated))}`;
    }
    return `${d.taxType || operation.title} • competência ${d.competence || ''} • vencimento ${datePt(operation.dueDate)}`;
  };

  const openNew = () => {
    setEditing(null);
    setForm(defaultForm(kind));
    setShowModal(true);
  };

  const openEdit = (operation: FinanceOperation) => {
    if ((operation.financeTransactionIds || []).length > 0) return;
    const d = operation.details || {};
    const next = defaultForm(operation.kind);
    Object.assign(next, {
      title: operation.title || '', description: operation.description || '', amount: operation.amount || '', date: operation.date || today(), dueDate: operation.dueDate || today(),
      costCenter: operation.costCenter || 'Administrativo', category: operation.category || '',
      startDate: operation.date, endDate: operation.dueDate,
      creditor: d.creditor, loanType: d.loanType, interestRate: d.interestRate, installments: d.installments, dueDay: d.dueDay,
      holder: d.holder, role: d.role, last4: d.last4, limit: operation.amount, closingDay: d.closingDay,
      cardId: d.cardId, cardLast4: d.cardLast4, establishment: d.establishment, receiptAttached: d.receiptAttached,
      employee: d.employee, reimbursementType: d.reimbursementType, purpose: d.purpose, competence: d.competence, baseSalary: d.baseSalary, charges: d.charges, benefits: d.benefits,
      ruleName: operation.title, sourceCostCenter: d.sourceCostCenter,
      assetName: d.assetName, salvageValue: d.salvageValue, lifeMonths: d.lifeMonths, supplier: d.supplier, createExpense: d.createExpense,
      taxType: d.taxType, documentNumber: operation.documentNumber,
    });
    (d.targets || []).slice(0, 5).forEach((target: any, index: number) => { next[`target${index + 1}`] = target.costCenter; next[`percent${index + 1}`] = target.percent; });
    setKind(operation.kind); setEditing(operation); setForm(next); setShowModal(true);
  };

  const buildPayload = (): any => {
    const common = { kind, title: form.title, description: form.description, amount: Number(form.amount || 0), date: form.date, dueDate: form.dueDate, costCenter: form.costCenter, category: form.category, documentNumber: form.documentNumber };
    if (kind === 'orcamento') return { ...common, amount: Number(form.amount || 0), date: form.startDate, dueDate: form.endDate, details: { startDate: form.startDate, endDate: form.endDate } };
    if (kind === 'emprestimo') return { ...common, contactName: form.creditor, details: { creditor: form.creditor, loanType: form.loanType, interestRate: Number(form.interestRate || 0), installments: Number(form.installments || 0), dueDay: Number(form.dueDay || 0) } };
    if (kind === 'cartao') return { ...common, amount: Number(form.limit || 0), details: { holder: form.holder, role: form.role, last4: String(form.last4 || '').replace(/\D/g, '').slice(-4), closingDay: Number(form.closingDay || 0), dueDay: Number(form.dueDay || 0) } };
    if (kind === 'despesa_cartao') return { ...common, contactName: form.establishment, details: { cardId: form.cardId, cardLast4: form.cardLast4, establishment: form.establishment, receiptAttached: !!form.receiptAttached } };
    if (kind === 'reembolso') return { ...common, contactName: form.employee, details: { employee: form.employee, reimbursementType: form.reimbursementType, purpose: form.purpose } };
    if (kind === 'custo_pessoal') {
      const total = Number(form.amount || 0) || Number(form.baseSalary || 0) + Number(form.charges || 0) + Number(form.benefits || 0);
      return { ...common, amount: total, contactName: form.employee, details: { employee: form.employee, competence: form.competence, baseSalary: Number(form.baseSalary || 0), charges: Number(form.charges || 0), benefits: Number(form.benefits || 0) } };
    }
    if (kind === 'rateio') {
      const targets = Array.from({ length: 5 }, (_, index) => ({ costCenter: String(form[`target${index + 1}`] || '').trim(), percent: Number(form[`percent${index + 1}`] || 0) })).filter(item => item.costCenter && item.percent > 0);
      return { ...common, title: form.ruleName, costCenter: form.sourceCostCenter, details: { sourceCostCenter: form.sourceCostCenter, targets } };
    }
    if (kind === 'ativo') return { ...common, title: form.assetName, contactName: form.supplier, details: { assetName: form.assetName, salvageValue: Number(form.salvageValue || 0), lifeMonths: Number(form.lifeMonths || 0), supplier: form.supplier, createExpense: !!form.createExpense } };
    return { ...common, title: form.taxType, details: { taxType: form.taxType, competence: form.competence } };
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;
    setBusy(true);
    try {
      const payload = buildPayload();
      if (editing) await updateFinanceOperationRecord(editing.id, payload);
      else await createFinanceOperation(payload);
      setShowModal(false); setEditing(null);
    } catch (error: any) {
      alert(error?.message || 'Não foi possível salvar.');
    } finally { setBusy(false); }
  };

  const decide = async (operation: FinanceOperation, decision: 'aprovar' | 'rejeitar') => {
    if (!canEdit) return;
    if (!confirm(`${decision === 'aprovar' ? 'Aprovar' : 'Rejeitar'} ${operation.title}?`)) return;
    try { await decideFinanceOperation(operation.id, decision); } catch (error: any) { alert(error?.message || 'Não foi possível concluir a aprovação.'); }
  };

  const archive = async (operation: FinanceOperation) => {
    if (!canEdit || (operation.financeTransactionIds || []).length > 0) return;
    if (!confirm(`Arquivar "${operation.title}"? O histórico será preservado.`)) return;
    try { await archiveFinanceOperation(operation.id); } catch (error: any) { alert(error?.message || 'Não foi possível arquivar.'); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {kinds.map(item => <button key={item} onClick={() => { setKind(item); setQuery(''); }} className={`rounded-lg px-3 py-2 text-xs font-bold ${kind === item ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{LABELS[item]}</button>)}
          </div>
          <div className="flex flex-wrap gap-2">
            <FinanceOperationSpreadsheetActions kind={kind} rows={operations.filter(item => item.kind === kind)} canEdit={canEdit} />
            <button disabled={!canEdit} onClick={openNew} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"><Plus className="h-3.5 w-3.5" />Novo</button>
          </div>
        </div>
        <div className="relative mt-3 max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Buscar em ${LABELS[kind].toLowerCase()}...`} className={`${inputClass} pl-9`} /></div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Registro</th><th className="px-4 py-3">Valor / período</th><th className="px-4 py-3">Detalhes</th><th className="px-4 py-3">Situação</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {cards.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">Nenhum registro cadastrado nesta rotina.</td></tr> : cards.map(operation => {
                const locked = (operation.financeTransactionIds || []).length > 0;
                return <tr key={operation.id} className="align-top hover:bg-slate-50/50"><td className="px-4 py-4"><div className="font-bold text-slate-800">{operation.title}</div><div className="mt-1 text-xs text-slate-500">{operation.costCenter || 'Sem centro de custo'}</div></td><td className="px-4 py-4"><div className="font-mono font-bold text-slate-800">{operation.kind === 'rateio' ? 'Regra' : money(Number(operation.amount || 0))}</div><div className="mt-1 text-xs text-slate-500">{datePt(operation.date)}{operation.dueDate ? ` → ${datePt(operation.dueDate)}` : ''}</div></td><td className="max-w-xl px-4 py-4 text-xs leading-5 text-slate-600">{detailText(operation)}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${operation.approvalStatus === 'pendente' ? 'bg-amber-100 text-amber-800' : operation.approvalStatus === 'rejeitado' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-50 text-emerald-700'}`}>{displayStatus(operation)}</span></td><td className="px-4 py-4"><div className="flex justify-end gap-1">{operation.kind === 'reembolso' && operation.approvalStatus === 'pendente' && canEdit && <><button onClick={() => decide(operation, 'aprovar')} title="Aprovar" className="rounded-lg bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"><ThumbsUp className="h-4 w-4" /></button><button onClick={() => decide(operation, 'rejeitar')} title="Rejeitar" className="rounded-lg bg-rose-50 p-2 text-rose-700 hover:bg-rose-100"><ThumbsDown className="h-4 w-4" /></button></>}{canEdit && !locked && <button onClick={() => openEdit(operation)} title="Editar" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Edit3 className="h-4 w-4" /></button>}{canEdit && !locked && <button onClick={() => archive(operation)} title="Arquivar" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Archive className="h-4 w-4" /></button>}{locked && <span title="Registro vinculado a lançamento financeiro; dados financeiros preservados." className="rounded-lg bg-slate-100 p-2 text-slate-400"><Check className="h-4 w-4" /></span>}</div></td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
          <form onSubmit={save} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-5"><div><h3 className="font-extrabold text-slate-900">{editing ? 'Editar' : 'Novo'} — {LABELS[kind]}</h3><p className="text-xs text-slate-500">Preencha somente os dados da rotina. Os lançamentos relacionados são gerados automaticamente quando aplicável.</p></div><button type="button" onClick={() => setShowModal(false)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
              {kind === 'orcamento' && <><Field label="Centro de custo"><input className={inputClass} value={form.costCenter} onChange={e => setForm({ ...form, costCenter: e.target.value })} required /></Field><Field label="Categoria"><input className={inputClass} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required /></Field><Field label="Valor orçado"><input className={inputClass} type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required /></Field><div /><Field label="Início"><input className={inputClass} type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required /></Field><Field label="Fim"><input className={inputClass} type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required /></Field></>}
              {kind === 'emprestimo' && <><Field label="Credor"><input className={inputClass} value={form.creditor} onChange={e => setForm({ ...form, creditor: e.target.value })} required /></Field><Field label="Tipo"><input className={inputClass} value={form.loanType} onChange={e => setForm({ ...form, loanType: e.target.value })} /></Field><Field label="Valor principal"><input className={inputClass} type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required /></Field><Field label="Juros ao mês (%)"><input className={inputClass} type="number" min="0" step="0.0001" value={form.interestRate} onChange={e => setForm({ ...form, interestRate: e.target.value })} required /></Field><Field label="Parcelas"><input className={inputClass} type="number" min="1" max="120" value={form.installments} onChange={e => setForm({ ...form, installments: e.target.value })} required /></Field><Field label="Data da contratação"><input className={inputClass} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></Field><Field label="Dia do vencimento"><input className={inputClass} type="number" min="1" max="31" value={form.dueDay} onChange={e => setForm({ ...form, dueDay: e.target.value })} required /></Field><Field label="Centro de custo"><input className={inputClass} value={form.costCenter} onChange={e => setForm({ ...form, costCenter: e.target.value })} /></Field></>}
              {kind === 'cartao' && <><Field label="Portador"><input className={inputClass} value={form.holder} onChange={e => setForm({ ...form, holder: e.target.value })} required /></Field><Field label="Cargo"><input className={inputClass} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} /></Field><Field label="Últimos 4 dígitos" hint="Nunca cadastre o número completo"><input className={inputClass} maxLength={4} value={form.last4} onChange={e => setForm({ ...form, last4: e.target.value.replace(/\D/g, '').slice(0, 4) })} required /></Field><Field label="Limite"><input className={inputClass} type="number" min="0.01" step="0.01" value={form.limit} onChange={e => setForm({ ...form, limit: e.target.value })} required /></Field><Field label="Dia fechamento"><input className={inputClass} type="number" min="1" max="31" value={form.closingDay} onChange={e => setForm({ ...form, closingDay: e.target.value })} /></Field><Field label="Dia vencimento"><input className={inputClass} type="number" min="1" max="31" value={form.dueDay} onChange={e => setForm({ ...form, dueDay: e.target.value })} /></Field></>}
              {kind === 'despesa_cartao' && <><Field label="Cartão"><select className={inputClass} value={form.cardId} onChange={e => { const card = cardsOnly.find(item => item.id === e.target.value); setForm({ ...form, cardId: e.target.value, cardLast4: card?.details?.last4 || '' }); }} required><option value="">Selecione...</option>{cardsOnly.map(card => <option key={card.id} value={card.id}>{card.title}</option>)}</select></Field><Field label="Estabelecimento"><input className={inputClass} value={form.establishment} onChange={e => setForm({ ...form, establishment: e.target.value })} required /></Field><Field label="Valor"><input className={inputClass} type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required /></Field><Field label="Data da compra"><input className={inputClass} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></Field><Field label="Vencimento da fatura"><input className={inputClass} type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} required /></Field><Field label="Centro de custo"><input className={inputClass} value={form.costCenter} onChange={e => setForm({ ...form, costCenter: e.target.value })} /></Field><Field label="Categoria"><input className={inputClass} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></Field><label className="flex items-center gap-2 self-end rounded-lg border border-slate-200 p-3 text-sm"><input type="checkbox" checked={!!form.receiptAttached} onChange={e => setForm({ ...form, receiptAttached: e.target.checked })} /> Comprovante já recebido</label></>}
              {kind === 'reembolso' && <><Field label="Colaborador"><input className={inputClass} value={form.employee} onChange={e => setForm({ ...form, employee: e.target.value })} required /></Field><Field label="Tipo"><select className={inputClass} value={form.reimbursementType} onChange={e => setForm({ ...form, reimbursementType: e.target.value })}><option value="reembolso">Reembolso</option><option value="adiantamento">Adiantamento</option></select></Field><Field label="Finalidade"><input className={inputClass} value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} required /></Field><Field label="Valor"><input className={inputClass} type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required /></Field><Field label="Data solicitação"><input className={inputClass} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></Field><Field label="Data prevista para pagamento"><input className={inputClass} type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} required /></Field><Field label="Centro de custo"><input className={inputClass} value={form.costCenter} onChange={e => setForm({ ...form, costCenter: e.target.value })} /></Field></>}
              {kind === 'custo_pessoal' && <><Field label="Colaborador ou grupo"><input className={inputClass} value={form.employee} onChange={e => setForm({ ...form, employee: e.target.value })} /></Field><Field label="Competência"><input className={inputClass} type="month" value={form.competence} onChange={e => setForm({ ...form, competence: e.target.value })} required /></Field><Field label="Salário / base"><input className={inputClass} type="number" step="0.01" value={form.baseSalary} onChange={e => setForm({ ...form, baseSalary: e.target.value })} /></Field><Field label="Encargos"><input className={inputClass} type="number" step="0.01" value={form.charges} onChange={e => setForm({ ...form, charges: e.target.value })} /></Field><Field label="Benefícios"><input className={inputClass} type="number" step="0.01" value={form.benefits} onChange={e => setForm({ ...form, benefits: e.target.value })} /></Field><Field label="Valor total (opcional)"><input className={inputClass} type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></Field><Field label="Vencimento"><input className={inputClass} type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} required /></Field><Field label="Centro de custo"><input className={inputClass} value={form.costCenter} onChange={e => setForm({ ...form, costCenter: e.target.value })} /></Field></>}
              {kind === 'rateio' && <><Field label="Nome da regra"><input className={inputClass} value={form.ruleName} onChange={e => setForm({ ...form, ruleName: e.target.value })} required /></Field><Field label="Centro de custo de origem"><input className={inputClass} value={form.sourceCostCenter} onChange={e => setForm({ ...form, sourceCostCenter: e.target.value })} required /></Field>{Array.from({ length: 5 }, (_, i) => <React.Fragment key={i}><Field label={`Destino ${i + 1}`}><input className={inputClass} value={form[`target${i + 1}`]} onChange={e => setForm({ ...form, [`target${i + 1}`]: e.target.value })} /></Field><Field label={`Percentual ${i + 1}`}><input className={inputClass} type="number" min="0" max="100" step="0.01" value={form[`percent${i + 1}`]} onChange={e => setForm({ ...form, [`percent${i + 1}`]: e.target.value })} /></Field></React.Fragment>)}</>}
              {kind === 'ativo' && <><Field label="Ativo / investimento"><input className={inputClass} value={form.assetName} onChange={e => setForm({ ...form, assetName: e.target.value })} required /></Field><Field label="Fornecedor"><input className={inputClass} value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></Field><Field label="Valor aquisição"><input className={inputClass} type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required /></Field><Field label="Data aquisição"><input className={inputClass} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></Field><Field label="Valor residual"><input className={inputClass} type="number" min="0" step="0.01" value={form.salvageValue} onChange={e => setForm({ ...form, salvageValue: e.target.value })} /></Field><Field label="Vida útil (meses)"><input className={inputClass} type="number" min="1" max="600" value={form.lifeMonths} onChange={e => setForm({ ...form, lifeMonths: e.target.value })} required /></Field><Field label="Centro de custo"><input className={inputClass} value={form.costCenter} onChange={e => setForm({ ...form, costCenter: e.target.value })} /></Field><label className="flex items-center gap-2 self-end rounded-lg border border-slate-200 p-3 text-sm"><input type="checkbox" checked={!!form.createExpense} onChange={e => setForm({ ...form, createExpense: e.target.checked })} /> Gerar conta a pagar</label>{form.createExpense && <Field label="Vencimento"><input className={inputClass} type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} required /></Field>}</>}
              {kind === 'tributo' && <><Field label="Tributo"><input className={inputClass} value={form.taxType} onChange={e => setForm({ ...form, taxType: e.target.value })} required /></Field><Field label="Competência"><input className={inputClass} type="month" value={form.competence} onChange={e => setForm({ ...form, competence: e.target.value })} /></Field><Field label="Valor"><input className={inputClass} type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required /></Field><Field label="Data competência"><input className={inputClass} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></Field><Field label="Vencimento"><input className={inputClass} type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} required /></Field><Field label="Documento"><input className={inputClass} value={form.documentNumber} onChange={e => setForm({ ...form, documentNumber: e.target.value })} /></Field><Field label="Centro de custo"><input className={inputClass} value={form.costCenter} onChange={e => setForm({ ...form, costCenter: e.target.value })} /></Field></>}
              <div className="md:col-span-2"><Field label="Observações"><textarea className={`${inputClass} min-h-[80px]`} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></Field></div>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white p-4"><button type="button" onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Cancelar</button><button disabled={busy} type="submit" className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Salvando...' : 'Salvar'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
