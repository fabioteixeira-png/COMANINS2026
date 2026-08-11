import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, PieChart, FileText, Filter, 
  Briefcase, Landmark, CreditCard, RefreshCw, FileCheck, Building2,
  Activity, Users, ClipboardCheck, ShieldCheck, Bell, Shield, ShieldAlert, Trash2, HelpCircle
} from 'lucide-react';

import { 
  syncFinanceTransactions, 
  syncFinanceContracts, 
  syncFinanceMeasurements, 
  deleteFinanceTransaction, 
  deleteFinanceContract, 
  deleteFinanceMeasurement 
} from '../lib/firebase';

import DashboardFinanceiro from './finance/DashboardFinanceiro';
import ContasPagar from './finance/ContasPagar';
import ContasReceber from './finance/ContasReceber';
import FinanceContratos from './finance/FinanceContratos';
import FinanceMedicoes from './finance/FinanceMedicoes';
import FluxoCaixa from './finance/FluxoCaixa';
import ConciliacaoBancaria from './finance/ConciliacaoBancaria';
import OrcamentoPrevistoRealizado from './finance/OrcamentoPrevistoRealizado';
import EmprestimosFinanciamentos from './finance/EmprestimosFinanciamentos';
import CartoesCorporativos from './finance/CartoesCorporativos';
import ReembolsosAdiantamentos from './finance/ReembolsosAdiantamentos';
import RelatoriosFinanceiros from './finance/RelatoriosFinanceiros';
import CadastrosFinanceiros from './finance/CadastrosFinanceiros';
import CentralAprovacoes from './finance/CentralAprovacoes';
import AuditoriaAlteracoes from './finance/AuditoriaAlteracoes';
import CustosPessoalContrato from './finance/CustosPessoalContrato';
import RateioCustos from './finance/RateioCustos';
import AtivosInvestimentos from './finance/AtivosInvestimentos';
import TributosRetencoes from './finance/TributosRetencoes';
import AlertasNotificacoes from './finance/AlertasNotificacoes';

interface FinanceManagementProps {
  requestAdminDelete?: (type: string, id: string, name: string) => void;
}
export default function FinanceManagement({ requestAdminDelete }: FinanceManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState('dashboard');
  
  // Operational Mode state saved in localStorage (defaults to homologado/production)
  const [operationMode, setOperationMode] = useState<'homologado' | 'simulacao'>(() => {
    return (localStorage.getItem('finance_op_mode') as 'homologado' | 'simulacao') || 'homologado';
  });

  // State to track Firestore records for the wiper function
  const [transactions, setTransactions] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);

  useEffect(() => {
    const unsubTx = syncFinanceTransactions(setTransactions);
    const unsubContracts = syncFinanceContracts(setContracts);
    const unsubMeasurements = syncFinanceMeasurements(setMeasurements);
    return () => {
      unsubTx();
      unsubContracts();
      unsubMeasurements();
    };
  }, []);

  const handleToggleMode = (mode: 'homologado' | 'simulacao') => {
    setOperationMode(mode);
    localStorage.setItem('finance_op_mode', mode);
  };

  const handleClearDatabase = async () => {
    if (confirm("⚠️ ALERTA DE HOMOLOGAÇÃO: Tem certeza absoluta que deseja excluir TODOS os lançamentos do banco de dados (Transações, Contratos e Medições)?\n\nEsta ação excluirá permanentemente todos os registros atuais do Firestore para que você inicie em produção com uma base 100% limpa. Essa ação NÃO pode ser desfeita!")) {
      try {
        let count = 0;
        for (const tx of transactions) {
          await deleteFinanceTransaction(tx.id);
          count++;
        }
        for (const c of contracts) {
          await deleteFinanceContract(c.id);
          count++;
        }
        for (const m of measurements) {
          await deleteFinanceMeasurement(m.id);
          count++;
        }
        alert(`✓ Limpeza concluída! ${count} registros foram excluídos do Firestore. Agora seu banco de dados está limpo e homologado para uso corporativo.`);
      } catch (err) {
        console.error("Erro ao limpar dados:", err);
        alert("Erro ao limpar dados do Firestore. Verifique suas conexões e tente novamente.");
      }
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Financeiro', icon: <PieChart className="h-4 w-4" /> },
    { id: 'pagar', label: 'Contas a Pagar', icon: <TrendingDown className="h-4 w-4" /> },
    { id: 'receber', label: 'Contas a Receber', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'medicoes', label: 'Medições e Faturamento', icon: <FileCheck className="h-4 w-4" /> },
    { id: 'fluxo', label: 'Fluxo de Caixa', icon: <RefreshCw className="h-4 w-4" /> },
    { id: 'conciliacao', label: 'Conciliação Bancária', icon: <Landmark className="h-4 w-4" /> },
    { id: 'contratos', label: 'Contratos e Centros de Custo', icon: <Briefcase className="h-4 w-4" /> },
    { id: 'orcamento', label: 'Previsto x Realizado', icon: <Activity className="h-4 w-4" /> },
    { id: 'emprestimos', label: 'Empréstimos', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'cartoes', label: 'Cartões Corporativos', icon: <CreditCard className="h-4 w-4" /> },
    { id: 'reembolsos', label: 'Reembolsos', icon: <FileText className="h-4 w-4" /> },
    { id: 'relatorios', label: 'Relatórios', icon: <Filter className="h-4 w-4" /> },
    { id: 'cadastros', label: 'Cadastros Financeiros', icon: <Building2 className="h-4 w-4" /> },
    { id: 'aprovacoes', label: 'Aprovações', icon: <ClipboardCheck className="h-4 w-4" /> },
    { id: 'auditoria', label: 'Auditoria de Alterações', icon: <ShieldCheck className="h-4 w-4" /> },
    { id: 'pessoal', label: 'Custos de Pessoal', icon: <Users className="h-4 w-4" /> },
    { id: 'rateio', label: 'Rateio de Custos', icon: <RefreshCw className="h-4 w-4" /> },
    { id: 'ativos', label: 'Ativos e Depreciação', icon: <TrendingDown className="h-4 w-4" /> },
    { id: 'tributos', label: 'Tributos e Retenções', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'alertas', label: 'Alertas e Avisos', icon: <Bell className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header and Controller Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-display font-extrabold text-slate-900 flex items-center space-x-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            <span>Gestão Financeira & Diretoria</span>
          </h2>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Controle integrado de faturamento, liquidez, centros de custo e apurações por contrato.
          </p>
          
          {/* Active status indicator */}
          <div className="mt-3 flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Modo do Sistema:</span>
            {operationMode === 'homologado' ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                🟢 HOMOLOGADO (DADOS REAIS FIRESTORE)
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                🔵 SIMULAÇÃO (DADOS DE TESTE)
              </span>
            )}
          </div>
        </div>

        {/* Operational Switch & database tools */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => handleToggleMode('homologado')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                operationMode === 'homologado' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Homologado
            </button>
            <button
              onClick={() => handleToggleMode('simulacao')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                operationMode === 'simulacao' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Simulação
            </button>
          </div>

          {operationMode === 'homologado' && (
            <button
              onClick={handleClearDatabase}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm"
              title="Limpar todos os dados de testes do Firestore para homologação"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-600" />
              <span>Limpar Banco de Teste</span>
            </button>
          )}
        </div>
      </div>

      {/* Information Alert Box */}
      {operationMode === 'homologado' ? (
        <div className="bg-blue-50/50 border border-blue-200 p-4 rounded-xl flex items-start space-x-3">
          <Shield className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 font-medium leading-relaxed">
            <span className="font-extrabold block mb-0.5">Ambiente de Produção Homologado Ativo</span>
            O sistema está lendo e gravando informações reais diretamente no banco de dados Firestore da corporação. 
            Clique em <strong className="font-bold">Cadastros Financeiros</strong> para configurar as contas bancárias e categorias contábeis padrão se for a primeira inicialização.
          </div>
        </div>
      ) : (
        <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-xl flex items-start space-x-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 font-medium leading-relaxed">
            <span className="font-extrabold block mb-0.5">Modo de Simulação / Treinamento Ativo</span>
            O sistema está utilizando dados fictícios para fins de apresentação, demonstração comercial ou treinamento de novos usuários da diretoria. 
            Nenhuma ação neste modo alterará dados reais de produção.
          </div>
        </div>
      )}

      {/* Horizontal Scrollable Menu */}
      <div className="flex overflow-x-auto pb-2 space-x-2 border-b border-slate-200 hide-scrollbar">
        {menuItems.map(item => (
          <button 
            key={item.id}
            onClick={() => setActiveSubTab(item.id)} 
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-t-lg font-bold text-xs whitespace-nowrap transition-colors border-b-2 ${
              activeSubTab === item.id 
                ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Conditional Rendering of all submodules */}
      <div className="space-y-6">
        {activeSubTab === 'dashboard' && <div className="animate-fade-in"><DashboardFinanceiro /></div>}
        {activeSubTab === 'pagar' && <div className="animate-fade-in"><ContasPagar requestAdminDelete={requestAdminDelete} /></div>}
        {activeSubTab === 'receber' && <div className="animate-fade-in"><ContasReceber requestAdminDelete={requestAdminDelete} /></div>}
        {activeSubTab === 'contratos' && <div className="animate-fade-in"><FinanceContratos requestAdminDelete={requestAdminDelete} /></div>}
        {activeSubTab === 'medicoes' && <div className="animate-fade-in"><FinanceMedicoes requestAdminDelete={requestAdminDelete} /></div>}
        {activeSubTab === 'fluxo' && <div className="animate-fade-in"><FluxoCaixa /></div>}
        {activeSubTab === 'conciliacao' && <div className="animate-fade-in"><ConciliacaoBancaria /></div>}
        {activeSubTab === 'orcamento' && <div className="animate-fade-in"><OrcamentoPrevistoRealizado /></div>}
        {activeSubTab === 'emprestimos' && <div className="animate-fade-in"><EmprestimosFinanciamentos /></div>}
        {activeSubTab === 'cartoes' && <div className="animate-fade-in"><CartoesCorporativos /></div>}
        {activeSubTab === 'reembolsos' && <div className="animate-fade-in"><ReembolsosAdiantamentos /></div>}
        {activeSubTab === 'relatorios' && <div className="animate-fade-in"><RelatoriosFinanceiros /></div>}
        {activeSubTab === 'cadastros' && <div className="animate-fade-in"><CadastrosFinanceiros requestAdminDelete={requestAdminDelete} /></div>}
        {activeSubTab === 'aprovacoes' && <div className="animate-fade-in"><CentralAprovacoes /></div>}
        {activeSubTab === 'auditoria' && <div className="animate-fade-in"><AuditoriaAlteracoes /></div>}
        {activeSubTab === 'pessoal' && <div className="animate-fade-in"><CustosPessoalContrato /></div>}
        {activeSubTab === 'rateio' && <div className="animate-fade-in"><RateioCustos /></div>}
        {activeSubTab === 'ativos' && <div className="animate-fade-in"><AtivosInvestimentos /></div>}
        {activeSubTab === 'tributos' && <div className="animate-fade-in"><TributosRetencoes /></div>}
        {activeSubTab === 'alertas' && <div className="animate-fade-in"><AlertasNotificacoes /></div>}
      </div>
    </div>
  );
}
