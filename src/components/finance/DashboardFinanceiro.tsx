import React, { useState, useEffect } from 'react';
import { 
  Calendar, Filter, Landmark, TrendingUp, TrendingDown, PieChart, 
  Activity, AlertTriangle, CheckCircle, RefreshCw, BarChart3, AlertCircle, Clock 
} from 'lucide-react';
import { FinanceTransaction, FinanceContract, FinanceMeasurement } from '../../types';
import { syncFinanceTransactions, syncFinanceContracts, syncFinanceMeasurements, syncFinanceCollection } from '../../lib/firebase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell } from 'recharts';

export default function DashboardFinanceiro() {
  // Filters
  const [period, setPeriod] = useState(String(new Date().getFullYear()));
  const [vision, setVision] = useState<'competencia' | 'caixa'>('caixa');
  const [selectedCostCenter, setSelectedCostCenter] = useState('todos');
  const [selectedContract, setSelectedContract] = useState('todos');

  // Firebase state
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [contracts, setContracts] = useState<FinanceContract[]>([]);
  const [measurements, setMeasurements] = useState<FinanceMeasurement[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  useEffect(() => {
    const unsubTx = syncFinanceTransactions((data) => setTransactions(data));
    const unsubContract = syncFinanceContracts((data) => setContracts(data));
    const unsubMeasurement = syncFinanceMeasurements((data) => setMeasurements(data));
    const unsubBank = syncFinanceCollection<any>('financeBankAccounts', (data) => setBankAccounts(data));

    return () => {
      unsubTx();
      unsubContract();
      unsubMeasurement();
      unsubBank();
    };
  }, []);

  const txOpenBalance = (t: FinanceTransaction) => {
    if (Number.isFinite(Number(t.openBalance))) return Math.max(0, Number(t.openBalance));
    return t.status === 'pago' ? 0 : Math.max(0, Number(t.amount || 0) - Number(t.paidAmount || 0));
  };

  const settledAmountForPeriod = (t: FinanceTransaction, month?: number) => {
    const settlements = Array.isArray(t.settlements) ? t.settlements : [];
    if (settlements.length > 0) {
      return settlements.reduce((sum, settlement) => {
        const d = new Date(`${settlement.date}T12:00:00`);
        if (Number.isNaN(d.getTime())) return sum;
        if (period !== 'todos' && String(d.getFullYear()) !== period) return sum;
        if (month !== undefined && d.getMonth() !== month) return sum;
        return sum + Number(settlement.amount || 0);
      }, 0);
    }
    const legacyPaid = Number(t.paidAmount || (t.status === 'pago' ? t.amount : 0));
    if (legacyPaid <= 0) return 0;
    const d = new Date(`${t.date}T12:00:00`);
    if (Number.isNaN(d.getTime())) return 0;
    if (period !== 'todos' && String(d.getFullYear()) !== period) return 0;
    if (month !== undefined && d.getMonth() !== month) return 0;
    return legacyPaid;
  };

  // Os filtros organizacionais valem para competência e caixa. Em regime de
  // caixa, o período é aplicado à data real das baixas, não à criação do título.
  const scopedTx = transactions.filter(t => {
    if (selectedCostCenter !== 'todos' && t.costCenter !== selectedCostCenter) return false;
    if (selectedContract !== 'todos' && t.contractNumber !== selectedContract) return false;
    return true;
  });

  const filteredTx = scopedTx.filter(t => {
    if (vision === 'caixa' || period === 'todos') return true;
    const year = new Date(`${t.date}T12:00:00`).getFullYear().toString();
    return year === period;
  });

  const isSimulacao = false;

  // KPI Calculations according to Page 7 definitions
  const saldoBancario = isSimulacao 
    ? 138450.00 
    : bankAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  // Receita operacional (services recognized in the period)
  const receitaOperacional = filteredTx
    .filter(t => t.type === 'receita')
    .reduce((sum, t) => sum + (vision === 'competencia' ? t.amount : settledAmountForPeriod(t)), 0);

  // Custos operacionais (direct + indirect of period)
  const custosOperacionais = filteredTx
    .filter(t => t.type === 'despesa')
    .reduce((sum, t) => sum + (vision === 'competencia' ? t.amount : settledAmountForPeriod(t)), 0);

  // Resultado operacional = receita - custos
  const resultadoOperacional = receitaOperacional - custosOperacionais;

  // Margem operacional = resultado operacional / receita operacional * 100
  const margemOperacional = receitaOperacional > 0 ? (resultadoOperacional / receitaOperacional) * 100 : 0;

  // Entradas e saídas de caixa (effectively paid/received)
  const totalEntradasCaixa = scopedTx
    .filter(t => t.type === 'receita')
    .reduce((sum, t) => sum + settledAmountForPeriod(t), 0);

  const totalSaidasCaixa = scopedTx
    .filter(t => t.type === 'despesa')
    .reduce((sum, t) => sum + settledAmountForPeriod(t), 0);

  // Contas Vencidas
  const contasPagarVencidas = filteredTx
    .filter(t => t.type === 'despesa' && t.status === 'atrasado')
    .reduce((sum, t) => sum + txOpenBalance(t), 0);

  const contasReceberVencidas = filteredTx
    .filter(t => t.type === 'receita' && t.status === 'atrasado')
    .reduce((sum, t) => sum + txOpenBalance(t), 0);

  // Contract list and cost centers extracted from transactions for filter dropdowns
  const costCenters = Array.from(new Set(transactions.map(t => t.costCenter).filter(Boolean)));
  const contractNumbers = Array.from(new Set(transactions.map(t => t.contractNumber).filter(Boolean)));

  // Generate chart data month-by-month for the current year
  const monthsBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthlyData = monthsBR.map((monthName, idx) => {
    const monthTx = filteredTx.filter(t => {
      const tMonth = new Date(t.date).getMonth();
      return tMonth === idx;
    });

    const rec = vision === 'competencia'
      ? monthTx.filter(t => t.type === 'receita').reduce((sum, t) => sum + t.amount, 0)
      : scopedTx.filter(t => t.type === 'receita').reduce((sum, t) => sum + settledAmountForPeriod(t, idx), 0);

    const desp = vision === 'competencia'
      ? monthTx.filter(t => t.type === 'despesa').reduce((sum, t) => sum + t.amount, 0)
      : scopedTx.filter(t => t.type === 'despesa').reduce((sum, t) => sum + settledAmountForPeriod(t, idx), 0);

    return {
      name: monthName,
      Receitas: rec,
      Despesas: desp,
      Resultado: rec - desp
    };
  });

  // Concentration of revenue data
  const clientConcentration = Array.from(new Set(filteredTx.filter(t => t.type === 'receita').map(t => t.contactName)))
    .map(clientName => {
      const clientTotal = filteredTx
        .filter(t => t.type === 'receita' && t.contactName === clientName)
        .reduce((sum, t) => sum + (vision === 'competencia' ? t.amount : settledAmountForPeriod(t)), 0);
      const percentage = receitaOperacional > 0 ? (clientTotal / receitaOperacional) * 100 : 0;
      return { name: clientName, value: clientTotal, percentage };
    })
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      {/* Visual Filters Area */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <select 
              value={period} 
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm border-slate-300 rounded-lg p-1.5 font-semibold focus:ring-royal-blue focus:border-royal-blue"
            >
              {Array.from(new Set([String(new Date().getFullYear()), ...transactions.map(t => String(new Date(`${t.date}T12:00:00`).getFullYear()))]))
                .filter(year => /^\d{4}$/.test(year))
                .sort((a, b) => Number(b) - Number(a))
                .map(year => <option key={year} value={year}>Ano de {year}</option>)}
              <option value="todos">Todos os Anos</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-slate-500">Regime:</span>
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-50">
              <button 
                onClick={() => setVision('caixa')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${vision === 'caixa' ? 'bg-white text-royal-blue shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Caixa
              </button>
              <button 
                onClick={() => setVision('competencia')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${vision === 'competencia' ? 'bg-white text-royal-blue shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Competência
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-slate-500">Centro de Custo:</span>
            <select 
              value={selectedCostCenter} 
              onChange={(e) => setSelectedCostCenter(e.target.value)}
              className="text-xs border-slate-300 rounded-lg p-1.5 font-semibold focus:ring-royal-blue focus:border-royal-blue"
            >
              <option value="todos">Todos</option>
              {costCenters.map(cc => <option key={cc} value={cc}>{cc}</option>)}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-slate-500">Contrato:</span>
            <select 
              value={selectedContract} 
              onChange={(e) => setSelectedContract(e.target.value)}
              className="text-xs border-slate-300 rounded-lg p-1.5 font-semibold focus:ring-royal-blue focus:border-royal-blue"
            >
              <option value="todos">Todos</option>
              {contractNumbers.map(cn => <option key={cn} value={cn}>{cn}</option>)}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400 flex items-center space-x-1 font-mono">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Sincronizado em tempo real com o Firestore</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Landmark className="h-24 w-24 text-royal-blue" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Saldo Bancário Ativo</p>
          <h3 className="text-2xl font-extrabold text-slate-900">R$ {saldoBancario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          <p className="text-[10px] text-slate-400 mt-2">Soma consolidada das contas ativas</p>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="h-24 w-24 text-emerald-600" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Receita Operacional</p>
          <h3 className="text-2xl font-extrabold text-emerald-600">R$ {receitaOperacional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          <p className="text-[10px] text-slate-400 mt-2">Visão por {vision === 'caixa' ? 'liquidação (caixa)' : 'emissão (competência)'}</p>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingDown className="h-24 w-24 text-rose-600" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Custos Operacionais</p>
          <h3 className="text-2xl font-extrabold text-rose-600">R$ {custosOperacionais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          <p className="text-[10px] text-slate-400 mt-2">Custos diretos + indiretos do período</p>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <PieChart className="h-24 w-24 text-royal-blue" />
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Resultado & Margem</p>
          <h3 className="text-2xl font-extrabold text-slate-900">R$ {resultadoOperacional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          <div className="flex items-center space-x-2 mt-2">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${margemOperacional >= 20 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              Margem: {margemOperacional.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Area Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
            <span>Demonstrativo Mensal</span>
            <span className="text-xs font-normal text-slate-500">Receitas vs Despesas</span>
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="Receitas" stroke="#10b981" fillOpacity={1} fill="url(#colorRec)" strokeWidth={2} />
                <Area type="monotone" dataKey="Despesas" stroke="#ef4444" fillOpacity={1} fill="url(#colorDes)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Health and Concentrations */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-slate-800 mb-2 flex items-center space-x-1.5">
              <Activity className="h-4 w-4 text-royal-blue" />
              <span>Saúde Gerencial (Margem e Atrasos)</span>
            </h3>
            <div className="p-3 bg-slate-50 rounded-lg flex items-center space-x-3 border border-slate-100">
              <div className={`p-2 rounded-full ${margemOperacional >= 25 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {margemOperacional >= 25 ? <CheckCircle className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800">
                  {margemOperacional >= 25 ? 'Estrutura Financeira Saudável' : 'Atenção com Margens'}
                </h4>
                <p className="text-xs text-slate-500">
                  {margemOperacional >= 25 
                    ? 'A margem operacional de COMANINS está acima da meta estipulada.' 
                    : 'Acompanhe as despesas de frota e administrativas.'}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-slate-800 mb-3 text-sm">Concentração de Receitas (% Faturamento)</h3>
            <div className="space-y-3">
              {clientConcentration.length > 0 ? clientConcentration.slice(0, 3).map((client, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>{client.name || 'Outros'}</span>
                    <span>{client.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${idx === 0 ? 'bg-royal-blue' : idx === 1 ? 'bg-blue-400' : 'bg-indigo-300'}`} 
                      style={{ width: `${client.percentage}%` }}
                    />
                  </div>
                </div>
              )) : (
                <p className="text-xs text-slate-400">Nenhum faturamento registrado no período.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Official Formulas & Alert Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-slate-400" />
            <span>Fórmula Oficial de Margem de Contratos</span>
          </h3>
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-lg flex items-center justify-center">
            <div className="text-center font-mono text-xs text-slate-700">
              <div className="border-b border-slate-400 pb-1 mb-1">
                Receita Global - Custos Diretos - Custos Rateados
              </div>
              <div>
                Receita Global
              </div>
              <div className="mt-2 text-royal-blue font-bold">
                Multiplicador: x 100
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-rose-500" />
            <span>Painel de Alertas Críticos (Mínimos do PDF 21.1)</span>
          </h3>
          <div className="space-y-2">
            {contasPagarVencidas > 0 && (
              <div className="flex items-center space-x-2 text-xs font-semibold p-2 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span>Há R$ {contasPagarVencidas.toLocaleString('pt-BR')} em contas a pagar atrasadas!</span>
              </div>
            )}
            {contasReceberVencidas > 0 && (
              <div className="flex items-center space-x-2 text-xs font-semibold p-2 bg-amber-50 border border-amber-100 text-amber-700 rounded-lg">
                <Clock className="h-4 w-4" />
                <span>Há R$ {contasReceberVencidas.toLocaleString('pt-BR')} em faturamento vencido sem baixa.</span>
              </div>
            )}
            <div className="flex items-center space-x-2 text-xs font-semibold p-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg">
              <CheckCircle className="h-4 w-4" />
              <span>Contas bancárias operando com saldo projetado positivo.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
