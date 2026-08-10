import React from 'react';
import { 
  Database, 
  Activity, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle, 
  TrendingUp, 
  RefreshCw, 
  Zap, 
  PieChart, 
  HardDrive, 
  Clock, 
  DollarSign, 
  Info,
  Server,
  Layers
} from 'lucide-react';
import { 
  useFirebaseTelemetry, 
  DAILY_READS_LIMIT, 
  DAILY_WRITES_LIMIT, 
  DAILY_DELETES_LIMIT, 
  simulateQuotaUsage, 
  resetTelemetryData 
} from '../lib/firebaseTelemetry';

interface FirebaseUsagePanelProps {
  onNavigateToAudit?: () => void;
}

export default function FirebaseUsagePanel({ onNavigateToAudit }: FirebaseUsagePanelProps) {
  const telemetry = useFirebaseTelemetry();

  const readsRatio = telemetry.dailyReads / DAILY_READS_LIMIT;
  const readsPercent = Math.min(100, Math.round(readsRatio * 100));

  const writesRatio = telemetry.dailyWrites / DAILY_WRITES_LIMIT;
  const writesPercent = Math.min(100, Math.round(writesRatio * 100));

  const deletesRatio = telemetry.dailyDeletes / DAILY_DELETES_LIMIT;
  const deletesPercent = Math.min(100, Math.round(deletesRatio * 100));

  // Estimate cost if over 50,000 reads ($0.06 per 100,000 reads on Firestore Blaze)
  const excessReads = Math.max(0, telemetry.dailyReads - DAILY_READS_LIMIT);
  const estimatedCostUsd = (excessReads / 100000) * 0.06;
  const estimatedCostBrl = estimatedCostUsd * 5.60;

  // Status badge styling
  const getStatusBadge = () => {
    switch (telemetry.quotaStatus) {
      case 'Normal':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Normal (Uso Seguro)
          </span>
        );
      case 'Atenção':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Atenção (70% do Limite)
          </span>
        );
      case 'Alerta':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
            Alerta (85% do Limite)
          </span>
        );
      case 'Alerta Crítico':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-bounce">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            Alerta Crítico (95% do Limite)
          </span>
        );
      case 'Risco de Cobrança':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white border border-red-700 shadow-md animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-white" />
            Risco de Cobrança / Cota Atingida
          </span>
        );
    }
  };

  // Convert moduleBreakdown object into sorted list by reads
  const modulesList = Object.entries(telemetry.moduleBreakdown).map(([name, usage]) => ({
    name,
    ...usage,
    readsShare: telemetry.dailyReads > 0 ? Math.round((usage.reads / telemetry.dailyReads) * 100) : 0,
  })).sort((a, b) => b.reads - a.reads);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-slate-900 via-royal-blue to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-blue-200 border border-white/10">
              <Database className="w-3.5 h-3.5 text-blue-300" />
              Monitoramento em Tempo Real do Banco de Dados
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              Controle de Consumo Firebase / Firestore
            </h1>
            <p className="text-sm text-blue-100/80 max-w-2xl leading-relaxed">
              Acompanhamento detalhado do consumo diário e mensal de leituras, gravações e exclusões. 
              Otimizado para manter seu sistema dentro da gratuidade e identificar módulos com consultas excessivas.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 flex flex-col items-end shrink-0">
            <span className="text-xs text-blue-200 font-semibold uppercase tracking-wider mb-1">
              Status Atual do Sistema
            </span>
            {getStatusBadge()}
          </div>
        </div>
      </div>

      {/* Warning Banner if >= 70% */}
      {readsRatio >= 0.7 && (
        <div className={`p-5 rounded-2xl border flex items-start gap-4 shadow-sm ${
          readsRatio >= 1.0 
            ? 'bg-red-50 border-red-300 text-red-900' 
            : readsRatio >= 0.95 
            ? 'bg-rose-50 border-rose-300 text-rose-900'
            : readsRatio >= 0.85
            ? 'bg-orange-50 border-orange-300 text-orange-900'
            : 'bg-amber-50 border-amber-300 text-amber-900'
        }`}>
          <div className={`p-2.5 rounded-xl shrink-0 ${
            readsRatio >= 0.95 ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'
          }`}>
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="font-bold text-base">
              {readsRatio >= 1.0
                ? 'Risco de Cobrança: Cota Gratuita do Firebase Atingida (100%)'
                : readsRatio >= 0.95
                ? 'Alerta Crítico: Consumo em 95% do Limite Gratuito'
                : readsRatio >= 0.85
                ? 'Alerta de Consumo Elevado: 85% Atingido'
                : 'Atenção: Consumo Atingiu 70% da Cota Gratuita'}
            </h3>
            <p className="text-sm leading-relaxed opacity-90">
              {readsRatio >= 1.0
                ? `O consumo atingiu ${telemetry.dailyReads.toLocaleString('pt-BR')} de ${DAILY_READS_LIMIT.toLocaleString('pt-BR')} leituras hoje. Operações adicionais podem gerar cobrança na conta vinculada do Firebase (Plano Blaze) ou requerer reinício da cota diária.`
                : `Seu aplicativo realizou ${telemetry.dailyReads.toLocaleString('pt-BR')} leituras no Firestore hoje (${readsPercent}% do limite de 50.000/dia). Verifique a lista de módulos abaixo para otimizar as consultas.`}
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Leituras Hoje */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Leituras Hoje
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-royal-blue flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-display font-extrabold text-slate-900">
                {telemetry.dailyReads.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                / {DAILY_READS_LIMIT.toLocaleString('pt-BR')}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-2">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  readsPercent >= 100 
                    ? 'bg-red-600' 
                    : readsPercent >= 95 
                    ? 'bg-rose-500' 
                    : readsPercent >= 85 
                    ? 'bg-orange-500' 
                    : readsPercent >= 70 
                    ? 'bg-amber-500' 
                    : 'bg-royal-blue'
                }`}
                style={{ width: `${Math.min(100, readsPercent)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>{readsPercent}% da Cota Diária</span>
            <span className="font-semibold text-slate-700">Otimizado</span>
          </div>
        </div>

        {/* Card 2: Leituras no Mês */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Leituras no Mês
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-display font-extrabold text-slate-900 mb-2">
              {telemetry.monthlyReads.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              Total acumulado no mês ({telemetry.lastResetMonth})
            </p>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Média Diária</span>
            <span className="font-semibold text-slate-700">
              {Math.round(telemetry.monthlyReads / Math.max(1, new Date().getDate())).toLocaleString('pt-BR')} / dia
            </span>
          </div>
        </div>

        {/* Card 3: Gravações & Exclusões */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Gravações / Exclusões
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-2 mb-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">Gravações (Writes):</span>
                <span className="font-bold text-slate-900">
                  {telemetry.dailyWrites.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">/ 20k</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">Exclusões (Deletes):</span>
                <span className="font-bold text-slate-900">
                  {telemetry.dailyDeletes.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">/ 20k</span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Gravações Mês</span>
            <span className="font-semibold text-slate-700">
              {telemetry.monthlyWrites.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Card 4: Consumo Estimado */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Consumo Estimado
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-display font-extrabold text-slate-900 mb-1">
              R$ {estimatedCostBrl.toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-2">
              {excessReads > 0 
                ? `${excessReads.toLocaleString('pt-BR')} leituras excedentes do limite gratuito` 
                : '100% Coberto pelo Plano Gratuito (R$ 0,00)'}
            </p>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Cota Gratuita</span>
            <span className="font-bold text-emerald-600">50.000 leituras/dia</span>
          </div>
        </div>
      </div>

      {/* Breakdown by Module / System Page */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-royal-blue" />
              Consumo Detalhado por Módulo do Sistema
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Identifique quais páginas e funcionalidades realizam a maior quantidade de consultas no banco de dados.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
              Total Módulos Ativos: <strong className="text-slate-800">{modulesList.length}</strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <th className="py-3.5 px-6">Módulo / Página</th>
                <th className="py-3.5 px-4 text-center">Leituras (Reads)</th>
                <th className="py-3.5 px-4 text-center">Participação (% Total)</th>
                <th className="py-3.5 px-4 text-center">Gravações (Writes)</th>
                <th className="py-3.5 px-4 text-center">Exclusões (Deletes)</th>
                <th className="py-3.5 px-6 text-right">Última Atividade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modulesList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Server className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                    Nenhuma atividade registrada no momento. Acesse os módulos do portal para gerar leituras.
                  </td>
                </tr>
              ) : (
                modulesList.map((mod) => (
                  <tr key={mod.name} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-800 flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-royal-blue" />
                      {mod.name}
                    </td>
                    <td className="py-4 px-4 text-center font-extrabold text-slate-900">
                      {mod.reads.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-royal-blue h-full rounded-full" 
                            style={{ width: `${Math.min(100, mod.readsShare)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 min-w-8">
                          {mod.readsShare}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center text-slate-700 font-medium">
                      {mod.writes.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-4 px-4 text-center text-slate-700 font-medium">
                      {mod.deletes.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-4 px-6 text-right text-xs text-slate-500 font-medium">
                      {mod.lastActivity || 'Agora'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulator / Test Controls & System Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Testing / Simulation Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Simulador de Alertas e Testes
              </h3>
              <p className="text-xs text-slate-500">
                Simule níveis de consumo para testar os avisos no sino de notificações e no painel.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <button
              onClick={() => simulateQuotaUsage(70)}
              className="px-3 py-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 text-xs font-bold transition-all"
            >
              Simular 70%
              <span className="block text-[10px] font-normal opacity-80">(Atenção)</span>
            </button>
            <button
              onClick={() => simulateQuotaUsage(85)}
              className="px-3 py-2.5 rounded-xl bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100 text-xs font-bold transition-all"
            >
              Simular 85%
              <span className="block text-[10px] font-normal opacity-80">(Alerta)</span>
            </button>
            <button
              onClick={() => simulateQuotaUsage(95)}
              className="px-3 py-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 text-xs font-bold transition-all"
            >
              Simular 95%
              <span className="block text-[10px] font-normal opacity-80">(Crítico)</span>
            </button>
            <button
              onClick={() => simulateQuotaUsage(100)}
              className="px-3 py-2.5 rounded-xl bg-red-600 text-white border border-red-700 hover:bg-red-700 text-xs font-bold transition-all shadow-xs"
            >
              Simular 100%
              <span className="block text-[10px] font-normal opacity-80">(Risco)</span>
            </button>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => resetTelemetryData()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Zerar Contadores de Teste
            </button>
          </div>
        </div>

        {/* Technical Architecture Notes */}
        <div className="bg-slate-900 rounded-3xl p-6 text-slate-200 shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0 border border-blue-400/30">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Como Funciona a Otimização
              </h3>
              <p className="text-xs text-slate-400">
                Arquitetura de telemetria zero-cost para o banco de dados.
              </p>
            </div>
          </div>

          <ul className="text-xs text-slate-300 space-y-2 leading-relaxed pt-1">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Sem requisições extras ao Firestore:</strong> O rastreamento de leituras ocorre em memória e no cache do navegador (LocalStorage), sem realizar nenhuma consulta adicional.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Cache Inteligente Ativo:</strong> Todos os módulos utilizam sincronização compartilhada com deduplicação para que múltiplos componentes não repitam leituras do banco.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Reinício Automático Diário:</strong> Os contadores de cota diária são reiniciados automaticamente à meia-noite, acumulando os dados mensais para relatórios.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
