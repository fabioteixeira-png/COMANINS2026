import React, { useState } from 'react';
import { DollarSign, Percent, Calendar, FileText, CheckCircle } from 'lucide-react';

export default function TributosRetencoes() {
  const isSimulacao = false;

  const [taxes] = useState(() => {
    return isSimulacao ? [
      { id: 'tax-01', name: 'Simples Nacional / DAS', period: '07/2026', rate: 12.5, grossAmount: 180000.00, taxDue: 22500.00, dueDate: '2026-08-20', status: 'pendente' },
      { id: 'tax-02', name: 'Retenção ISS Fonte - Braskem', period: '07/2026', rate: 5.0, grossAmount: 280000.00, taxDue: 140000.00, dueDate: '2026-08-15', status: 'pago' },
    ] : [];
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-slate-800">Tributos, Retenções de Notas e Guia DAS</h3>
        <p className="text-sm text-slate-500">Apuração consolidada de impostos federais e municipais, ISS retido na fonte e cronograma de guias de recolhimento.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th className="px-6 py-3">Tributo / Guia de Recolhimento</th>
              <th className="px-6 py-3">Período de Apuração</th>
              <th className="px-6 py-3 text-center">Alíquota Efetiva</th>
              <th className="px-6 py-3 text-right">Faturamento de Base</th>
              <th className="px-6 py-3 text-right">Valor do Imposto Apurado</th>
              <th className="px-6 py-3 text-center">Vencimento Guia</th>
              <th className="px-6 py-3 text-center">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {taxes.map(tax => (
              <tr key={tax.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-bold text-slate-800 font-sans">{tax.name}</td>
                <td className="px-6 py-4 font-sans font-semibold text-slate-700">{tax.period}</td>
                <td className="px-6 py-4 text-center text-royal-blue font-bold">{tax.rate}%</td>
                <td className="px-6 py-4 text-right text-slate-500">R$ {tax.grossAmount.toLocaleString('pt-BR')}</td>
                <td className="px-6 py-4 text-right text-rose-600 font-bold">R$ {tax.taxDue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-6 py-4 text-center text-slate-600 font-sans font-semibold">{new Date(tax.dueDate).toLocaleDateString('pt-BR')}</td>
                <td className="px-6 py-4 text-center font-sans">
                  {tax.status === 'pago' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                      Liquidado
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px]">
                      Aguardando Guia
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
