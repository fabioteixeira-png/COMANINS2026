import React from 'react';
import { CheckCircle2, Clock3, X } from 'lucide-react';
import { FinanceTransaction } from '../../types';
import FinanceAttachmentField from './FinanceAttachmentField';
import { financeFormatDatePt } from './finance-date';

interface Props {
  transaction: FinanceTransaction;
  title: string;
  onClose: () => void;
}

const money = (value: number) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function FinanceTransactionDetailsModal({ transaction, title, onClose }: Props) {
  const openBalance = Math.max(0, Number.isFinite(Number(transaction.openBalance)) ? Number(transaction.openBalance) : Number(transaction.amount || 0) - Number(transaction.paidAmount || 0));
  const settlements = Array.isArray(transaction.settlements) ? transaction.settlements : [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-5">
          <div><h4 className="text-lg font-extrabold text-slate-900">{title}</h4><p className="text-xs text-slate-500">Consulta do lançamento, documentos e histórico de baixas.</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] font-bold uppercase text-slate-400">Pessoa / Empresa</div><div className="mt-1 text-sm font-bold text-slate-800">{transaction.contactName || '—'}</div><div className="text-xs text-slate-500">{transaction.contactDocument || 'Sem documento informado'}</div></div>
            <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] font-bold uppercase text-slate-400">Descrição</div><div className="mt-1 text-sm font-bold text-slate-800">{transaction.description || '—'}</div><div className="text-xs text-slate-500">{transaction.documentNumber ? `Documento: ${transaction.documentNumber}` : 'Sem nº de documento'}</div></div>
            <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] font-bold uppercase text-slate-400">Centro / Categoria</div><div className="mt-1 text-sm font-bold text-slate-800">{transaction.costCenter || '—'}</div><div className="text-xs text-slate-500">{transaction.category || '—'}</div></div>
            <div className="rounded-xl bg-blue-50 p-3"><div className="text-[10px] font-bold uppercase text-blue-500">Valor original</div><div className="mt-1 text-lg font-extrabold text-blue-900">{money(transaction.amount)}</div>{transaction.grossAmount && transaction.grossAmount !== transaction.amount ? <div className="text-xs text-blue-700">Bruto: {money(transaction.grossAmount)} • retenções: {money(Number(transaction.retentions || 0))}</div> : null}</div>
            <div className="rounded-xl bg-amber-50 p-3"><div className="text-[10px] font-bold uppercase text-amber-600">Saldo em aberto</div><div className="mt-1 text-lg font-extrabold text-amber-900">{money(openBalance)}</div><div className="text-xs text-amber-700">Baixado: {money(Number(transaction.paidAmount || 0))}</div></div>
            <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] font-bold uppercase text-slate-400">Datas</div><div className="mt-1 text-sm font-bold text-slate-800">Lançamento: {financeFormatDatePt(transaction.date)}</div><div className="text-xs text-slate-500">Vencimento: {financeFormatDatePt(transaction.dueDate)}</div></div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-3"><div className="text-[10px] font-bold uppercase text-slate-400">Pagamento / Recebimento</div><div className="mt-1 text-sm font-semibold text-slate-700">{transaction.paymentMethod || 'Não informado'}</div><div className="text-xs text-slate-500">Conta: {transaction.bankAccount || 'Não informada'}</div></div>
            <div className="rounded-xl border border-slate-200 p-3"><div className="text-[10px] font-bold uppercase text-slate-400">Contrato / Observações</div><div className="mt-1 text-sm font-semibold text-slate-700">{transaction.contractNumber || 'Sem contrato vinculado'}</div><div className="text-xs text-slate-500 whitespace-pre-wrap">{transaction.notes || 'Sem observações'}</div></div>
          </div>

          <FinanceAttachmentField label="Documentos anexados" attachments={transaction.attachments} pendingFiles={[]} onPendingFilesChange={() => undefined} canEdit={false} />

          <div className="rounded-xl border border-slate-200">
            <div className="border-b border-slate-100 p-3"><div className="text-sm font-extrabold text-slate-800">Histórico de baixas</div><div className="text-[11px] text-slate-500">Pagamentos ou recebimentos já registrados para este lançamento.</div></div>
            {settlements.length === 0 ? <div className="flex items-center gap-2 p-4 text-xs text-slate-500"><Clock3 className="h-4 w-4" />Nenhuma baixa registrada.</div> : <div className="divide-y divide-slate-100">{settlements.map((settlement, index) => <div key={settlement.id || index} className="flex flex-col justify-between gap-2 p-3 sm:flex-row sm:items-center"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><div><div className="text-xs font-bold text-slate-800">{money(Number(settlement.amount || 0))} em {financeFormatDatePt(settlement.date)}</div><div className="text-[10px] text-slate-500">{settlement.paymentMethod || 'Método não informado'} • {settlement.bankAccount || 'Conta não informada'} • por {settlement.createdBy || 'Usuário autenticado'}</div></div></div>{settlement.notes && <div className="max-w-sm text-[10px] text-slate-500">{settlement.notes}</div>}</div>)}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
