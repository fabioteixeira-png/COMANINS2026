import React, { useState } from 'react';
import { Percent, Award, AlertCircle, Plus, Trash2 } from 'lucide-react';

export default function RateioCustos() {
  const isSimulacao = (localStorage.getItem('finance_op_mode') || 'homologado') === 'simulacao';

  const [rules, setRules] = useState(() => {
    return isSimulacao ? [
      { id: 'r-01', source: 'Sede Administrativa (Aluguel, Luz)', braskem: 50, acelen: 30, lab: 20 },
      { id: 'r-02', source: 'Frota de Apoio Geral (Seguros, Oficina)', braskem: 40, acelen: 40, lab: 20 },
    ] : [];
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-slate-800">Módulo de Rateio de Custos Administrativos</h3>
        <p className="text-sm text-slate-500">Regras de distribuição percentual das despesas de sede, suporte e frota compartilhada pelos contratos ativos.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th className="px-6 py-3">Origem da Despesa / Grupo de Rateio</th>
              <th className="px-6 py-3 text-center">Fator Contrato Braskem</th>
              <th className="px-6 py-3 text-center">Fator Contrato Acelen</th>
              <th className="px-6 py-3 text-center">Fator Laboratório Metrologia</th>
              <th className="px-6 py-3 text-center">Total Distribuição</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold">
            {rules.map(rule => (
              <tr key={rule.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-bold text-slate-800">{rule.source}</td>
                <td className="px-6 py-4 text-center text-royal-blue font-mono">{rule.braskem}%</td>
                <td className="px-6 py-4 text-center text-royal-blue font-mono">{rule.acelen}%</td>
                <td className="px-6 py-4 text-center text-royal-blue font-mono">{rule.lab}%</td>
                <td className="px-6 py-4 text-center text-emerald-600 font-mono font-bold">
                  {rule.braskem + rule.acelen + rule.lab}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
