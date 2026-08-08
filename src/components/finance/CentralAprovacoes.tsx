import React, { useState } from 'react';
import { 
  CheckCircle, XCircle, Clock, ShieldAlert, Award, FileText, 
  HelpCircle, ThumbsUp, ThumbsDown 
} from 'lucide-react';

interface ApprovalItem {
  id: string;
  type: 'despesa' | 'adiantamento';
  requester: string;
  description: string;
  amount: number;
  requiredLevel: 'Gerente Administrativo' | 'Diretoria Executiva';
  status: 'pendente' | 'aprovado' | 'rejeitado';
}

export default function CentralAprovacoes() {
  const isSimulacao = (localStorage.getItem('finance_op_mode') || 'homologado') === 'simulacao';

  const [approvals, setApprovals] = useState<ApprovalItem[]>(() => {
    return isSimulacao ? [
      { id: 'ap-01', type: 'despesa', requester: 'Frota', description: 'Manutenção de Motor Veículo Hilux', amount: 4800.00, requiredLevel: 'Gerente Administrativo', status: 'pendente' },
      { id: 'ap-02', type: 'despesa', requester: 'Sede', description: 'Compra de Licenças Softwares Metrológicos', amount: 15500.00, requiredLevel: 'Diretoria Executiva', status: 'pendente' },
      { id: 'ap-03', type: 'adiantamento', requester: 'Bruno Mendes', description: 'Adiantamento Viagem Técnica Longa Camaçari', amount: 2500.00, requiredLevel: 'Gerente Administrativo', status: 'pendente' },
    ] : [];
  });

  const handleDecision = (id: string, decision: 'aprovado' | 'rejeitado') => {
    setApprovals(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, status: decision };
      }
      return item;
    }));
    alert(`✓ Solicitação marcada como ${decision === 'aprovado' ? 'APROVADA' : 'REJEITADA'} com sucesso!`);
  };

  const pendingCount = approvals.filter(a => a.status === 'pendente').length;

  return (
    <div className="space-y-6">
      {/* Upper overview stats */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Central Unificada de Aprovações</h3>
          <p className="text-sm text-slate-500">Fluxos de validação de despesas de alto montante, viagens e reembolsos.</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 flex items-center space-x-2 text-amber-800 text-xs font-bold">
          <Clock className="h-4 w-4 animate-pulse text-amber-600" />
          <span>{pendingCount} solicitações aguardando seu parecer técnico</span>
        </div>
      </div>

      {/* Level Threshold Cards (Page 19) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-3.5">
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-lg">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Alçada Nível 1: Gerência</h4>
            <p className="text-xs text-slate-500 mt-1">Autorização de despesas e reembolsos corporativos de até R$ 5.000,00.</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-3.5 bg-gradient-to-tr from-slate-50 to-white">
          <div className="p-2.5 bg-royal-blue/10 text-royal-blue rounded-lg">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Alçada Nível 2: Diretoria</h4>
            <p className="text-xs text-slate-500 mt-1">Lançamentos de investimento, passivos ou despesas que superam R$ 5.000,00.</p>
          </div>
        </div>
      </div>

      {/* Table/List of pending approvals */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50">
          <h4 className="font-bold text-slate-800 text-sm">Fila de Pareceres Pendentes</h4>
        </div>

        <div className="divide-y divide-slate-100">
          {approvals.filter(a => a.status === 'pendente').length > 0 ? approvals.filter(a => a.status === 'pendente').map(item => (
            <div key={item.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-800 text-sm">{item.description}</span>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${item.type === 'despesa' ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800'}`}>
                    {item.type}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  Solicitante: <span className="font-semibold text-slate-700">{item.requester}</span> • Alçada Requerida: <span className="font-semibold text-royal-blue">{item.requiredLevel}</span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <span className="text-xs text-slate-400">Montante:</span>
                  <div className="font-mono font-extrabold text-slate-900 text-sm">R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>

                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => handleDecision(item.id, 'aprovado')}
                    className="p-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors"
                    title="Aprovar Lançamento"
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDecision(item.id, 'rejeitado')}
                    className="p-2 bg-rose-100 text-rose-800 hover:bg-rose-600 hover:text-white rounded-lg transition-colors"
                    title="Rejeitar Lançamento"
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-slate-500 text-sm">
              Nenhuma solicitação aguardando aprovação na fila corrente.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
