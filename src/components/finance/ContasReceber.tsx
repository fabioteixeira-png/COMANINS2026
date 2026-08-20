import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Edit, Trash2, CheckCircle, Clock, AlertCircle, 
  X, FileText, Upload, DollarSign, Eye, RefreshCw 
} from 'lucide-react';
import { FinanceTransaction } from '../../types';
import { syncFinanceTransactions, deleteFinanceTransaction, addFinanceTransaction, updateFinanceTransaction } from '../../lib/firebase';

export default function ContasReceber({ requestAdminDelete }: { requestAdminDelete?: (type: string, id: string, name: string) => void }) {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [contractFilter, setContractFilter] = useState('todos');

  // Modal control
  const [showFormModal, setShowFormModal] = useState(false);
  const [showBajaModal, setShowBajaModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<FinanceTransaction | null>(null);

  // Form states
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0); // bruto
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('Serviço'); // Tipo de receita
  const [costCenter, setCostCenter] = useState('Contrato Braskem');
  const [contractNumber, setContractNumber] = useState('CT-2025-01');
  const [contactName, setContactName] = useState(''); // Cliente
  const [contactDocument, setContactDocument] = useState(''); // CNPJ/CPF
  const [documentNumber, setDocumentNumber] = useState(''); // NF
  const [paymentMethod, setPaymentMethod] = useState('TED');
  const [bankAccount, setBankAccount] = useState('Itaú Sede');
  const [notes, setNotes] = useState('');
  const [retentions, setRetentions] = useState(0); // Deductible taxes

  // Baja states
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [amountReceived, setAmountReceived] = useState(0);
  const [bajaBankAccount, setBajaBankAccount] = useState('Itaú Sede');

  useEffect(() => {
    const unsubscribe = syncFinanceTransactions((data) => {
      setTransactions(data.filter(t => t.type === 'receita'));
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (tx: FinanceTransaction) => {
    if (requestAdminDelete) {
      requestAdminDelete('finance_transaction', tx.id, `Receita: ${tx.description}`);
    } else {
      if (confirm('Tem certeza que deseja excluir esta receita?')) {
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
      setContractNumber(tx.contractNumber || 'CT-2025-01');
      setContactName(tx.contactName);
      setContactDocument(tx.contactDocument);
      setDocumentNumber(tx.documentNumber);
      setPaymentMethod(tx.paymentMethod);
      setBankAccount(tx.bankAccount);
      setNotes(tx.notes || '');
      setRetentions(0);
    } else {
      setSelectedTx(null);
      setDescription('');
      setAmount(0);
      setDueDate(new Date().toISOString().split('T')[0]);
      setCategory('Serviço');
      setCostCenter('Contrato Braskem');
      setContractNumber('CT-2025-01');
      setContactName('');
      setContactDocument('');
      setDocumentNumber('');
      setPaymentMethod('TED');
      setBankAccount('Itaú Sede');
      setNotes('');
      setRetentions(0);
    }
    setShowFormModal(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = amount - retentions;
    const data: Omit<FinanceTransaction, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'receita',
      description,
      amount: finalAmount,
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
      contractNumber,
      createdBy: 'Administrador',
      notes: `${notes} \n [Valor Bruto: R$ ${amount} - Retenções: R$ ${retentions}]`.trim()
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
    setAmountReceived(tx.amount);
    setShowBajaModal(true);
  };

  const handleSaveBaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;

    const remaining = selectedTx.amount - amountReceived;
    const isPartial = remaining > 0;

    await updateFinanceTransaction(selectedTx.id, {
      status: isPartial ? 'pendente' : 'pago',
      amount: isPartial ? remaining : selectedTx.amount,
      notes: `${selectedTx.notes || ''} \n [Recebimento ${isPartial ? 'Parcial' : 'Total'} de R$ ${amountReceived} em ${receivedDate} via ${bajaBankAccount}]`.trim()
    });

    setShowBajaModal(false);
  };

  // Filter list
  const filtered = transactions.filter(t => {
    const matchesSearch = t.contactName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || t.status === statusFilter;
    const matchesContract = contractFilter === 'todos' || t.contractNumber === contractFilter;
    return matchesSearch && matchesStatus && matchesContract;
  });

  const contractsList = Array.from(new Set(transactions.map(t => t.contractNumber).filter(Boolean)));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header Controls */}
      <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Contas a Receber</h3>
          <p className="text-sm text-slate-500">Acompanhamento de faturamento, medições aprovadas e ingressos de caixa.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar cliente/descrição..." 
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
            <option value="pendente">A Receber</option>
            <option value="pago">Recebido</option>
            <option value="atrasado">Atrasado</option>
          </select>

          <select 
            value={contractFilter}
            onChange={(e) => setContractFilter(e.target.value)}
            className="border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue"
          >
            <option value="todos">Todos Contratos</option>
            {contractsList.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button 
            onClick={() => handleOpenForm(null)} 
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center space-x-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Receita</span>
          </button>
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="px-6 py-3 font-semibold">Cliente / Descrição</th>
              <th className="px-6 py-3 font-semibold">Contrato / C. Custo</th>
              <th className="px-6 py-3 font-semibold">Vencimento</th>
              <th className="px-6 py-3 font-semibold text-right">Valor Líquido</th>
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
                  {item.documentNumber && <div className="text-[10px] text-slate-400 mt-0.5 font-mono">NF: {item.documentNumber}</div>}
                </td>
                <td className="px-6 py-4">
                  <div className="text-slate-700 font-semibold">{item.contractNumber || '—'}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">{item.costCenter}</div>
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {new Date(item.dueDate).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">
                  R$ {item.amount.toFixed(2).replace('.', ',')}
                </td>
                <td className="px-6 py-4 text-center">
                  {item.status === 'pago' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle className="h-3 w-3 mr-1" /> Recebido</span>}
                  {item.status === 'pendente' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" /> A Receber</span>}
                  {item.status === 'atrasado' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800"><AlertCircle className="h-3 w-3 mr-1" /> Atrasado</span>}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    {item.status !== 'pago' && (
                      <button 
                        onClick={() => handleOpenBaja(item)}
                        className="p-1 text-emerald-600 hover:text-emerald-800 font-bold text-xs border border-emerald-200 rounded bg-emerald-50 px-2 py-1 flex items-center space-x-1"
                        title="Efetuar Recebimento"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Baixar</span>
                      </button>
                    )}
                    <button onClick={() => handleOpenForm(item)} className="p-1 text-slate-400 hover:text-royal-blue"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(item)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  Nenhuma receita localizada com os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Receivable Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-lg font-bold text-slate-800">{selectedTx ? 'Editar Faturamento/Receita' : 'Novo Título a Receber'}</h4>
              <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSaveForm} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Cliente *</label>
                  <input type="text" required value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. Braskem S.A." className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">CNPJ do Cliente</label>
                  <input type="text" value={contactDocument} onChange={(e) => setContactDocument(e.target.value)} placeholder="00.000.000/0000-00" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Descrição do Faturamento *</label>
                  <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Medição Serviços de Calibração Julho" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Tipo de Receita *</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue">
                    <option value="Serviço">Serviço (Contratos)</option>
                    <option value="Reembolso">Reembolso de Despesas</option>
                    <option value="Venda">Venda de Equipamentos</option>
                    <option value="Financeira">Receita Financeira</option>
                    <option value="Aporte">Aporte dos Sócios</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Contrato Vinculado *</label>
                  <input type="text" required value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} placeholder="CT-2025-01" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Centro de Custo de Destino *</label>
                  <select value={costCenter} onChange={(e) => setCostCenter(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue">
                    <option value="Contrato Braskem">Contrato Braskem</option>
                    <option value="Contrato Acelen">Contrato Acelen</option>
                    <option value="Laboratório Metrológico">Laboratório Metrológico</option>
                    <option value="Sede (Corporativo)">Sede (Corporativo)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Valor Bruto (R$) *</label>
                  <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Retenções Tributárias (R$)</label>
                  <input type="number" step="0.01" value={retentions} onChange={(e) => setRetentions(Number(e.target.value))} placeholder="ISS, PIS, COFINS" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nº Nota Fiscal (NF)</label>
                  <input type="text" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="NF-23456" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Data de Vencimento *</label>
                  <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Método de Liquidação</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue">
                    <option value="TED">TED</option>
                    <option value="Pix">Pix</option>
                    <option value="Boleto">Boleto Bancário</option>
                    <option value="Depósito">Depósito Identificado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Observações / Memória de cálculo da medição</label>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue"></textarea>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-600">Documento de Medição Aprovada / NF-e</span>
                </div>
                <button type="button" className="text-xs font-bold text-emerald-600 hover:underline flex items-center space-x-1">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Anexar NF em PDF</span>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowFormModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm">Registrar Título</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Baja / Receipt Modal */}
      {showBajaModal && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-lg font-bold text-slate-800">Baixar Receita / Confirmar Recebimento</h4>
              <button onClick={() => setShowBajaModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSaveBaja} className="p-6 space-y-4">
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-xs text-slate-700 space-y-1">
                <p><strong>Cliente:</strong> {selectedTx.contactName}</p>
                <p><strong>Contrato:</strong> {selectedTx.contractNumber}</p>
                <p><strong>Descrição:</strong> {selectedTx.description}</p>
                <p><strong>Valor Pendente:</strong> R$ {selectedTx.amount.toFixed(2).replace('.', ',')}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Valor Efetivamente Recebido (R$) *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  value={amountReceived} 
                  onChange={(e) => setAmountReceived(Number(e.target.value))} 
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Data de Recebimento Efetivo *</label>
                <input 
                  type="date" 
                  required 
                  value={receivedDate} 
                  onChange={(e) => setReceivedDate(e.target.value)} 
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Conta Bancária de Entrada *</label>
                <select value={bajaBankAccount} onChange={(e) => setBajaBankAccount(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue">
                  <option value="Itaú Sede">Itaú Sede</option>
                  <option value="Bradesco Operacional">Bradesco Operacional</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowBajaModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm">Confirmar Recebimento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
