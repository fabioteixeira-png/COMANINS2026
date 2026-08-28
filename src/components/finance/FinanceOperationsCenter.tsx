import React, { useState } from 'react';
import { Boxes, Building2, Landmark, ReceiptText } from 'lucide-react';
import FinanceContratos from './FinanceContratos';
import FinanceMedicoes from './FinanceMedicoes';
import FinanceBankReconciliation from './FinanceBankReconciliation';
import FinanceOperationRegistry from './FinanceOperationRegistry';

interface Props {
  requestAdminDelete?: (type: string, id: string, name: string) => void;
  canEdit?: boolean;
  currentUserName?: string;
}

type Area = 'contratos' | 'bancos' | 'planejamento' | 'patrimonio';

const areas: Array<{ id: Area; label: string; description: string; icon: React.ReactNode }> = [
  { id: 'contratos', label: 'Contratos e Faturamento', description: 'Contratos, centros de custo, medições e NF', icon: <ReceiptText className="h-5 w-5" /> },
  { id: 'bancos', label: 'Bancos e Conciliação', description: 'Extratos, conferência e baixas bancárias', icon: <Landmark className="h-5 w-5" /> },
  { id: 'planejamento', label: 'Planejamento e Compromissos', description: 'Orçamento, empréstimos, cartões, reembolsos, pessoal e tributos', icon: <Building2 className="h-5 w-5" /> },
  { id: 'patrimonio', label: 'Patrimônio e Rateios', description: 'Ativos, depreciação e distribuição de custos', icon: <Boxes className="h-5 w-5" /> },
];

export default function FinanceOperationsCenter({ requestAdminDelete, canEdit = false }: Props) {
  const [area, setArea] = useState<Area>('contratos');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {areas.map(item => (
          <button key={item.id} onClick={() => setArea(item.id)} className={`rounded-2xl border p-4 text-left transition ${area === item.id ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
            <div className="flex items-center gap-2"><span className={`rounded-lg p-2 ${area === item.id ? 'bg-white text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{item.icon}</span><span className="text-sm font-extrabold">{item.label}</span></div>
            <p className="mt-2 text-[11px] leading-4 opacity-75">{item.description}</p>
          </button>
        ))}
      </div>

      {area === 'contratos' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800"><strong>Fluxo simples:</strong> cadastre o contrato → registre a medição → informe a Nota Fiscal → acompanhe o recebimento em Pagar e Receber.</div>
          <FinanceContratos requestAdminDelete={requestAdminDelete} canEdit={canEdit} />
          <FinanceMedicoes requestAdminDelete={requestAdminDelete} canEdit={canEdit} />
        </div>
      )}
      {area === 'bancos' && <FinanceBankReconciliation canEdit={canEdit} />}
      {area === 'planejamento' && <FinanceOperationRegistry kinds={['orcamento', 'emprestimo', 'cartao', 'despesa_cartao', 'reembolso', 'custo_pessoal', 'tributo']} defaultKind="orcamento" canEdit={canEdit} />}
      {area === 'patrimonio' && <FinanceOperationRegistry kinds={['ativo', 'rateio']} defaultKind="ativo" canEdit={canEdit} />}
    </div>
  );
}
