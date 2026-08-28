import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownCircle, ArrowRight, ArrowUpCircle, Banknote, CalendarClock, CheckCircle2, ClipboardCheck, Landmark, Wallet } from 'lucide-react';
import { FinanceOperation, FinanceTransaction } from '../../types';
import { syncFinanceCollection, syncFinanceOperations, syncFinanceTransactions } from '../../lib/firebase';
import { financeFormatDatePt, financeTodayLocal } from './finance-date';

interface FinanceOverviewProps {
  canEdit?: boolean;
  onNavigate: (section: 'resumo' | 'movimentos' | 'gestao' | 'relatorios') => void;
}

const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const datePt = financeFormatDatePt;
const openOf = (item: FinanceTransaction) => Math.max(0, Number.isFinite(Number(item.openBalance)) ? Number(item.openBalance) : Number(item.amount || 0) - Number(item.paidAmount || 0));

export default function FinanceOverview({ canEdit = false, onNavigate }: FinanceOverviewProps) {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [operations, setOperations] = useState<FinanceOperation[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  useEffect(() => {
    const unsubTx = syncFinanceTransactions(setTransactions);
    const unsubOps = syncFinanceOperations(setOperations);
    const unsubBanks = syncFinanceCollection<any>('financeBankAccounts', setBankAccounts, 200);
    return () => { unsubTx(); unsubOps(); unsubBanks(); };
  }, []);

  const metrics = useMemo(() => {
    const today = financeTodayLocal();
    const [year, month, day] = today.split('-').map(Number);
    const baseDate = new Date(year, month - 1, day, 12);
    const in7 = new Date(baseDate); in7.setDate(in7.getDate() + 7);
    const in30 = new Date(baseDate); in30.setDate(in30.getDate() + 30);
    const localIso = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    const d7 = localIso(in7);
    const d30 = localIso(in30);

    const open = transactions.filter(item => item.status !== 'cancelado' && openOf(item) > 0.009);
    const receivable = open.filter(item => item.type === 'receita').reduce((sum, item) => sum + openOf(item), 0);
    const payable = open.filter(item => item.type === 'despesa').reduce((sum, item) => sum + openOf(item), 0);
    const overdue = open.filter(item => item.dueDate && item.dueDate < today);
    const dueSoon = open.filter(item => item.dueDate && item.dueDate >= today && item.dueDate <= d7);
    const due30 = open.filter(item => item.dueDate && item.dueDate >= today && item.dueDate <= d30);
    const bankBalance = bankAccounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
    const projected30 = bankBalance
      + due30.filter(item => item.type === 'receita').reduce((sum, item) => sum + openOf(item), 0)
      - due30.filter(item => item.type === 'despesa').reduce((sum, item) => sum + openOf(item), 0);
    const pendingApprovals = operations.filter(item => item.approvalStatus === 'pendente');
    const transactionById = new Map(transactions.map(item => [item.id, item]));
    const operationIsSettled = (operation: FinanceOperation) => {
      const linkedIds = Array.isArray(operation.financeTransactionIds) ? operation.financeTransactionIds.filter(Boolean) : [];
      if (linkedIds.length === 0) return false;
      const linked = linkedIds.map(id => transactionById.get(id)).filter((item): item is FinanceTransaction => !!item);
      return linked.length === linkedIds.length && linked.every(item => item.status !== 'cancelado' && openOf(item) <= 0.009);
    };
    const taxesDueSoon = operations.filter(item => item.kind === 'tributo' && !operationIsSettled(item) && item.dueDate && item.dueDate >= today && item.dueDate <= d7);
    return { today, receivable, payable, overdue, dueSoon, bankBalance, projected30, pendingApprovals, taxesDueSoon };
  }, [transactions, operations, bankAccounts]);

  const attention = useMemo(() => {
    const rows: Array<{ id: string; tone: 'red' | 'amber' | 'blue'; title: string; detail: string; target: 'movimentos' | 'gestao' }> = [];
    metrics.overdue.slice(0, 5).forEach(item => rows.push({
      id: `overdue-${item.id}`, tone: 'red', target: 'movimentos',
      title: `${item.type === 'receita' ? 'Recebimento' : 'Pagamento'} vencido: ${item.description}`,
      detail: `${money(openOf(item))} • vencimento ${datePt(item.dueDate)}`,
    }));
    metrics.pendingApprovals.slice(0, 4).forEach(item => rows.push({
      id: `approval-${item.id}`, tone: 'amber', target: 'gestao', title: `Aprovação pendente: ${item.title}`,
      detail: `${money(Number(item.amount || 0))} • ${item.contactName || item.details?.employee || 'Solicitação financeira'}`,
    }));
    metrics.taxesDueSoon.slice(0, 4).forEach(item => rows.push({
      id: `tax-${item.id}`, tone: 'amber', target: 'gestao', title: `Tributo próximo do vencimento: ${item.title}`,
      detail: `${money(Number(item.amount || 0))} • ${datePt(item.dueDate)}`,
    }));
    metrics.dueSoon.filter(item => !metrics.overdue.some(over => over.id === item.id)).slice(0, 5).forEach(item => rows.push({
      id: `due-${item.id}`, tone: 'blue', target: 'movimentos', title: `${item.type === 'receita' ? 'Receber' : 'Pagar'} nos próximos 7 dias: ${item.description}`,
      detail: `${money(openOf(item))} • ${datePt(item.dueDate)}`,
    }));
    return rows.slice(0, 10);
  }, [metrics]);

  const cards = [
    { label: 'Saldo bancário informado', value: metrics.bankBalance, icon: <Landmark className="h-5 w-5" />, note: 'Soma das contas cadastradas', tone: 'slate' },
    { label: 'A receber em aberto', value: metrics.receivable, icon: <ArrowUpCircle className="h-5 w-5" />, note: 'Clientes ainda não baixados', tone: 'emerald' },
    { label: 'A pagar em aberto', value: metrics.payable, icon: <ArrowDownCircle className="h-5 w-5" />, note: 'Fornecedores e obrigações', tone: 'rose' },
    { label: 'Projeção de caixa 30 dias', value: metrics.projected30, icon: <Wallet className="h-5 w-5" />, note: 'Saldo + entradas - saídas previstas', tone: metrics.projected30 >= 0 ? 'blue' : 'rose' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{card.label}</span>
              <span className={`rounded-lg p-2 ${card.tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : card.tone === 'rose' ? 'bg-rose-50 text-rose-700' : card.tone === 'blue' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{card.icon}</span>
            </div>
            <div className="mt-3 text-2xl font-extrabold text-slate-900">{money(card.value)}</div>
            <p className="mt-1 text-[11px] text-slate-500">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div>
              <h3 className="font-extrabold text-slate-900">O que precisa de atenção</h3>
              <p className="text-xs text-slate-500">O sistema prioriza vencidos, aprovações e compromissos próximos.</p>
            </div>
            <CalendarClock className="h-5 w-5 text-slate-400" />
          </div>
          <div className="divide-y divide-slate-100">
            {attention.length === 0 ? (
              <div className="flex items-center gap-3 p-6 text-sm text-emerald-700">
                <CheckCircle2 className="h-5 w-5" /><span>Nenhuma pendência crítica identificada agora.</span>
              </div>
            ) : attention.map(item => (
              <button key={item.id} type="button" onClick={() => onNavigate(item.target)} className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-50">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`mt-0.5 rounded-lg p-2 ${item.tone === 'red' ? 'bg-rose-50 text-rose-700' : item.tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                    {item.tone === 'red' ? <AlertTriangle className="h-4 w-4" /> : item.tone === 'amber' ? <ClipboardCheck className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.detail}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-extrabold text-slate-900">O que você quer fazer?</h3>
          <p className="mt-1 text-xs text-slate-500">Atalhos com nomes simples para as rotinas mais usadas.</p>
          <div className="mt-4 space-y-2">
            <button onClick={() => onNavigate('movimentos')} className="flex w-full items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-left text-emerald-900 hover:bg-emerald-100">
              <ArrowUpCircle className="h-5 w-5" /><div><div className="text-sm font-bold">Registrar algo que vou receber</div><div className="text-[11px] opacity-75">Clientes, faturamentos e outros recebimentos</div></div>
            </button>
            <button onClick={() => onNavigate('movimentos')} className="flex w-full items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-left text-rose-900 hover:bg-rose-100">
              <ArrowDownCircle className="h-5 w-5" /><div><div className="text-sm font-bold">Registrar algo que vou pagar</div><div className="text-[11px] opacity-75">Fornecedores, despesas e obrigações</div></div>
            </button>
            <button onClick={() => onNavigate('gestao')} className="flex w-full items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-left text-blue-900 hover:bg-blue-100">
              <Banknote className="h-5 w-5" /><div><div className="text-sm font-bold">Controlar outras rotinas</div><div className="text-[11px] opacity-75">Contratos, extratos, cartões, tributos e orçamento</div></div>
            </button>
            <button onClick={() => onNavigate('relatorios')} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-slate-800 hover:bg-slate-100">
              <Wallet className="h-5 w-5" /><div><div className="text-sm font-bold">Ver relatórios e configurações</div><div className="text-[11px] opacity-75">DRE, fluxo, cadastros e auditoria</div></div>
            </button>
          </div>
          {!canEdit && <p className="mt-4 rounded-lg bg-amber-50 p-2 text-[11px] font-medium text-amber-800">Seu perfil está em modo de visualização. Você pode consultar e exportar, mas não alterar dados.</p>}
        </div>
      </div>
    </div>
  );
}
