import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, FileCheck, CheckCircle, Clock, Trash2, X, DollarSign, Calendar, FileText } from 'lucide-react';
import { FinanceMeasurement, FinanceContract } from '../../types';
import { 
  syncFinanceMeasurements, 
  deleteFinanceMeasurement, 
  addFinanceMeasurement, 
  updateFinanceMeasurement,
  syncFinanceContracts 
} from '../../lib/firebase';

export default function FinanceMedicoes({ requestAdminDelete }: { requestAdminDelete?: (type: string, id: string, name: string) => void }) {
  const [showModal, setShowModal] = useState(false);
  const [measurements, setMeasurements] = useState<FinanceMeasurement[]>([]);
  const [contracts, setContracts] = useState<FinanceContract[]>([]);
  const [editingItem, setEditingItem] = useState<FinanceMeasurement | null>(null);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form states
  const [selectedContractId, setSelectedContractId] = useState('manual');
  const [contractNumber, setContractNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [period, setPeriod] = useState('');
  const [type, setType] = useState('Calibração');
  const [value, setValue] = useState('');
  const [sendDate, setSendDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [status, setStatus] = useState<'em_analise' | 'aprovada' | 'faturada' | 'cancelada'>('em_analise');

  useEffect(() => {
    const unsubscribeMeasurements = syncFinanceMeasurements((data) => {
      setMeasurements(data);
    });
    const unsubscribeContracts = syncFinanceContracts((data) => {
      setContracts(data);
    });
    return () => {
      unsubscribeMeasurements();
      unsubscribeContracts();
    };
  }, []);

  const handleDelete = async (med: FinanceMeasurement) => {
    if (requestAdminDelete) {
      requestAdminDelete('finance_measurement', med.id, `Medição: ${med.contractNumber} (${med.period})`);
    } else {
      if (confirm('Tem certeza que deseja excluir esta medição?')) {
        await deleteFinanceMeasurement(med.id);
      }
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setSelectedContractId('manual');
    setContractNumber('');
    setClientName('');
    setPeriod('');
    setType('Calibração');
    setValue('');
    setSendDate(new Date().toISOString().split('T')[0]);
    setInvoiceNumber('');
    setStatus('em_analise');
    setShowModal(true);
  };

  const handleOpenEditModal = (item: FinanceMeasurement) => {
    setEditingItem(item);
    
    // Check if contract belongs to existing contracts
    const match = contracts.find(c => c.contractNumber === item.contractNumber);
    if (match) {
      setSelectedContractId(match.id);
    } else {
      setSelectedContractId('manual');
    }
    
    setContractNumber(item.contractNumber);
    setClientName(item.clientName);
    setPeriod(item.period);
    setType(item.type);
    setValue(item.value.toString());
    setSendDate(item.sendDate);
    setInvoiceNumber(item.invoiceNumber || '');
    setStatus(item.status);
    setShowModal(true);
  };

  const handleContractChange = (contractId: string) => {
    setSelectedContractId(contractId);
    if (contractId === 'manual') {
      setContractNumber('');
      setClientName('');
    } else {
      const contract = contracts.find(c => c.id === contractId);
      if (contract) {
        setContractNumber(contract.contractNumber);
        setClientName(contract.clientName);
      }
    }
  };

  const handleEmitNF = async (item: FinanceMeasurement) => {
    const nf = prompt('Digite o número da Nota Fiscal para faturamento:', item.invoiceNumber || '');
    if (nf !== null) {
      await updateFinanceMeasurement(item.id, {
        status: 'faturada',
        invoiceNumber: nf.trim()
      });
      alert('✓ Medição faturada com sucesso!');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contractNumber.trim() || !clientName.trim() || !period.trim() || !value.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const numericValue = parseFloat(value);
    if (isNaN(numericValue) || numericValue <= 0) {
      alert('Por favor, informe um valor financeiro válido e maior que zero.');
      return;
    }

    const measurementData = {
      contractId: selectedContractId === 'manual' ? 'manual' : selectedContractId,
      contractNumber: contractNumber.trim(),
      clientName: clientName.trim(),
      period: period.trim(),
      type,
      value: numericValue,
      status,
      sendDate: sendDate || new Date().toISOString().split('T')[0],
      invoiceNumber: invoiceNumber.trim() || undefined
    };

    try {
      if (editingItem) {
        await updateFinanceMeasurement(editingItem.id, measurementData);
        alert('✓ Medição atualizada com sucesso!');
      } else {
        await addFinanceMeasurement(measurementData);
        alert('✓ Nova medição cadastrada com sucesso!');
      }
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao salvar medição:', error);
      alert('Erro ao salvar medição. Por favor, verifique as permissões e tente novamente.');
    }
  };

  // Filter Logic
  const filteredMeasurements = measurements.filter(item => {
    const matchesSearch = 
      item.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.period.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.invoiceNumber && item.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovada':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle className="h-3 w-3 mr-1" /> Aprovada
          </span>
        );
      case 'faturada':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
            <FileCheck className="h-3 w-3 mr-1" /> Faturada
          </span>
        );
      case 'cancelada':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <Trash2 className="h-3 w-3 mr-1" /> Cancelada
          </span>
        );
      case 'em_analise':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3 mr-1" /> Em Análise
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Medições e Faturamento</h3>
          <p className="text-sm text-slate-500">Controle de aprovação de medições e emissão de notas fiscais de contratos ativos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar medição..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue outline-none w-48 sm:w-64" 
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue outline-none"
          >
            <option value="all">Todos os Status</option>
            <option value="em_analise">Em Análise</option>
            <option value="aprovada">Aprovada</option>
            <option value="faturada">Faturada</option>
            <option value="cancelada">Cancelada</option>
          </select>

          <button 
            onClick={handleOpenAddModal} 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center space-x-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Medição</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="px-6 py-3 font-semibold">Contrato / Cliente</th>
              <th className="px-6 py-3 font-semibold">Período / Tipo</th>
              <th className="px-6 py-3 font-semibold">Data Envio</th>
              <th className="px-6 py-3 font-semibold text-right">Valor Final</th>
              <th className="px-6 py-3 font-semibold text-center">Status</th>
              <th className="px-6 py-3 font-semibold text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMeasurements.length > 0 ? filteredMeasurements.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">{item.contractNumber}</div>
                  <div className="text-xs text-slate-500">{item.clientName}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-slate-800">{item.period}</div>
                  <div className="text-xs text-slate-500">{item.type}</div>
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {new Date(item.sendDate).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">
                  R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-center">
                  {renderStatusBadge(item.status)}
                  {item.invoiceNumber && (
                    <div className="text-[10px] text-slate-400 font-semibold font-mono mt-1">
                      NF: {item.invoiceNumber}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <button 
                      onClick={() => handleEmitNF(item)}
                      className="p-1.5 text-slate-400 hover:text-royal-blue hover:bg-slate-100 rounded" 
                      title="Emitir NF / Faturar"
                    >
                      <FileCheck className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 text-slate-400 hover:text-royal-blue hover:bg-slate-100 rounded"
                      title="Editar Medição"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)} 
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  Nenhuma medição encontrada para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modern, elegant Modal for Registering/Editing a Measurement */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h4 className="text-base font-extrabold text-slate-900">
                {editingItem ? 'Editar Medição de Serviço' : 'Nova Medição de Serviço'}
              </h4>
              <button 
                onClick={() => setShowModal(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Select Contract dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Vincular a Contrato Ativo
                </label>
                <select
                  value={selectedContractId}
                  onChange={(e) => handleContractChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-royal-blue"
                >
                  <option value="manual">Digitar dados manualmente</option>
                  {contracts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.contractNumber} - {c.clientName} (R$ {c.value.toLocaleString('pt-BR')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Contract number (editable if manual) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Número do Contrato *
                  </label>
                  <input 
                    type="text" 
                    required 
                    disabled={selectedContractId !== 'manual'}
                    value={contractNumber} 
                    onChange={(e) => setContractNumber(e.target.value)} 
                    placeholder="Ex: CT-2026-04" 
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500" 
                  />
                </div>

                {/* Client Name (editable if manual) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nome do Cliente *
                  </label>
                  <input 
                    type="text" 
                    required 
                    disabled={selectedContractId !== 'manual'}
                    value={clientName} 
                    onChange={(e) => setClientName(e.target.value)} 
                    placeholder="Ex: Braskem S.A." 
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm disabled:bg-slate-100 disabled:text-slate-500" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Period of Measurement */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Período da Medição *
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={period} 
                    onChange={(e) => setPeriod(e.target.value)} 
                    placeholder="Ex: 01/08 a 31/08" 
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" 
                  />
                </div>

                {/* Type of service */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tipo de Serviço
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                  >
                    <option value="Calibração">Calibração</option>
                    <option value="Manutenção">Manutenção</option>
                    <option value="Instalação">Instalação</option>
                    <option value="Consultoria">Consultoria</option>
                    <option value="Metrologia">Metrologia</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Value (R$) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Valor Final Medido (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      required 
                      value={value} 
                      onChange={(e) => setValue(e.target.value)} 
                      placeholder="0,00" 
                      className="w-full border border-slate-300 rounded-lg p-2.5 pl-9 text-sm font-mono" 
                    />
                  </div>
                </div>

                {/* Date sent */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Data de Envio *
                  </label>
                  <input 
                    type="date" 
                    required 
                    value={sendDate} 
                    onChange={(e) => setSendDate(e.target.value)} 
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Optional invoice code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Número NF-e (Opcional)
                  </label>
                  <input 
                    type="text" 
                    value={invoiceNumber} 
                    onChange={(e) => setInvoiceNumber(e.target.value)} 
                    placeholder="Ex: 2450" 
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" 
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status da Medição
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                  >
                    <option value="em_analise">Em Análise</option>
                    <option value="aprovada">Aprovada</option>
                    <option value="faturada">Faturada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
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
                  {editingItem ? 'Salvar Alterações' : 'Cadastrar Medição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
