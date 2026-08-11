import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Edit, Trash2, CheckCircle, Clock, AlertCircle, 
  X, FileText, Upload, Landmark, DollarSign, Eye, CreditCard 
} from 'lucide-react';
import { FinanceTransaction } from '../../types';
import { syncFinanceTransactions, deleteFinanceTransaction, addFinanceTransaction, updateFinanceTransaction } from '../../lib/firebase';

export default function ContasPagar({ requestAdminDelete }: { requestAdminDelete?: (type: string, id: string, name: string) => void }) {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [costCenterFilter, setCostCenterFilter] = useState('todos');

  // Modal control
  const [showFormModal, setShowFormModal] = useState(false);
  const [showBajaModal, setShowBajaModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<FinanceTransaction | null>(null);

  // Form states
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('Pessoal');
  const [costCenter, setCostCenter] = useState('Sede (Corporativo)');
  const [contactName, setContactName] = useState('');
  const [contactDocument, setContactDocument] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [bankAccount, setBankAccount] = useState('Itaú Sede');
  const [installments, setInstallments] = useState(1);
  const [notes, setNotes] = useState('');
  const [costType, setCostType] = useState('Direto');

  // Baja (payment) states
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [amountPaid, setAmountPaid] = useState(0);
  const [bajaBankAccount, setBajaBankAccount] = useState('Itaú Sede');
  const [bajaComprovante, setBajaComprovante] = useState('comprovante_pix.pdf');

  useEffect(() => {
    const unsubscribe = syncFinanceTransactions((data) => {
      setTransactions(data.filter(t => t.type === 'despesa'));
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (tx: FinanceTransaction) => {
    if (requestAdminDelete) {
      requestAdminDelete('finance_transaction', tx.id, `Despesa: ${tx.description}`);
    } else {
      if (confirm('Tem certeza que deseja excluir esta despesa do contas a pagar?')) {
        await deleteFinanceTransaction(tx.id);
      }
    }
  };

  const handleOpenForm = (tx: FinanceTransaction | null) => {
    if (tx) {
      setSelectedTx(tx);
      setDescription(tx.description);
      setAmount(tx.amount);
      setDueDate(tx.dueDate);
      setCategory(tx.category);
      setCostCenter(tx.costCenter);
      setContactName(tx.contactName);
      setContactDocument(tx.contactDocument);
      setDocumentNumber(tx.documentNumber);
      setPaymentMethod(tx.paymentMethod);
      setBankAccount(tx.bankAccount);
      setInstallments(tx.installments || 1);
      setNotes(tx.notes || '');
    } else {
      setSelectedTx(null);
      setDescription('');
      setAmount(0);
      setDueDate(new Date().toISOString().split('T')[0]);
      setCategory('Sede');
      setCostCenter('Sede (Corporativo)');
      setContactName('');
      setContactDocument('');
      setDocumentNumber('');
      setPaymentMethod('Pix');
      setBankAccount('Itaú Sede');
      setInstallments(1);
      setNotes('');
    }
    setShowFormModal(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Omit<FinanceTransaction, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'despesa',
      description,
      amount,
      date: new Date().toISOString().split('T')[0],
      dueDate,
      status: selectedTx ? selectedTx.status : 'pendente',
      category,
      costCenter,
      contactName,
      contactDocument,
      documentNumber,
      paymentMethod,
      bankAccount,
      installments,
      createdBy: 'Administrador',
      notes,
    };

    if (selectedTx) {
      await updateFinanceTransaction(selectedTx.id, data);
    } else {
      await addFinanceTransaction(data);
    }
    setShowFormModal(false);
  };

  const handleOpenBaja = (tx: FinanceTransaction) => {
    setSelectedTx(tx);
    setAmountPaid(tx.amount);
    setShowBajaModal(true);
  };

  const handleSaveBaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;

    const remaining = selectedTx.amount - amountPaid;
    const isPartial = remaining > 0;

    await updateFinanceTransaction(selectedTx.id, {
      status: isPartial ? 'pendente' : 'pago',
      amount: isPartial ? remaining : selectedTx.amount, // keeping outstanding or whole
      notes: `${selectedTx.notes || ''} \n [Baixa ${isPartial ? 'Parcial' : 'Total'} de R$ ${amountPaid} em ${paymentDate} via ${bajaBankAccount}]`.trim()
    });

    setShowBajaModal(false);
  };

  // Filter list
  const filtered = transactions.filter(t => {
    const matchesSearch = t.contactName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || t.status === statusFilter;
    const matchesCostCenter = costCenterFilter === 'todos' || t.costCenter === costCenterFilter;
    return matchesSearch && matchesStatus && matchesCostCenter;
  });

  const costCenters = Array.from(new Set(transactions.map(t => t.costCenter).filter(Boolean)));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header Controls */}
      <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Contas a Pagar</h3>
          <p className="text-sm text-slate-500">Gestão e liquidação de obrigações, fornecedores e rateios corporativos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar fornecedor/serviço..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue outline-none" 
            />
          </div>

          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue"
          >
            <option value="todos">Todos Status</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="atrasado">Atrasado</option>
          </select>

          <select 
            value={costCenterFilter}
            onChange={(e) => setCostCenterFilter(e.target.value)}
            className="border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue"
          >
            <option value="todos">Todos C. Custos</option>
            {costCenters.map(cc => <option key={cc} value={cc}>{cc}</option>)}
          </select>

          <button 
            onClick={() => handleOpenForm(null)} 
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold flex items-center space-x-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Despesa</span>
          </button>
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="px-6 py-3 font-semibold">Fornecedor / Descrição</th>
              <th className="px-6 py-3 font-semibold">Grupo de Despesa</th>
              <th className="px-6 py-3 font-semibold">Vencimento</th>
              <th className="px-6 py-3 font-semibold text-right">Valor Global</th>
              <th className="px-6 py-3 font-semibold text-center">Status</th>
              <th className="px-6 py-3 font-semibold text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length > 0 ? filtered.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">{item.contactName}</div>
                  <div className="text-xs text-slate-500">{item.description}</div>
                  <div className="text-[10px] text-royal-blue mt-0.5 font-bold uppercase">{item.costCenter}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
                    {item.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {new Date(item.dueDate).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">
                  R$ {item.amount.toFixed(2).replace('.', ',')}
                </td>
                <td className="px-6 py-4 text-center">
                  {item.status === 'pago' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle className="h-3 w-3 mr-1" /> Pago</span>}
                  {item.status === 'pendente' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" /> Pendente</span>}
                  {item.status === 'atrasado' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800"><AlertCircle className="h-3 w-3 mr-1" /> Atrasado</span>}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    {item.status !== 'pago' && (
                      <button 
                        onClick={() => handleOpenBaja(item)}
                        className="p-1 text-emerald-600 hover:text-emerald-800 font-bold text-xs border border-emerald-200 rounded bg-emerald-50 px-2 py-1 flex items-center space-x-1"
                        title="Efetuar Baixa de Pagamento"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Baixar</span>
                      </button>
                    )}
                    <button onClick={() => handleOpenForm(item)} className="p-1 text-slate-400 hover:text-royal-blue"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  Nenhuma despesa localizada com os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bill Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-lg font-bold text-slate-800">{selectedTx ? 'Editar Despesa' : 'Registrar Lançamento a Pagar'}</h4>
              <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSaveForm} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Fornecedor / Favorecido *</label>
                  <input type="text" required value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. Fluke Corp" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">CNPJ ou CPF</label>
                  <input type="text" value={contactDocument} onChange={(e) => setContactDocument(e.target.value)} placeholder="00.000.000/0001-00" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Descrição do Serviço / Compra *</label>
                  <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Calibração de Padrões RBC" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Grupo de Despesa *</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue">
                    <option value="Pessoal">Pessoal (Salários, Encargos)</option>
                    <option value="Benefícios">Benefícios (VAs, VTs)</option>
                    <option value="Operação">Operação (Materiais, Calibração)</option>
                    <option value="Frota">Frota (Combustível, Manutenção)</option>
                    <option value="Sede">Sede (Aluguel, Luz, Internet)</option>
                    <option value="Administrativo">Administrativo (Marketing, Softwares)</option>
                    <option value="Tributos">Tributos e Impostos</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Centro de Custo de Alocação *</label>
                  <select value={costCenter} onChange={(e) => setCostCenter(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue">
                    <option value="Sede (Corporativo)">Sede (Corporativo)</option>
                    <option value="Laboratório Metrológico">Laboratório Metrológico</option>
                    <option value="Contrato Braskem">Contrato Braskem</option>
                    <option value="Contrato Acelen">Contrato Acelen</option>
                    <option value="Frota corporativa">Frota corporativa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Tipo de Custo</label>
                  <select value={costType} onChange={(e) => setCostType(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue">
                    <option value="Direto">Direto (Exclusivo do Contrato)</option>
                    <option value="Indireto">Indireto / Rateável</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Valor Bruto (R$) *</label>
                  <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Data de Vencimento *</label>
                  <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nº Nota Fiscal (NF) / Boleto</label>
                  <input type="text" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="NF-12345" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Forma de Pagamento Prevista</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue">
                    <option value="Pix">Pix</option>
                    <option value="Boleto">Boleto</option>
                    <option value="TED">TED</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão Corporativo">Cartão Corporativo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Conta Bancária de Origem</label>
                  <input type="text" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="Bradesco Sede" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Observações adicionais / Memória de cálculo</label>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue"></textarea>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-600">Comprovante de Despesa / Contrato</span>
                </div>
                <button type="button" className="text-xs font-bold text-royal-blue hover:underline flex items-center space-x-1">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Anexar PDF/Imagem</span>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowFormModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-royal-blue hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm">Salvar Registro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Baja / Payment Modal */}
      {showBajaModal && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-lg font-bold text-slate-800">Baixar Título / Efetuar Baixa</h4>
              <button onClick={() => setShowBajaModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSaveBaja} className="p-6 space-y-4">
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-slate-700 space-y-1">
                <p><strong>Favorecido:</strong> {selectedTx.contactName}</p>
                <p><strong>Descrição:</strong> {selectedTx.description}</p>
                <p><strong>Valor Pendente:</strong> R$ {selectedTx.amount.toFixed(2).replace('.', ',')}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Valor Efetivamente Pago (R$) *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  value={amountPaid} 
                  onChange={(e) => setAmountPaid(Number(e.target.value))} 
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" 
                />
                <span className="text-[10px] text-slate-400">Valores menores que o total registrarão baixa parcial automática.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Data Efetiva da Baixa / Pagamento *</label>
                <input 
                  type="date" 
                  required 
                  value={paymentDate} 
                  onChange={(e) => setPaymentDate(e.target.value)} 
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Conta Bancária de Saída *</label>
                <select value={bajaBankAccount} onChange={(e) => setBajaBankAccount(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue">
                  <option value="Itaú Sede">Itaú Sede</option>
                  <option value="Bradesco Operacional">Bradesco Operacional</option>
                  <option value="Caixa Depósitos">Caixa Depósitos</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Arquivo do Comprovante (Obrigatório PDF 5.1)</label>
                <div className="flex items-center space-x-2 border border-dashed border-slate-300 rounded-lg p-3 text-center cursor-pointer hover:bg-slate-50">
                  <Upload className="h-5 w-5 text-slate-400" />
                  <span className="text-xs text-slate-500 font-semibold">{bajaComprovante}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowBajaModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm">Confirmar Baixa</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
