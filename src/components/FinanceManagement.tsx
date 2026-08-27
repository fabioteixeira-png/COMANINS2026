import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, PieChart, FileText, Filter,
  Briefcase, Landmark, CreditCard, RefreshCw, FileCheck, Building2,
  Activity, Users, ClipboardCheck, ShieldCheck, Bell, Shield, ShieldAlert, Trash2, HelpCircle, AlertTriangle
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
  canEdit?: boolean;
  currentUser?: { id?: string; name?: string; username?: string } | null;
}
export default function FinanceManagement({ requestAdminDelete, canEdit = false, currentUser }: FinanceManagementProps) {
  const currentUserName = String(currentUser?.name || currentUser?.username || '').trim();
  const [activeSubTab, setActiveSubTab] = useState('dashboard');

  // Operational Mode state saved in localStorage (defaults to homologado/production)
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

      const menuItems = [
    { id: 'dashboard', label: 'Dashboard Financeiro', icon: <PieChart className="h-4 w-4" />, ready: true },
    { id: 'pagar', label: 'Contas a Pagar', icon: <TrendingDown className="h-4 w-4" />, ready: true },
    { id: 'receber', label: 'Contas a Receber', icon: <TrendingUp className="h-4 w-4" />, ready: true },
    { id: 'medicoes', label: 'Medições e Faturamento', icon: <FileCheck className="h-4 w-4" />, ready: true },
    { id: 'fluxo', label: 'Fluxo de Caixa', icon: <RefreshCw className="h-4 w-4" />, ready: true },
    { id: 'contratos', label: 'Contratos e Centros de Custo', icon: <Briefcase className="h-4 w-4" />, ready: true },
    { id: 'cadastros', label: 'Cadastros Financeiros', icon: <Building2 className="h-4 w-4" />, ready: true },
    { id: 'conciliacao', label: 'Conciliação Bancária', icon: <Landmark className="h-4 w-4" />, ready: false },
    { id: 'orcamento', label: 'Previsto x Realizado', icon: <Activity className="h-4 w-4" />, ready: false },
    { id: 'emprestimos', label: 'Empréstimos', icon: <DollarSign className="h-4 w-4" />, ready: false },
    { id: 'cartoes', label: 'Cartões Corporativos', icon: <CreditCard className="h-4 w-4" />, ready: false },
    { id: 'reembolsos', label: 'Reembolsos', icon: <FileText className="h-4 w-4" />, ready: false },
    { id: 'relatorios', label: 'Relatórios', icon: <Filter className="h-4 w-4" />, ready: false },
    { id: 'aprovacoes', label: 'Aprovações', icon: <ClipboardCheck className="h-4 w-4" />, ready: false },
    { id: 'auditoria', label: 'Auditoria de Alterações', icon: <ShieldCheck className="h-4 w-4" />, ready: false },
    { id: 'pessoal', label: 'Custos de Pessoal', icon: <Users className="h-4 w-4" />, ready: false },
    { id: 'rateio', label: 'Rateio de Custos', icon: <RefreshCw className="h-4 w-4" />, ready: false },
    { id: 'ativos', label: 'Ativos e Depreciação', icon: <TrendingDown className="h-4 w-4" />, ready: false },
    { id: 'tributos', label: 'Tributos e Retenções', icon: <DollarSign className="h-4 w-4" />, ready: false },
    { id: 'alertas', label: 'Alertas e Avisos', icon: <Bell className="h-4 w-4" />, ready: false },
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
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              🟢 AMBIENTE DE PRODUÇÃO ATIVO
            </span>
          </div>
        </div>
      </div>

      {/* Information Alert Box */}
      <div className="bg-blue-50/50 border border-blue-200 p-4 rounded-xl flex items-start space-x-3">
        <Shield className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 font-medium leading-relaxed">
          <span className="font-extrabold block mb-0.5">Produção em Tempo Real</span>
          O sistema está lendo e gravando informações reais diretamente no banco de dados corporativo.
          Clique em <strong className="font-bold">Cadastros Financeiros</strong> para configurar contas bancárias e categorias padrão, se necessário.
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 text-xs text-amber-900">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
        <div><strong>Liberação financeira controlada.</strong> Contas a Pagar, Contas a Receber, Medições, Fluxo, Contratos e Cadastros usam dados reais. Planilhas ficam dentro de cada atividade: módulos de cadastro permitem Modelo + Importar + Exportar; Dashboard e Fluxo de Caixa são calculados e, por segurança, permitem somente Exportar. Submódulos que ainda continham valores ou rotinas demonstrativas permanecem bloqueados como “Em implantação” para impedir uso contábil indevido.</div>
      </div>

      {/* Horizontal Scrollable Menu */}
      <div className="flex overflow-x-auto pb-2 space-x-2 border-b border-slate-200 hide-scrollbar">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => item.ready && setActiveSubTab(item.id)}
            disabled={!item.ready}
            title={!item.ready ? 'Módulo temporariamente indisponível: ainda contém lógica demonstrativa e será liberado após validação operacional.' : undefined}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-t-lg font-bold text-xs whitespace-nowrap transition-colors border-b-2 ${!item.ready ? 'opacity-45 cursor-not-allowed bg-slate-50 text-slate-400 border-transparent' :
              activeSubTab === item.id
                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {item.icon}
            <span>{item.label}{!item.ready ? ' · Em implantação' : ''}</span>
          </button>
        ))}
      </div>

      {/* Conditional Rendering of all submodules */}
      <div className="space-y-6">
        {activeSubTab === 'dashboard' && <div className="animate-fade-in"><DashboardFinanceiro /></div>}
        {activeSubTab === 'pagar' && <div className="animate-fade-in"><ContasPagar requestAdminDelete={requestAdminDelete} canEdit={canEdit} currentUserName={currentUserName} /></div>}
        {activeSubTab === 'receber' && <div className="animate-fade-in"><ContasReceber requestAdminDelete={requestAdminDelete} canEdit={canEdit} currentUserName={currentUserName} /></div>}
        {activeSubTab === 'contratos' && <div className="animate-fade-in"><FinanceContratos requestAdminDelete={requestAdminDelete} canEdit={canEdit} /></div>}
        {activeSubTab === 'medicoes' && <div className="animate-fade-in"><FinanceMedicoes requestAdminDelete={requestAdminDelete} canEdit={canEdit} /></div>}
        {activeSubTab === 'fluxo' && <div className="animate-fade-in"><FluxoCaixa /></div>}
        {activeSubTab === 'conciliacao' && <div className="animate-fade-in"><ConciliacaoBancaria /></div>}
        {activeSubTab === 'orcamento' && <div className="animate-fade-in"><OrcamentoPrevistoRealizado /></div>}
        {activeSubTab === 'emprestimos' && <div className="animate-fade-in"><EmprestimosFinanciamentos /></div>}
        {activeSubTab === 'cartoes' && <div className="animate-fade-in"><CartoesCorporativos /></div>}
        {activeSubTab === 'reembolsos' && <div className="animate-fade-in"><ReembolsosAdiantamentos /></div>}
        {activeSubTab === 'relatorios' && <div className="animate-fade-in"><RelatoriosFinanceiros /></div>}
        {activeSubTab === 'cadastros' && <div className="animate-fade-in"><CadastrosFinanceiros requestAdminDelete={requestAdminDelete} canEdit={canEdit} /></div>}
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
