import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Landmark, BookOpen, Users, Settings,
  Trash2, Edit, CheckCircle, HelpCircle, X, ShieldAlert
} from 'lucide-react';
import { syncFinanceCollection, addFinanceDoc, deleteFinanceDoc } from '../../lib/firebase';
import FinanceSpreadsheetActions from './FinanceSpreadsheetActions';

interface BankAccount {
  id: string;
  bank: string;
  agency: string;
  account: string;
  type: string;
  balance: number;
}

interface Category {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
}

interface CadastrosFinanceirosProps {
  requestAdminDelete?: (type: string, id: string, name: string) => void;
  canEdit?: boolean;
}

export default function CadastrosFinanceiros({ requestAdminDelete, canEdit = false }: CadastrosFinanceirosProps) {
  const [activeTab, setActiveTab] = useState<'contas' | 'plano'>('contas');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Firestore Sync States
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for Account
  const [bankName, setBankName] = useState('');
  const [agencyNum, setAgencyNum] = useState('');
  const [accountNum, setAccountNum] = useState('');
  const [accountType, setAccountType] = useState('Corrente');
  const [initialBalance, setInitialBalance] = useState('');

  // Form states for Category
  const [catCode, setCatCode] = useState('');
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState('Receita');

  useEffect(() => {
    setLoading(true);
    const unsubAccounts = syncFinanceCollection<BankAccount>('financeBankAccounts', (data) => {
      setBankAccounts(data);
    }, 1000);
    const unsubCategories = syncFinanceCollection<Category>('financeCategories', (data) => {
      setCategories(data);
      setLoading(false);
    }, 1000);

    return () => {
      unsubAccounts();
      unsubCategories();
    };
  }, []);

  // Inicialização segura apenas do plano de contas. Nenhum banco, agência,
  // conta ou saldo fictício é criado automaticamente em produção.
  const handleSeedDefaults = async () => {
    if (!canEdit) return;
    if (categories.length > 0) {
      alert('O plano de contas já possui categorias. A inicialização automática foi cancelada para evitar duplicidades.');
      return;
    }
    try {
      setLoading(true);
      const defaultCategories = [
        { code: '1.01', name: 'Faturamento de Serviços', type: 'Receita', status: 'Ativo' },
        { code: '2.01', name: 'Mão de Obra', type: 'Custo Direto', status: 'Ativo' },
        { code: '2.02', name: 'Materiais e Consumíveis', type: 'Custo Direto', status: 'Ativo' },
        { code: '2.03', name: 'Ferramentas e Equipamentos', type: 'Custo Direto', status: 'Ativo' },
        { code: '3.01', name: 'Despesas Administrativas', type: 'Despesa Indireta', status: 'Ativo' },
        { code: '3.02', name: 'Frota e Deslocamentos', type: 'Despesa Indireta', status: 'Ativo' },
        { code: '3.03', name: 'Impostos e Taxas', type: 'Despesa Indireta', status: 'Ativo' },
      ];
      for (const cat of defaultCategories) await addFinanceDoc('financeCategories', cat);
      alert('Plano de contas básico criado sem contas bancárias ou saldos fictícios. Cadastre as contas reais manualmente.');
    } catch (error) {
      console.error('Error seeding finance categories:', error);
      alert('Erro ao inicializar o plano de contas.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!bankName.trim() || !accountNum.trim()) return;

    try {
      const balanceVal = parseFloat(initialBalance) || 0;
      await addFinanceDoc('financeBankAccounts', {
        bank: bankName.trim(),
        agency: agencyNum.trim(),
        account: accountNum.trim(),
        type: accountType,
        balance: balanceVal,
      });
      setShowAccountModal(false);
      setBankName('');
      setAgencyNum('');
      setAccountNum('');
      setInitialBalance('');
      alert('✓ Conta corrente cadastrada com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao cadastrar conta.');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!catCode.trim() || !catName.trim()) return;

    try {
      await addFinanceDoc('financeCategories', {
        code: catCode.trim(),
        name: catName.trim(),
        type: catType,
        status: 'Ativo',
      });
      setShowCategoryModal(false);
      setCatCode('');
      setCatName('');
      alert('✓ Conta contábil cadastrada com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao cadastrar conta contábil.');
    }
  };

  const handleDeleteAccount = async (banco: any) => {
    if (!canEdit) return;
    if (requestAdminDelete) {
      requestAdminDelete('finance_bank', banco.id, `Conta Bancária: ${banco.bank}`);
    } else {
      if (confirm('Tem certeza que deseja excluir esta conta bancária? Lançamentos vinculados perderão a referência.')) {
        await deleteFinanceDoc('financeBankAccounts', banco.id);
      }
    }
  };

  const handleDeleteCategory = async (cat: any) => {
    if (!canEdit) return;
    if (requestAdminDelete) {
      requestAdminDelete('finance_category', cat.id, `Categoria: ${cat.name}`);
    } else {
      if (confirm('Tem certeza que deseja excluir esta categoria do Plano de Contas?')) {
        await deleteFinanceDoc('financeCategories', cat.id);
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header Tabs */}
      <div className="border-b border-slate-200 bg-slate-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('contas')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${activeTab === 'contas' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-700'}`}
          >
            <Landmark className="h-4 w-4" />
            <span>Contas Bancárias Ativas</span>
          </button>

          <button
            onClick={() => setActiveTab('plano')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${activeTab === 'plano' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-700'}`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Estrutura Plano de Contas</span>
          </button>
        </div>

        {/* Empty database assistance banner */}
        {canEdit && bankAccounts.length === 0 && categories.length === 0 && !loading && (
          <button
            onClick={handleSeedDefaults}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-colors"
          >
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <span>Inicializar Plano de Contas Básico</span>
          </button>
        )}
      </div>

      {/* Main Grid View */}
      {activeTab === 'contas' && (
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Contas e Caixas de Movimentação</h4>
              <p className="text-xs text-slate-500 font-medium">Cadastro de agências, contas correntes e saldos iniciais de abertura.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FinanceSpreadsheetActions entity="bankAccounts" canEdit={canEdit} exportRows={bankAccounts} compact />
              {canEdit && (
              <button
              onClick={() => {
                setBankName('');
                setAgencyNum('');
                setAccountNum('');
                setInitialBalance('');
                setShowAccountModal(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-sm transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Adicionar Conta</span>
            </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-500 text-sm">Carregando contas...</div>
          ) : bankAccounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bankAccounts.map(account => (
                <div key={account.id} className="p-5 rounded-xl border border-slate-200 bg-slate-50/20 relative group hover:shadow-sm transition-shadow">
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteAccount(account)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100 transition-colors"
                      title="Excluir Conta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-bold text-slate-800 text-sm">{account.bank}</h5>
                      <p className="text-xs text-slate-500 font-semibold font-mono">AG: {account.agency} • CC: {account.account}</p>
                    </div>
                    <Landmark className="h-5 w-5 text-blue-500 mr-8" />
                  </div>
                  <div className="mt-4 flex justify-between items-baseline border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-400 font-semibold">Saldo Inicial / Atual:</span>
                    <span className="font-mono font-extrabold text-slate-800 text-base">R$ {account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-500 font-medium text-sm">
              Nenhuma conta corrente cadastrada. Clique em "Adicionar Conta" ou inicialize a estrutura padrão acima.
            </div>
          )}
        </div>
      )}

      {activeTab === 'plano' && (
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Estrutura de Plano de Contas (Plano Referencial)</h4>
              <p className="text-xs text-slate-500 font-medium">Hierarquização de despesas e receitas para apuração contábil correta do DRE Gerencial.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FinanceSpreadsheetActions entity="categories" canEdit={canEdit} exportRows={categories} compact />
              {canEdit && (
              <button
                onClick={() => {
                  setCatCode('');
                  setCatName('');
                  setCatType('Receita');
                  setShowCategoryModal(true);
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-sm transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nova Categoria</span>
              </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-500 text-sm">Carregando plano de contas...</div>
          ) : categories.length > 0 ? (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-6 py-3">Código Estrutural</th>
                    <th className="px-6 py-3">Nomenclatura da Conta</th>
                    <th className="px-6 py-3">Grupo Contábil</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {categories.sort((a,b) => a.code.localeCompare(b.code)).map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 text-slate-700 font-bold font-mono">{cat.code}</td>
                      <td className="px-6 py-3 text-slate-800">{cat.name}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          cat.type === 'Receita'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : cat.type === 'Custo Direto'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}>
                          {cat.type}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-emerald-600">✓ Ativo</td>
                      <td className="px-6 py-3 text-center">
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors"
                            title="Excluir Categoria"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl text-slate-500 font-medium text-sm">
              Nenhuma categoria contábil cadastrada. Clique em "Nova Categoria" ou inicialize a estrutura padrão acima.
            </div>
          )}
        </div>
      )}

      {/* New Account Modal */}
      {showAccountModal && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h4 className="text-base font-extrabold text-slate-900">Nova Conta Corrente</h4>
              <button onClick={() => setShowAccountModal(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleAddAccount} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nome do Banco / Instituição *</label>
                <input type="text" required value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Banco Itaú S.A." className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-royal-blue" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Agência</label>
                  <input type="text" value={agencyNum} onChange={(e) => setAgencyNum(e.target.value)} placeholder="e.g. 3840" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-royal-blue" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Conta *</label>
                  <input type="text" required value={accountNum} onChange={(e) => setAccountNum(e.target.value)} placeholder="e.g. 99201-1" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-royal-blue font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tipo de Conta</label>
                <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-royal-blue">
                  <option value="Corrente">Conta Corrente</option>
                  <option value="Poupança">Conta Poupança</option>
                  <option value="Caixa Interno">Caixa Físico / Interno</option>
                  <option value="Investimento">Aplicação Financeira</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Saldo de Abertura (R$)</label>
                <input type="number" step="0.01" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} placeholder="0.00" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-royal-blue font-mono" />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowAccountModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors">Salvar Conta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Category Modal */}
      {showCategoryModal && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h4 className="text-base font-extrabold text-slate-900">Nova Categoria Contábil</h4>
              <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleAddCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Código Estrutural *</label>
                <input type="text" required value={catCode} onChange={(e) => setCatCode(e.target.value)} placeholder="Ex: 3.04" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-royal-blue font-mono" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nome da Conta / Categoria *</label>
                <input type="text" required value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Ex: Serviços de Nuvem / TI" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-royal-blue" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Grupo de Classificação</label>
                <select value={catType} onChange={(e) => setCatType(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-royal-blue">
                  <option value="Receita">Receita (Entrada)</option>
                  <option value="Custo Direto">Custo Direto (Mão de obra / Equipamentos do contrato)</option>
                  <option value="Despesa Indireta">Despesa Indireta (Administrativo / Sede / Suporte)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors">Salvar Categoria</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
