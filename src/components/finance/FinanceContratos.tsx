import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Trash2, CheckCircle, Briefcase, BarChart, X, Percent, Calendar } from 'lucide-react';
import { FinanceContract } from '../../types';
import { syncFinanceContracts, deleteFinanceContract, addFinanceContract, updateFinanceContract } from '../../lib/firebase';
import FinanceSpreadsheetActions from './FinanceSpreadsheetActions';
import { financeAddYearsLocal, financeFormatDatePt, financeTodayLocal } from './finance-date';

export default function FinanceContratos({ requestAdminDelete, canEdit = false }: { requestAdminDelete?: (type: string, id: string, name: string) => void; canEdit?: boolean }) {
  const [showModal, setShowModal] = useState(false);
  const [contracts, setContracts] = useState<FinanceContract[]>([]);
  const [editingItem, setEditingItem] = useState<FinanceContract | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [clientName, setClientName] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'ativo' | 'encerrado' | 'suspenso'>('ativo');
  const [costCenter, setCostCenter] = useState('');

  useEffect(() => {
    const unsubscribe = syncFinanceContracts((data) => {
      setContracts(data);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (contract: FinanceContract) => {
    if (!canEdit) return;
    if (requestAdminDelete) {
      requestAdminDelete('finance_contract', contract.id, `Contrato: ${contract.contractNumber} - ${contract.clientName}`);
    } else {
      if (confirm('Tem certeza que deseja excluir este contrato?')) {
        await deleteFinanceContract(contract.id);
      }
    }
  };

  const handleOpenAdd = () => {
    if (!canEdit) return;
    setEditingItem(null);
    setClientName('');
    setContractNumber('');
    setDescription('');
    setValue('');
    const today = financeTodayLocal();
    setStartDate(today);
    setEndDate(financeAddYearsLocal(today, 1));
    setStatus('ativo');
    setCostCenter('');
    setShowModal(true);
  };

  const handleOpenEdit = (item: FinanceContract) => {
    if (!canEdit) return;
    setEditingItem(item);
    setClientName(item.clientName);
    setContractNumber(item.contractNumber);
    setDescription(item.description);
    setValue(item.value.toString());
    setStartDate(item.startDate);
    setEndDate(item.endDate);
    setStatus(item.status);
    setCostCenter(item.costCenter || '');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    if (!clientName.trim() || !contractNumber.trim() || !value.trim() || !startDate.trim() || !endDate.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const numericValue = parseFloat(value);
    if (isNaN(numericValue) || numericValue <= 0) {
      alert('Por favor, informe um valor financeiro válido.');
      return;
    }
    if (endDate < startDate) {
      alert('A data final do contrato não pode ser anterior à data inicial.');
      return;
    }

    const contractData = {
      clientId: 'manual',
      clientName: clientName.trim(),
      contractNumber: contractNumber.trim(),
      description: description.trim(),
      value: numericValue,
      startDate,
      endDate,
      status,
      costCenter: costCenter.trim() || contractNumber.trim(),
    };

    try {
      if (editingItem) {
        await updateFinanceContract(editingItem.id, contractData);
        alert('✓ Contrato atualizado com sucesso!');
      } else {
        await addFinanceContract(contractData);
        alert('✓ Novo contrato cadastrado com sucesso!');
      }
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao salvar contrato:', error);
      alert('Erro ao salvar contrato. Por favor, tente novamente.');
    }
  };

  // Filter lists based on search
  const filteredContracts = contracts.filter(c =>
    c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.costCenter && c.costCenter.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Contratos e Centros de Custo</h3>
          <p className="text-sm text-slate-500 font-medium">Gestão definitiva dos contratos de clientes e vinculação de despesas/receitas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar contrato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue outline-none w-48 sm:w-64"
            />
          </div>
          <FinanceSpreadsheetActions entity="contracts" canEdit={canEdit} exportRows={filteredContracts} compact />
          {canEdit && <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center space-x-2 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Contrato</span>
          </button>}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Cliente / Objeto</th>
              <th className="px-6 py-3">Nº Contrato</th>
              <th className="px-6 py-3">Centro de Custo</th>
              <th className="px-6 py-3">Vigência</th>
              <th className="px-6 py-3 text-right">Valor Global</th>
              <th className="px-6 py-3 text-center">Status</th>
              <th className="px-6 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredContracts.length > 0 ? filteredContracts.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">{item.clientName}</div>
                  <div className="text-xs text-slate-500 font-medium">{item.description || 'Nenhuma descrição informada'}</div>
                </td>
                <td className="px-6 py-4 text-slate-600 font-mono font-semibold text-xs">{item.contractNumber}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                    {item.costCenter || item.contractNumber}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600 text-xs font-semibold">
                  {financeFormatDatePt(item.startDate)} a {financeFormatDatePt(item.endDate)}
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">
                  R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-center">
                  {item.status === 'ativo' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      <CheckCircle className="h-3 w-3 mr-1" /> Ativo
                    </span>
                  ) : item.status === 'suspenso' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                      Suspenso
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
                      Encerrado
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    {canEdit && <>
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 text-slate-400 hover:text-royal-blue hover:bg-slate-100 rounded transition-colors"
                      title="Editar Contrato"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors"
                      title="Excluir Contrato"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    </>}
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500 font-medium">
                  Nenhum contrato cadastrado. Clique em "Novo Contrato" para iniciar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modern, elegant Contract Modal */}
      {showModal && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h4 className="text-base font-extrabold text-slate-900">
                {editingItem ? 'Editar Contrato de Cliente' : 'Cadastrar Novo Contrato'}
              </h4>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Client Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nome do Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Braskem S.A."
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-royal-blue"
                  />
                </div>

                {/* Contract number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Número do Contrato *
                  </label>
                  <input
                    type="text"
                    required
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    placeholder="Ex: CT-2026-08"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-royal-blue font-mono"
                  />
                </div>
              </div>

              {/* Description / Objeto do contrato */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Objeto do Contrato / Descrição
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Calibração de Instrumentos de Pressão e Temperatura"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-royal-blue"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Global Value */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Valor Global do Contrato (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Ex: 150000.00"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-royal-blue font-mono"
                  />
                </div>

                {/* Cost Center */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Centro de Custo Associado
                  </label>
                  <input
                    type="text"
                    value={costCenter}
                    onChange={(e) => setCostCenter(e.target.value)}
                    placeholder="Ex: Braskem-Sede (ou vazio p/ usar número)"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-royal-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Start date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Data Inicial *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-royal-blue"
                  />
                </div>

                {/* End date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Data Final *
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-royal-blue"
                  />
                </div>
              </div>

              {/* Status select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Status do Contrato
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-royal-blue"
                >
                  <option value="ativo">Ativo</option>
                  <option value="suspenso">Suspenso</option>
                  <option value="encerrado">Encerrado</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors"
                >
                  {editingItem ? 'Salvar Alterações' : 'Cadastrar Contrato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
