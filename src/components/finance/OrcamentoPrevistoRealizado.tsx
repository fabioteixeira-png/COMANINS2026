import React, { useState } from 'react';
import { 
  Activity, Plus, Search, Filter, Edit, Save, AlertTriangle, CheckCircle, 
  HelpCircle, ChevronRight, X 
} from 'lucide-react';

interface BudgetItem {
  id: string;
  costCenter: string;
  category: string;
  planned: number;
  realized: number;
  justification?: string;
  status: 'em_elaboracao' | 'aprovado' | 'encerrado';
}

export default function OrcamentoPrevistoRealizado() {
  const isSimulacao = (localStorage.getItem('finance_op_mode') || 'homologado') === 'simulacao';

  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(() => {
    return isSimulacao ? [
      { id: 'b-01', costCenter: 'Laboratório Metrológico', category: 'Insumos / Gases', planned: 15000.00, realized: 12500.00, status: 'aprovado' },
      { id: 'b-02', costCenter: 'Frota corporativa', category: 'Combustível', planned: 8000.00, realized: 9800.00, status: 'aprovado' },
      { id: 'b-03', costCenter: 'Administrativo Sede', category: 'Marketing Digital', planned: 5000.00, realized: 4800.00, status: 'aprovado' },
      { id: 'b-04', costCenter: 'Contrato Braskem', category: 'Ferramental Especial', planned: 25000.00, realized: 27500.00, status: 'aprovado' },
    ] : [];
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showJustifyModal, setShowJustifyModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BudgetItem | null>(null);

  // Form states
  const [costCenter, setCostCenter] = useState('Laboratório Metrológico');
  const [category, setCategory] = useState('Insumos / Gases');
  const [planned, setPlanned] = useState(0);
  const [realized, setRealized] = useState(0);
  const [justification, setJustification] = useState('');

  const handleOpenJustify = (item: BudgetItem) => {
    setSelectedItem(item);
    setJustification(item.justification || '');
    setShowJustifyModal(true);
  };

  const handleSaveJustify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setBudgetItems(prev => prev.map(item => {
      if (item.id === selectedItem.id) {
        return { ...item, justification };
      }
      return item;
    }));

    setShowJustifyModal(false);
  };

  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: BudgetItem = {
      id: 'b-' + Date.now(),
      costCenter,
      category,
      planned,
      realized,
      status: 'aprovado'
    };

    setBudgetItems(prev => [...prev, newItem]);
    setShowModal(false);
  };

  const filtered = budgetItems.filter(item => {
    return item.costCenter.toLowerCase().includes(searchTerm.toLowerCase()) || 
           item.category.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header Controls */}
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Orçamento Previsto x Realizado</h3>
          <p className="text-sm text-slate-500">Mapeamento de planejamento de custos, faturamento orçado e desvios de centro de custo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar orçamento..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue outline-none" 
            />
          </div>

          <button 
            onClick={() => {
              setPlanned(0);
              setRealized(0);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-royal-blue hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center space-x-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Definir Verba Orçada</span>
          </button>
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th className="px-6 py-3">Centro de Custo</th>
              <th className="px-6 py-3">Categoria</th>
              <th className="px-6 py-3 text-right">Orçado (Previsto)</th>
              <th className="px-6 py-3 text-right">Realizado (Efetivo)</th>
              <th className="px-6 py-3 text-right">Desvio</th>
              <th className="px-6 py-3 text-center">Status</th>
              <th className="px-6 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(item => {
              const diff = item.realized - item.planned;
              const diffPercent = item.planned > 0 ? (diff / item.planned) * 100 : 0;
              const isOver = diff > 0;

              return (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{item.costCenter}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-600 font-semibold">{item.category}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-slate-700">
                    R$ {item.planned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-slate-700">
                    R$ {item.realized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`px-6 py-4 text-right font-mono font-bold ${isOver ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {isOver ? '+' : ''}{diffPercent.toFixed(1)}% 
                    <span className="block text-[10px] text-slate-400">R$ {diff.toLocaleString('pt-BR')}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {isOver && !item.justification ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Requer Justificativa
                      </span>
                    ) : item.justification ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800" title={item.justification}>
                        Justificado
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        Dentro da Meta
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {isOver ? (
                      <button 
                        onClick={() => handleOpenJustify(item)}
                        className="text-xs text-royal-blue hover:underline font-bold"
                      >
                        {item.justification ? 'Editar Justificativa' : 'Justificar Desvio'}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Sem desvio crítico</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Define Budget Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-lg font-bold text-slate-800">Definir Orçamento de Setor</h4>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleAddBudget} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Centro de Custo *</label>
                <select value={costCenter} onChange={(e) => setCostCenter(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue">
                  <option value="Laboratório Metrológico">Laboratório Metrológico</option>
                  <option value="Contrato Braskem">Contrato Braskem</option>
                  <option value="Contrato Acelen">Contrato Acelen</option>
                  <option value="Frota corporativa">Frota corporativa</option>
                  <option value="Administrativo Sede">Administrativo Sede</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Categoria de Verba *</label>
                <input type="text" required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Orçado Previsto (R$) *</label>
                  <input type="number" required value={planned} onChange={(e) => setPlanned(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Realizado Atual (R$)</label>
                  <input type="number" value={realized} onChange={(e) => setRealized(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-royal-blue hover:bg-blue-700 text-white rounded-lg text-sm font-bold">Salvar Verba</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Justification Modal */}
      {showJustifyModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-lg font-bold text-slate-800">Justificativa de Estouro de Orçamento</h4>
              <button onClick={() => setShowJustifyModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSaveJustify} className="p-6 space-y-4">
              <div className="bg-rose-50 text-rose-800 p-3 rounded-lg border border-rose-100 text-xs">
                <p><strong>Setor:</strong> {selectedItem.costCenter}</p>
                <p><strong>Orçado:</strong> R$ {selectedItem.planned.toLocaleString('pt-BR')}</p>
                <p><strong>Realizado:</strong> R$ {selectedItem.realized.toLocaleString('pt-BR')}</p>
                <p className="font-bold">Desvio: +{(((selectedItem.realized - selectedItem.planned) / selectedItem.planned) * 100).toFixed(1)}%</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Motivo / Justificativa Técnica *</label>
                <textarea 
                  required 
                  rows={4} 
                  value={justification} 
                  onChange={(e) => setJustification(e.target.value)} 
                  placeholder="e.g. Aquisição extraordinária de peças para padrões Fluke devido a reparo emergencial em campo."
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue"
                ></textarea>
                <span className="text-[10px] text-slate-400">Obrigatório conforme regras de validação da COMANINS (Seção 24).</span>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowJustifyModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-royal-blue hover:bg-blue-700 text-white rounded-lg text-sm font-bold">Salvar Justificativa</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
