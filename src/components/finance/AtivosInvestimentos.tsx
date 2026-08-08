import React, { useState } from 'react';
import { Shield, Settings, AlertCircle, TrendingDown } from 'lucide-react';

export default function AtivosInvestimentos() {
  const isSimulacao = (localStorage.getItem('finance_op_mode') || 'homologado') === 'simulacao';

  const [assets] = useState(() => {
    return isSimulacao ? [
      { id: 'as-01', name: 'Calibrador de Processos Fluke 754', type: 'Equipamento Metrológico', cost: 45000.00, lifeMonths: 60, currentMonth: 12, salvageValue: 5000.00 },
      { id: 'as-02', name: 'Veículo Toyota Hilux Frota', type: 'Veículo Operacional', cost: 220000.00, lifeMonths: 48, currentMonth: 18, salvageValue: 60000.00 },
    ] : [];
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-slate-800">Ativos, Investimentos e Depreciação</h3>
        <p className="text-sm text-slate-500">Mapeamento de imobilizados, calibradores de alta precisão, veículos de frota e apuração de depreciação linear acumulada.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th className="px-6 py-3">Descrição do Ativo Fixo</th>
              <th className="px-6 py-3">Categoria</th>
              <th className="px-6 py-3 text-right">Custo Aquisição</th>
              <th className="px-6 py-3 text-center">Vida Útil Estipulada</th>
              <th className="px-6 py-3 text-right">Depreciação Mensal</th>
              <th className="px-6 py-3 text-right">Valor Contábil Líquido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {assets.map(asset => {
              const depreciableBase = asset.cost - asset.salvageValue;
              const monthlyDep = depreciableBase / asset.lifeMonths;
              const accumulatedDep = monthlyDep * asset.currentMonth;
              const netBookValue = asset.cost - accumulatedDep;

              return (
                <tr key={asset.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-800 font-sans">{asset.name}</td>
                  <td className="px-6 py-4 font-sans text-slate-600 font-semibold">{asset.type}</td>
                  <td className="px-6 py-4 text-right">R$ {asset.cost.toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4 text-center font-sans font-semibold text-slate-700">{asset.lifeMonths} meses</td>
                  <td className="px-6 py-4 text-right text-rose-600">R$ {monthlyDep.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right text-slate-900 font-bold">R$ {netBookValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
