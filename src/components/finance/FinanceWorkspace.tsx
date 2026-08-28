import React, { useState } from 'react';
import { BarChart3, CircleDollarSign, Settings2, WalletCards, ShieldCheck } from 'lucide-react';
import FinanceOverview from './FinanceOverview';
import FinanceMovements from './FinanceMovements';
import FinanceOperationsCenter from './FinanceOperationsCenter';
import FinanceReportsCenter from './FinanceReportsCenter';

interface FinanceWorkspaceProps {
  requestAdminDelete?: (type: string, id: string, name: string) => void;
  canEdit?: boolean;
  currentUser?: { id?: string; name?: string; username?: string } | null;
}

type FinanceSection = 'resumo' | 'movimentos' | 'gestao' | 'relatorios';

const sections: Array<{ id: FinanceSection; label: string; description: string; icon: React.ReactNode }> = [
  { id: 'resumo', label: 'Resumo', description: 'O que precisa da sua atenção hoje', icon: <BarChart3 className="h-5 w-5" /> },
  { id: 'movimentos', label: 'Pagar e Receber', description: 'Lançamentos, baixas e planilhas', icon: <CircleDollarSign className="h-5 w-5" /> },
  { id: 'gestao', label: 'Gestão', description: 'Contratos, bancos e rotinas financeiras', icon: <WalletCards className="h-5 w-5" /> },
  { id: 'relatorios', label: 'Relatórios e Cadastros', description: 'Indicadores, contas, categorias e auditoria', icon: <Settings2 className="h-5 w-5" /> },
];

export default function FinanceWorkspace({ requestAdminDelete, canEdit = false, currentUser }: FinanceWorkspaceProps) {
  const [section, setSection] = useState<FinanceSection>('resumo');
  const currentUserName = String(currentUser?.name || currentUser?.username || '').trim();

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-blue-50 p-2 text-blue-700"><CircleDollarSign className="h-6 w-6" /></div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Central Financeira COMANINS</h2>
                <p className="mt-0.5 text-sm text-slate-500">Uma tela simples para controlar dinheiro a pagar, a receber, bancos, contratos e planejamento.</p>
              </div>
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5" /> Dados reais em produção • alterações auditadas
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {sections.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`min-w-[150px] rounded-xl border p-3 text-left transition ${section === item.id
                  ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                <div className="mb-1 flex items-center gap-2 font-bold">{item.icon}<span className="text-sm">{item.label}</span></div>
                <p className="text-[10px] leading-4 opacity-75">{item.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {section === 'resumo' && <FinanceOverview canEdit={canEdit} onNavigate={setSection} />}
      {section === 'movimentos' && <FinanceMovements requestAdminDelete={requestAdminDelete} canEdit={canEdit} currentUserName={currentUserName} />}
      {section === 'gestao' && <FinanceOperationsCenter requestAdminDelete={requestAdminDelete} canEdit={canEdit} currentUserName={currentUserName} />}
      {section === 'relatorios' && <FinanceReportsCenter requestAdminDelete={requestAdminDelete} canEdit={canEdit} />}
    </div>
  );
}
