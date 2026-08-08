import React, { useState } from 'react';
import { Users, FileText, Landmark, Clock, Percent } from 'lucide-react';

export default function CustosPessoalContrato() {
  const isSimulacao = (localStorage.getItem('finance_op_mode') || 'homologado') === 'simulacao';

  const [personnelCosts] = useState(() => {
    return isSimulacao ? [
      { id: 'pc-01', employee: 'Bruno Mendes', role: 'Engenheiro de Instrumentação', contract: 'Contrato Braskem', hourlyRate: 85.00, regularHours: 160, extraHours: 12, total: 15130.00 },
      { id: 'pc-02', employee: 'Geraldo Antunes', role: 'Técnico de Calibração Pleno', contract: 'Contrato Acelen', hourlyRate: 45.00, regularHours: 160, extraHours: 8, total: 7740.00 },
    ] : [];
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-slate-800">Custos de Pessoal por Contrato</h3>
        <p className="text-sm text-slate-500">Acompanhamento e apropriação de salários, encargos, horas extras e diárias diretamente nas contas de resultado de cada contrato.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th className="px-6 py-3">Colaborador / Função</th>
              <th className="px-6 py-3">Contrato Alocado</th>
              <th className="px-6 py-3 text-right">Taxa Horária (R$)</th>
              <th className="px-6 py-3 text-right">Horas Normais</th>
              <th className="px-6 py-3 text-right">Horas Extras</th>
              <th className="px-6 py-3 text-right">Custo Total Apropriado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {personnelCosts.map(item => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-bold text-slate-800 font-sans">{item.employee} <span className="block text-xs font-normal text-slate-500">{item.role}</span></td>
                <td className="px-6 py-4 text-royal-blue font-bold uppercase text-[10px] font-sans">{item.contract}</td>
                <td className="px-6 py-4 text-right">R$ {item.hourlyRate.toFixed(2)}</td>
                <td className="px-6 py-4 text-right">{item.regularHours}h</td>
                <td className="px-6 py-4 text-right text-rose-600">+{item.extraHours}h</td>
                <td className="px-6 py-4 text-right text-slate-900 font-bold">R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
