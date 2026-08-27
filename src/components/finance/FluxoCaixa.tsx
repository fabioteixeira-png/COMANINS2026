import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Landmark, RefreshCw, Filter, Calendar, 
  HelpCircle, AlertCircle, PlayCircle, BarChart3, ChevronRight 
} from 'lucide-react';
import { FinanceTransaction } from '../../types';
import { syncFinanceTransactions, syncFinanceCollection } from '../../lib/firebase';
import FinanceExportButton from './FinanceExportButton';

export default function FluxoCaixa() {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [period, setPeriod] = useState<'diario' | 'semanal' | 'mensal'>('mensal');
  const [selectedScenario, setSelectedScenario] = useState<'realista' | 'conservador' | 'otimista'>('realista');
  const [selectedAccount, setSelectedAccount] = useState('todas');

  useEffect(() => {
    const unsubscribe = syncFinanceTransactions((data) => {
      setTransactions(data);
    });
    const unsubBank = syncFinanceCollection<any>('financeBankAccounts', (data) => {
      setBankAccounts(data);
    });
    return () => {
      unsubscribe();
      unsubBank();
    };
  }, []);

  const isSimulacao = false;

  const paidAmount = (t: FinanceTransaction) => {
    if (Array.isArray(t.settlements) && t.settlements.length > 0) {
      return t.settlements.reduce((sum, settlement) => sum + Number(settlement.amount || 0), 0);
    }
    return Math.max(0, Number(t.paidAmount || (t.status === 'pago' ? t.amount : 0)));
  };

  const openBalance = (t: FinanceTransaction) => {
    if (t.status === 'cancelado') return 0;
    if (Number.isFinite(Number(t.openBalance))) return Math.max(0, Number(t.openBalance));
    return Math.max(0, Number(t.amount || 0) - paidAmount(t));
  };

  const settlementAmountInMonth = (t: FinanceTransaction, month: number, year: number) => {
    if (Array.isArray(t.settlements) && t.settlements.length > 0) {
      return t.settlements.reduce((sum, settlement) => {
        const d = new Date(`${settlement.date}T12:00:00`);
        return !Number.isNaN(d.getTime()) && d.getMonth() === month && d.getFullYear() === year
          ? sum + Number(settlement.amount || 0)
          : sum;
      }, 0);
    }
    const d = new Date(`${t.date}T12:00:00`);
    return !Number.isNaN(d.getTime()) && d.getMonth() === month && d.getFullYear() === year ? paidAmount(t) : 0;
  };

  // Projections
  const currentBalance = isSimulacao 
    ? 138450.00 
    : bankAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  // Realized and Planned entries
  const entriesRealized = transactions
    .filter(t => t.type === 'receita')
    .reduce((sum, t) => sum + paidAmount(t), 0);

  const entriesPlanned = transactions
    .filter(t => t.type === 'receita' && t.status !== 'cancelado')
    .reduce((sum, t) => sum + openBalance(t), 0);

  // Realized and Planned exits
  const exitsRealized = transactions
    .filter(t => t.type === 'despesa')
    .reduce((sum, t) => sum + paidAmount(t), 0);

  const exitsPlanned = transactions
    .filter(t => t.type === 'despesa' && t.status !== 'cancelado')
    .reduce((sum, t) => sum + openBalance(t), 0);

  // Scenario Multiplier Rule (Page 13 - Cenário)
  // Otimista: assumes receiving 100% of planned receivables
  // Realista: assumes receiving 85% of planned receivables
  // Conservador: assumes receiving 65% of planned receivables, and 100% of planned debts
  const multiplier = selectedScenario === 'otimista' ? 1.0 : selectedScenario === 'realista' ? 0.85 : 0.65;
  const projectedEntries = entriesPlanned * multiplier;
  const projectedExits = exitsPlanned; // Debts are fully expected

  const projectedBalance = currentBalance + projectedEntries - projectedExits;

  // Monthly breakdown for table
  const months = isSimulacao ? [
    { name: 'Julho 2026 (Realizado)', recReal: 45000.0, recPrev: 0, despReal: 12500.0, despPrev: 0, balance: 138450.0 },
    { name: 'Agosto 2026', recReal: 0, recPrev: 45000.0, despReal: 0, despPrev: 8500.0, balance: 0 },
    { name: 'Setembro 2026', recReal: 0, recPrev: 52000.0, despReal: 0, despPrev: 14200.0, balance: 0 },
    { name: 'Outubro 2026', recReal: 0, recPrev: 60000.0, despReal: 0, despPrev: 11500.0, balance: 0 },
  ] : (() => {
    const arr = [];
    const now = new Date();
    for (let i = 0; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const nameStr = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const capitalizedName = nameStr.charAt(0).toUpperCase() + nameStr.slice(1);
      
      const monthTx = transactions.filter(t => {
        const txDate = new Date(t.dueDate || t.date);
        return txDate.getMonth() === d.getMonth() && txDate.getFullYear() === d.getFullYear();
      });

      const recReal = transactions
        .filter(t => t.type === 'receita')
        .reduce((sum, t) => sum + settlementAmountInMonth(t, d.getMonth(), d.getFullYear()), 0);

      const recPrev = monthTx
        .filter(t => t.type === 'receita' && t.status !== 'cancelado')
        .reduce((sum, t) => sum + openBalance(t), 0);

      const despReal = transactions
        .filter(t => t.type === 'despesa')
        .reduce((sum, t) => sum + settlementAmountInMonth(t, d.getMonth(), d.getFullYear()), 0);

      const despPrev = monthTx
        .filter(t => t.type === 'despesa' && t.status !== 'cancelado')
        .reduce((sum, t) => sum + openBalance(t), 0);

      arr.push({
        name: i === 0 ? `${capitalizedName} (Atual)` : capitalizedName,
        recReal,
        recPrev,
        despReal,
        despPrev,
        balance: 0
      });
    }
    return arr;
  })();

  // Calculate moving projected balance starting from first month
  let rollingBalance = currentBalance;
  const tableData = months.map((m, idx) => {
    if (idx === 0) {
      rollingBalance = rollingBalance + m.recReal - m.despReal;
      return { ...m, balance: rollingBalance };
    }

    const projectedRec = m.recPrev * multiplier;
    const projectedDesp = m.despPrev;
    rollingBalance = rollingBalance + projectedRec - projectedDesp;

    return {
      ...m,
      recPrev: projectedRec,
      despPrev: projectedDesp,
      balance: rollingBalance
    };
  });

  const fluxoExportRows = tableData.map((item) => ({
    'Período de Competência': item.name,
    'Entradas Realizadas': Number(item.recReal || 0),
    'Entradas Previstas': Number(item.recPrev || 0),
    'Saídas Realizadas': Number(item.despReal || 0),
    'Saídas Previstas': Number(item.despPrev || 0),
    'Saldo Final Projetado': Number(item.balance || 0),
    'Cenário': selectedScenario,
    'Visualização': period,
  }));


  return (
    <div className="space-y-6">
      {/* Top Banner Control */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Projeção de Fluxo de Caixa</h3>
          <p className="text-xs text-slate-500">Mapeamento dinâmico de saídas e entradas com teste de estresse de liquidez.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Cenário Projeção:</span>
            <select 
              value={selectedScenario} 
              onChange={(e) => setSelectedScenario(e.target.value as any)}
              className="border-slate-300 rounded-lg p-1.5 text-xs font-bold focus:ring-2 focus:ring-royal-blue focus:border-royal-blue bg-amber-50 text-amber-900 border-amber-300"
            >
              <option value="realista">Realista (85% das Receitas)</option>
              <option value="conservador">Conservador (65% das Receitas)</option>
              <option value="otimista">Otimista (100% das Receitas)</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Período:</span>
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-50">
              <button onClick={() => setPeriod('diario')} className={`px-2 py-1 rounded-md text-[10px] font-bold ${period === 'diario' ? 'bg-white text-royal-blue shadow-sm' : 'text-slate-600'}`}>Diário</button>
              <button onClick={() => setPeriod('semanal')} className={`px-2 py-1 rounded-md text-[10px] font-bold ${period === 'semanal' ? 'bg-white text-royal-blue shadow-sm' : 'text-slate-600'}`}>Semanal</button>
              <button onClick={() => setPeriod('mensal')} className={`px-2 py-1 rounded-md text-[10px] font-bold ${period === 'mensal' ? 'bg-white text-royal-blue shadow-sm' : 'text-slate-600'}`}>Mensal</button>
            </div>
          </div>
          <FinanceExportButton rows={fluxoExportRows} fileName="FLUXO_DE_CAIXA_COMANINS" sheetName="Fluxo de Caixa" label="Exportar XLSX" title="Exportar projeção atual do fluxo de caixa" />
        </div>
      </div>

      {/* KPI Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Saldo Conciliado Anterior</p>
          <h3 className="text-2xl font-extrabold text-slate-900">R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          <p className="text-[10px] text-slate-400 mt-2">Saldo bancário conciliado em D-1</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Entradas Projetadas</p>
          <h3 className="text-2xl font-extrabold text-emerald-600">R$ {projectedEntries.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          <p className="text-[10px] text-slate-400 mt-2">Com redutor {selectedScenario === 'realista' ? 'de 15%' : selectedScenario === 'conservador' ? 'de 35%' : 'zerado'}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Saídas Projetadas</p>
          <h3 className="text-2xl font-extrabold text-rose-600">R$ {projectedExits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          <p className="text-[10px] text-slate-400 mt-2">100% das contas a pagar pendentes</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden bg-slate-50">
          <p className="text-xs font-bold text-royal-blue uppercase tracking-wider mb-1">Saldo Final Projetado</p>
          <h3 className="text-2xl font-extrabold text-slate-900">R$ {projectedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          <p className="text-[10px] text-slate-400 mt-2">Saldo de abertura + entradas - saídas</p>
        </div>
      </div>

      {/* Table grid layout for projections */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h4 className="font-bold text-slate-800">Cronograma Mensal de Projeção Econômica</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-3">Período de Competência</th>
                <th className="px-6 py-3 text-right">Entradas Realizadas</th>
                <th className="px-6 py-3 text-right">Entradas Previstas (Cenário)</th>
                <th className="px-6 py-3 text-right">Saídas Realizadas</th>
                <th className="px-6 py-3 text-right">Saídas Previstas</th>
                <th className="px-6 py-3 text-right">Saldo Final Projetado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableData.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{item.name}</td>
                  <td className="px-6 py-4 text-right text-slate-500 font-mono">
                    {item.recReal > 0 ? `R$ ${item.recReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-right text-emerald-600 font-bold font-mono">
                    {item.recPrev > 0 ? `R$ ${item.recPrev.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500 font-mono">
                    {item.despReal > 0 ? `R$ ${item.despReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-right text-rose-600 font-bold font-mono">
                    {item.despPrev > 0 ? `R$ ${item.despPrev.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900 font-mono bg-slate-50/50">
                    R$ {item.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warning/Scenario Explanation Card */}
      <div className="p-4 bg-amber-50 border border-amber-200 text-xs text-amber-800 rounded-xl flex items-start space-x-2.5">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h5 className="font-bold">Princípios de Estresse de Caixa (Seção 8)</h5>
          <p className="mt-1">
            De acordo com as especificações da COMANINS, a previsão realista deve ser parametrizada com 85% de conversão de recebíveis comerciais 
            e a conservadora com 65%. Caso o saldo projetado atinja níveis negativos em algum período futuro, o sistema gerará um alerta preventivo 
            no painel de Saúde Gerencial do Dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
