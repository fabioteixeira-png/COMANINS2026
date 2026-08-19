import React, { useState } from 'react';
import { Bell, AlertCircle, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function AlertasNotificacoes() {
  const isSimulacao = false;

  const [alerts] = useState(() => {
    return isSimulacao ? [
      { id: 'al-01', level: 'critico', text: 'Estouro de orçamento no centro de custo Frota (Combustível) em +22.5%!', date: '02/08/2026' },
      { id: 'al-02', level: 'atencao', text: 'Nota Fiscal NF-23456 do cliente Braskem está vencendo em 2 dias sem liquidação registrada.', date: '01/08/2026' },
      { id: 'al-03', level: 'info', text: 'Extrato de Itaú Sede importado com sucesso via OFX por Amanda Silva.', date: '01/08/2026' },
    ] : [];
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-slate-800">Alertas e Notificações Preventivas</h3>
        <p className="text-sm text-slate-500">Monitoramento ativo de liquidez, estouros orçamentários, vencimento de recebíveis e alçadas pendentes.</p>
      </div>

      <div className="space-y-3">
        {alerts.map(item => (
          <div 
            key={item.id} 
            className={`p-4 rounded-xl border flex items-start space-x-3 ${item.level === 'critico' ? 'bg-rose-50 border-rose-200 text-rose-800' : item.level === 'atencao' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}
          >
            {item.level === 'critico' && <ShieldAlert className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />}
            {item.level === 'atencao' && <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />}
            {item.level === 'info' && <Bell className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />}

            <div className="flex-1 space-y-1">
              <p className="text-xs font-bold font-sans">{item.text}</p>
              <span className="text-[10px] text-slate-400 font-mono font-semibold">{item.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
