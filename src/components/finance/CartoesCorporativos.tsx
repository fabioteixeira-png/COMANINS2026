import React, { useState } from 'react';
import { 
  CreditCard, Plus, Eye, CheckCircle, AlertTriangle, User, 
  Trash2, X, Upload, DollarSign, RefreshCw 
} from 'lucide-react';

interface CorporateCard {
  id: string;
  holder: string;
  role: string;
  cardNumber: string; // e.g. **** **** **** 4912
  limit: number;
  spent: number;
  dueDate: string;
}

interface CardPurchase {
  id: string;
  cardId: string;
  date: string;
  establishment: string;
  amount: number;
  costCenter: string;
  receiptAttached: boolean;
  status: 'aprovado' | 'pendente_comprovante' | 'glosado';
}

export default function CartoesCorporativos() {
  const isSimulacao = false;

  const [cards, setCards] = useState<CorporateCard[]>(() => {
    return isSimulacao ? [
      { id: 'c-01', holder: 'Geraldo Antunes', role: 'Coordenador de Frota', cardNumber: '•••• •••• •••• 1290', limit: 15000.00, spent: 4890.00, dueDate: '2026-08-10' },
      { id: 'c-02', holder: 'Patrícia Neves', role: 'Diretora Comercial', cardNumber: '•••• •••• •••• 9931', limit: 25000.00, spent: 12500.00, dueDate: '2026-08-10' },
    ] : [];
  });

  const [purchases, setPurchases] = useState<CardPurchase[]>(() => {
    return isSimulacao ? [
      { id: 'p-01', cardId: 'c-01', date: '2026-07-15', establishment: 'Posto Petrobras Salvador', amount: 320.00, costCenter: 'Frota corporativa', receiptAttached: true, status: 'aprovado' },
      { id: 'p-02', cardId: 'c-01', date: '2026-07-18', establishment: 'Pedágio Linha Verde', amount: 45.50, costCenter: 'Frota corporativa', receiptAttached: false, status: 'pendente_comprovante' },
      { id: 'p-03', cardId: 'c-02', date: '2026-07-20', establishment: 'Hotel Ibis Camaçari', amount: 890.00, costCenter: 'Contrato Braskem', receiptAttached: true, status: 'aprovado' },
    ] : [];
  });

  const [selectedCard, setSelectedCard] = useState<CorporateCard | null>(() => cards[0] || null);
  const [showModal, setShowModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  // Form states
  const [holder, setHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [limit, setLimit] = useState(10000);

  // Purchase Form states
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [establishment, setEstablishment] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState(0);
  const [purchaseCostCenter, setPurchaseCostCenter] = useState('Frota corporativa');

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    const newCard: CorporateCard = {
      id: 'c-' + Date.now(),
      holder,
      role: 'Colaborador',
      cardNumber: '•••• •••• •••• ' + cardNumber.slice(-4),
      limit,
      spent: 0,
      dueDate: '2026-08-10'
    };

    setCards(prev => [...prev, newCard]);
    setSelectedCard(newCard);
    setShowModal(false);
  };

  const handleAddPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const newPurchase: CardPurchase = {
      id: 'p-' + Date.now(),
      cardId: selectedCard.id,
      date: purchaseDate,
      establishment,
      amount: purchaseAmount,
      costCenter: purchaseCostCenter,
      receiptAttached: false,
      status: 'pendente_comprovante'
    };

    setPurchases(prev => [...prev, newPurchase]);
    setCards(prev => prev.map(c => {
      if (c.id === selectedCard.id) {
        return { ...c, spent: c.spent + purchaseAmount };
      }
      return c;
    }));
    setShowPurchaseModal(false);
  };

  const handleAttachReceipt = (purchaseId: string) => {
    setPurchases(prev => prev.map(p => {
      if (p.id === purchaseId) {
        return { ...p, receiptAttached: true, status: 'aprovado' };
      }
      return p;
    }));
    alert('✓ Comprovante anexado e enviado para conferência automática!');
  };

  const activePurchases = selectedCard ? purchases.filter(p => p.cardId === selectedCard.id) : [];

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Cartões Corporativos</h3>
          <p className="text-sm text-slate-500">Gestão de limites de cartões empresariais, auditoria de despesas de viagem e conciliação de faturas.</p>
        </div>

        <button 
          onClick={() => {
            setHolder('');
            setCardNumber('');
            setShowModal(true);
          }}
          className="px-4 py-2 bg-royal-blue hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center space-x-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Cadastrar Cartão</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card visual grids */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h4 className="font-bold text-slate-800 text-sm mb-3">Cartões Emitidos</h4>
            <div className="space-y-3">
              {cards.length > 0 ? cards.map(card => {
                const available = card.limit - card.spent;
                const progress = (card.spent / card.limit) * 100;

                return (
                  <div 
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className={`p-4 rounded-xl border cursor-pointer relative overflow-hidden transition-all ${selectedCard?.id === card.id ? 'border-royal-blue ring-1 ring-royal-blue' : 'border-slate-200'}`}
                  >
                    <div className="absolute top-0 right-0 p-2 opacity-5 text-royal-blue">
                      <CreditCard className="h-24 w-24" />
                    </div>

                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-slate-800 text-sm">{card.holder}</h5>
                        <p className="text-[10px] text-slate-400 font-semibold">{card.role}</p>
                      </div>
                      <CreditCard className="h-5 w-5 text-slate-400" />
                    </div>

                    <div className="mt-4 text-xs font-mono font-bold text-slate-700">
                      {card.cardNumber}
                    </div>

                    <div className="mt-4 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Limite Consumido:</span>
                        <span className="font-bold text-slate-800">R$ {card.spent.toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${progress > 85 ? 'bg-rose-500' : 'bg-royal-blue'}`} style={{ width: `${progress}%` }}></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                        <span>Limite Total: R$ {card.limit.toLocaleString('pt-BR')}</span>
                        <span>Fatura vence: {new Date(card.dueDate).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <p className="text-slate-400 text-xs text-center py-4">Nenhum cartão corporativo cadastrado.</p>
              )}
            </div>
          </div>
        </div>

        {/* List of card transactions */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {selectedCard ? (
            <div>
              <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="font-bold text-slate-800">Lançamentos da Fatura Corrente</h4>
                  <p className="text-xs text-slate-500">Extrato detalhado de despesas de {selectedCard.holder}</p>
                </div>

                <button 
                  onClick={() => {
                    setEstablishment('');
                    setPurchaseAmount(0);
                    setShowPurchaseModal(true);
                  }}
                  className="px-3 py-1.5 bg-royal-blue hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Registrar Compra</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-6 py-3">Data Compra</th>
                      <th className="px-6 py-3">Estabelecimento / Serviço</th>
                      <th className="px-6 py-3">Centro de Custo</th>
                      <th className="px-6 py-3 text-right">Valor</th>
                      <th className="px-6 py-3 text-center">Situação Comprovante</th>
                      <th className="px-6 py-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activePurchases.length > 0 ? activePurchases.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-600 font-mono">
                          {new Date(p.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {p.establishment}
                        </td>
                        <td className="px-6 py-4 text-royal-blue font-bold uppercase tracking-wider text-[10px]">
                          {p.costCenter}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">
                          R$ {p.amount.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {p.status === 'aprovado' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                              <CheckCircle className="h-3 w-3 mr-1" /> Aprovado (Recibo OK)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px]">
                              <AlertTriangle className="h-3 w-3 mr-1 animate-pulse" /> Pendente de Anexo
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {!p.receiptAttached ? (
                            <button 
                              onClick={() => handleAttachReceipt(p.id)}
                              className="px-2 py-1 bg-royal-blue text-white rounded text-[10px] font-bold hover:bg-blue-700 flex items-center space-x-1 mx-auto"
                            >
                              <Upload className="h-3 w-3" />
                              <span>Anexar Recibo</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 font-semibold text-[10px]">✓ Conciliado</span>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                          Nenhuma compra efetuada com este cartão corporate na fatura aberta.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <p>Nenhum cartão corporativo selecionado ou cadastrado.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Card Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-lg font-bold text-slate-800">Cadastrar Novo Cartão</h4>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreateCard} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nome do Portador *</label>
                <input type="text" required value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="e.g. Amanda Santos" className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Número do Cartão (16 dígitos) *</label>
                <input type="text" required maxLength={16} value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="4901234567891234" className="w-full border border-slate-300 rounded-lg p-2 text-sm font-mono" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Limite do Cartão (R$) *</label>
                <input type="number" required value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-royal-blue hover:bg-blue-700 text-white rounded-lg text-sm font-bold">Salvar Cartão</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Purchase Modal */}
      {showPurchaseModal && selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-lg font-bold text-slate-800">Lançar Compra em Cartão</h4>
              <button onClick={() => setShowPurchaseModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleAddPurchase} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Portador</label>
                <input type="text" disabled value={selectedCard.holder} className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 text-slate-500 font-semibold" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Estabelecimento / Estabelecimento comercial *</label>
                <input type="text" required value={establishment} onChange={(e) => setEstablishment(e.target.value)} placeholder="e.g. Uber Viagem" className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Valor Gasto (R$) *</label>
                  <input type="number" step="0.01" required value={purchaseAmount} onChange={(e) => setPurchaseAmount(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Data Compra *</label>
                  <input type="date" required value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Centro de Custo de Alocação *</label>
                <select value={purchaseCostCenter} onChange={(e) => setPurchaseCostCenter(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm">
                  <option value="Frota corporativa">Frota corporativa</option>
                  <option value="Laboratório Metrológico">Laboratório Metrológico</option>
                  <option value="Contrato Braskem">Contrato Braskem</option>
                  <option value="Administrativo Sede">Administrativo Sede</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowPurchaseModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-royal-blue hover:bg-blue-700 text-white rounded-lg text-sm font-bold">Lançar Despesa</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
