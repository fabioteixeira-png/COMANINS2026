import React, { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, HelpCircle } from 'lucide-react';
import ContasPagar from './ContasPagar';
import ContasReceber from './ContasReceber';

interface FinanceMovementsProps {
  requestAdminDelete?: (type: string, id: string, name: string) => void;
  canEdit?: boolean;
  currentUserName?: string;
}

export default function FinanceMovements({ requestAdminDelete, canEdit = false, currentUserName = '' }: FinanceMovementsProps) {
  const [mode, setMode] = useState<'pagar' | 'receber'>('pagar');

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900">Pagar e Receber</h3>
            <p className="text-xs text-slate-500">Escolha apenas o que representa a operação. Não é necessário conhecer termos contábeis.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('pagar')}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${mode === 'pagar' ? 'border-rose-400 bg-rose-50 text-rose-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              <ArrowDownCircle className="h-5 w-5" />
              <div><div className="text-sm font-bold">Vou pagar</div><div className="text-[10px] opacity-70">Fornecedor, conta ou despesa</div></div>
            </button>
            <button
              type="button"
              onClick={() => setMode('receber')}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${mode === 'receber' ? 'border-emerald-400 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              <ArrowUpCircle className="h-5 w-5" />
              <div><div className="text-sm font-bold">Vou receber</div><div className="text-[10px] opacity-70">Cliente, serviço ou faturamento</div></div>
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-[11px] text-blue-800">
          <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Para cadastrar muitos registros, use <strong>Modelo → Importar</strong>. Para conferir ou trabalhar fora do sistema, use <strong>Exportar</strong>. A baixa pode ser total ou parcial.</span>
        </div>
      </div>

      {mode === 'pagar' ? (
        <ContasPagar requestAdminDelete={requestAdminDelete} canEdit={canEdit} currentUserName={currentUserName} />
      ) : (
        <ContasReceber requestAdminDelete={requestAdminDelete} canEdit={canEdit} currentUserName={currentUserName} />
      )}
    </div>
  );
}
