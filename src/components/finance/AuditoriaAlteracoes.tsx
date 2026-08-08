import React, { useState } from 'react';
import { 
  ShieldAlert, User, Clock, Search, Filter, RefreshCw, FileText 
} from 'lucide-react';

interface AuditLog {
  id: string;
  user: string;
  action: string;
  module: string;
  recordId: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
}

export default function AuditoriaAlteracoes() {
  const isSimulacao = (localStorage.getItem('finance_op_mode') || 'homologado') === 'simulacao';

  const [logs] = useState<AuditLog[]>(() => {
    return isSimulacao ? [
      { id: 'log-01', user: 'Amanda Silva (Gerente)', action: 'Alteração de status de despesa', module: 'Contas a Pagar', recordId: 'tx-24019', oldValue: 'Pendente', newValue: 'Pago', timestamp: '2026-08-02 11:24:55' },
      { id: 'log-02', user: 'Carlos Eduardo (Admin)', action: 'Criação de novo orçamento anual', module: 'Previsto x Realizado', recordId: 'b-04', oldValue: '—', newValue: 'R$ 25.000,00', timestamp: '2026-08-01 16:10:12' },
      { id: 'log-03', user: 'Amanda Silva (Gerente)', action: 'Exclusão de rascunho de medição', module: 'Medições e Faturamento', recordId: 'meas-12', oldValue: 'Braskem Julho R$ 15.000,00', newValue: '[Removido]', timestamp: '2026-08-01 10:15:40' },
    ] : [];
  });

  const [searchTerm, setSearchTerm] = useState('');

  const filtered = logs.filter(l => 
    l.user.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.module.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.action.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header Controls */}
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Trilha de Auditoria e Segurança (LGPD)</h3>
          <p className="text-sm text-slate-500">Histórico inalterável de lançamentos, modificações e acessos a dados sensíveis.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar logs por usuário/módulo..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue outline-none" 
            />
          </div>
        </div>
      </div>

      {/* Timeline List */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th className="px-6 py-3">Horário / Data</th>
              <th className="px-6 py-3">Usuário Executor</th>
              <th className="px-6 py-3">Ação Realizada</th>
              <th className="px-6 py-3">Módulo Afetado</th>
              <th className="px-6 py-3 text-right">Valor Anterior</th>
              <th className="px-6 py-3 text-right text-emerald-600">Valor Novo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-xs">
            {filtered.map(log => (
              <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                  {log.timestamp}
                </td>
                <td className="px-6 py-4 font-bold text-slate-800 font-sans">
                  {log.user}
                </td>
                <td className="px-6 py-4 font-semibold text-slate-700 font-sans">
                  {log.action}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                    {log.module}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-slate-400">
                  {log.oldValue}
                </td>
                <td className="px-6 py-4 text-right text-emerald-600 font-bold">
                  {log.newValue}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
