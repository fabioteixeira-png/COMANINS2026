import React, { useState } from 'react';
import { 
  Plus, Eye, CheckCircle2, AlertTriangle, User, FileText, Upload, 
  Trash2, X, Check, HelpCircle, DollarSign, RefreshCw, Clock 
} from 'lucide-react';

interface RequestItem {
  id: string;
  employee: string;
  type: 'reembolso' | 'adiantamento';
  purpose: string;
  amount: number;
  date: string;
  status: 'pendente' | 'aprovado' | 'pago' | 'rejeitado' | 'prestacao_pendente';
  notes?: string;
}

export default function ReembolsosAdiantamentos() {
  const isSimulacao = (localStorage.getItem('finance_op_mode') || 'homologado') === 'simulacao';

  const [requests, setRequests] = useState<RequestItem[]>(() => {
    return isSimulacao ? [
      { id: 'r-01', employee: 'Geraldo Antunes', type: 'reembolso', purpose: 'Estacionamento e alimentação cliente Braskem', amount: 125.40, date: '2026-07-28', status: 'pendente' },
      { id: 'r-02', employee: 'Patrícia Neves', type: 'adiantamento', purpose: 'Viagem técnica auditoria Camaçari', amount: 1500.00, date: '2026-08-01', status: 'prestacao_pendente', notes: 'Adiantamento aprovado em 02/08.' },
      { id: 'r-03', employee: 'Bruno Mendes', type: 'reembolso', purpose: 'Aquisição conector rápido em emergência', amount: 64.90, date: '2026-07-30', status: 'pago' },
    ] : [];
  });

  const [showModal, setShowModal] = useState(false);
  const [showAccountabilityModal, setShowAccountabilityModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState<RequestItem | null>(null);

  // Form states
  const [employee, setEmployee] = useState('');
  const [type, setType] = useState<'reembolso' | 'adiantamento'>('reembolso');
  const [purpose, setPurpose] = useState('');
  const [amount, setAmount] = useState(0);

  // Accountability states
  const [spentAmount, setSpentAmount] = useState(0);
  const [accountabilityReceipt, setAccountabilityReceipt] = useState('recibo_hotel.pdf');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newReq: RequestItem = {
      id: 'r-' + Date.now(),
      employee,
      type,
      purpose,
      amount,
      date: new Date().toISOString().split('T')[0],
      status: 'pendente'
    };

    setRequests(prev => [...prev, newReq]);
    setShowModal(false);
  };

  const handleApprove = (id: string) => {
    setRequests(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, status: r.type === 'adiantamento' ? 'prestacao_pendente' : 'aprovado' };
      }
      return r;
    }));
    alert('✓ Solicitação aprovada com sucesso! Enviada para a fila de pagamentos.');
  };

  const handlePay = (id: string) => {
    setRequests(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, status: 'pago' };
      }
      return r;
    }));
    alert('✓ Pagamento liquidado com sucesso.');
  };

  const handleOpenAccountability = (req: RequestItem) => {
    setSelectedReq(req);
    setSpentAmount(req.amount);
    setShowAccountabilityModal(true);
  };

  const handleSaveAccountability = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    const diff = selectedReq.amount - spentAmount;

    setRequests(prev => prev.map(r => {
      if (r.id === selectedReq.id) {
        return { 
          ...r, 
          status: 'pago',
          notes: `[Prestação de Contas Finalizada: Gastou R$ ${spentAmount}. ${diff > 0 ? `Devolveu sobra de R$ ${diff.toFixed(2)}` : diff < 0 ? `Reembolsado em R$ ${Math.abs(diff).toFixed(2)}` : 'Saldo exato'}]`
        };
      }
      return r;
    }));

    setShowAccountabilityModal(false);
    alert('✓ Prestação de contas realizada e saldo recalculado com sucesso!');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header Controls */}
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Reembolsos e Adiantamentos</h3>
          <p className="text-sm text-slate-500">Fluxo completo de adiantamentos de viagem, reembolso de despesas técnicas e prestação de contas.</p>
        </div>

        <button 
          onClick={() => {
            setEmployee('');
            setPurpose('');
            setAmount(0);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-royal-blue hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center space-x-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Solicitar Adiantamento / Reembolso</span>
        </button>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th className="px-6 py-3">Colaborador / Finalidade</th>
              <th className="px-6 py-3">Tipo</th>
              <th className="px-6 py-3">Data</th>
              <th className="px-6 py-3 text-right">Valor</th>
              <th className="px-6 py-3 text-center">Status</th>
              <th className="px-6 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">{item.employee}</div>
                  <div className="text-xs text-slate-500">{item.purpose}</div>
                  {item.notes && <div className="text-[10px] text-royal-blue mt-1 font-semibold">{item.notes}</div>}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${item.type === 'adiantamento' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'}`}>
                    {item.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600 font-mono">
                  {new Date(item.date).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">
                  R$ {item.amount.toFixed(2).replace('.', ',')}
                </td>
                <td className="px-6 py-4 text-center">
                  {item.status === 'pendente' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" /> Pendente de Aprovação</span>}
                  {item.status === 'aprovado' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Check className="h-3 w-3 mr-1" /> Aprovado (Pagar)</span>}
                  {item.status === 'prestacao_pendente' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800"><AlertTriangle className="h-3 w-3 mr-1 animate-pulse" /> Prestar Contas</span>}
                  {item.status === 'pago' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle2 className="h-3 w-3 mr-1" /> Liquidado</span>}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center space-x-1.5">
                    {item.status === 'pendente' && (
                      <button 
                        onClick={() => handleApprove(item.id)}
                        className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700"
                      >
                        Aprovar
                      </button>
                    )}
                    {item.status === 'aprovado' && (
                      <button 
                        onClick={() => handlePay(item.id)}
                        className="px-2 py-1 bg-royal-blue text-white rounded text-xs font-bold hover:bg-blue-700"
                      >
                        Pagar
                      </button>
                    )}
                    {item.status === 'prestacao_pendente' && (
                      <button 
                        onClick={() => handleOpenAccountability(item)}
                        className="px-2 py-1 bg-rose-600 text-white rounded text-xs font-bold hover:bg-rose-700"
                      >
                        Prestar Contas
                      </button>
                    )}
                    <span className="text-xs text-slate-400 font-semibold">{item.status === 'pago' ? '—' : ''}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Solicitation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-lg font-bold text-slate-800">Nova Solicitação Corporativa</h4>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nome do Colaborador *</label>
                <input type="text" required value={employee} onChange={(e) => setEmployee(e.target.value)} placeholder="e.g. Bruno Mendes" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tipo de Solicitação *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setType('reembolso')} className={`p-2 rounded-lg border text-xs font-bold ${type === 'reembolso' ? 'bg-amber-50 border-amber-500 text-amber-900' : 'border-slate-300'}`}>Reembolso de Despesas</button>
                  <button type="button" onClick={() => setType('adiantamento')} className={`p-2 rounded-lg border text-xs font-bold ${type === 'adiantamento' ? 'bg-indigo-50 border-indigo-500 text-indigo-900' : 'border-slate-300'}`}>Adiantamento Viagem</button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Finalidade / Justificativa *</label>
                <input type="text" required value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Hospedagem e táxi durante parada Braskem" className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Valor Solicitado (R$) *</label>
                <input type="number" required value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Comprovante de Compra (Se houver)</span>
                <button type="button" className="text-xs font-bold text-royal-blue hover:underline">Anexar PDF</button>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-royal-blue hover:bg-blue-700 text-white rounded-lg text-sm font-bold">Enviar Solicitação</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accountability Modal */}
      {showAccountabilityModal && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-lg font-bold text-slate-800">Prestação de Contas de Adiantamento</h4>
              <button onClick={() => setShowAccountabilityModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSaveAccountability} className="p-6 space-y-4">
              <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-xs">
                <p><strong>Portador:</strong> {selectedReq.employee}</p>
                <p><strong>Adiantamento Recebido:</strong> R$ {selectedReq.amount.toFixed(2)}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Valor Efetivamente Gasto (R$) *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  value={spentAmount} 
                  onChange={(e) => setSpentAmount(Number(e.target.value))} 
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue" 
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {selectedReq.amount - spentAmount > 0 
                    ? `O colaborador deverá DEVOLVER R$ ${(selectedReq.amount - spentAmount).toFixed(2)} à COMANINS.` 
                    : selectedReq.amount - spentAmount < 0 
                    ? `A COMANINS deverá REEMBOLSAR R$ ${Math.abs(selectedReq.amount - spentAmount).toFixed(2)} ao colaborador.` 
                    : 'Prestação equilibrada. Sem saldos residuais.'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Comprovante de Despesa / Notas Fiscais Consolidated *</label>
                <div className="flex items-center space-x-2 border border-dashed border-slate-300 rounded-lg p-3 cursor-pointer hover:bg-slate-50">
                  <Upload className="h-5 w-5 text-slate-400" />
                  <span className="text-xs text-slate-500 font-semibold">{accountabilityReceipt}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowAccountabilityModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm">Encerrar Prestação</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
