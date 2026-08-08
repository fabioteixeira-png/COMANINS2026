import React, { useState } from 'react';
import { 
  Plus, Search, Landmark, Percent, Calendar, FileText, CheckCircle2, 
  Trash2, X, PlusCircle, AlertCircle 
} from 'lucide-react';

interface Loan {
  id: string;
  creditor: string;
  type: string;
  amount: number;
  interestRate: number; // e.g. 1.2% a.m.
  installments: number;
  startDate: string;
  balance: number;
}

export default function EmprestimosFinanciamentos() {
  const isSimulacao = (localStorage.getItem('finance_op_mode') || 'homologado') === 'simulacao';

  const [loans, setLoans] = useState<Loan[]>(() => {
    return isSimulacao ? [
      { id: 'l-01', creditor: 'Banco do Brasil', type: 'Capital de Giro', amount: 150000.00, interestRate: 1.15, installments: 24, startDate: '2026-01-15', balance: 112500.00 },
      { id: 'l-02', creditor: 'Itaú BBA', type: 'Financiamento Frota', amount: 80000.00, interestRate: 0.95, installments: 36, startDate: '2025-06-10', balance: 45000.00 },
    ] : [];
  });

  const [showModal, setShowModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(() => loans[0] || null);

  // Form states
  const [creditor, setCreditor] = useState('');
  const [type, setType] = useState('Capital de Giro');
  const [amount, setAmount] = useState(0);
  const [interestRate, setInterestRate] = useState(1.2);
  const [installments, setInstallments] = useState(24);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newLoan: Loan = {
      id: 'l-' + Date.now(),
      creditor,
      type,
      amount,
      interestRate,
      installments,
      startDate,
      balance: amount
    };

    setLoans(prev => [...prev, newLoan]);
    setSelectedLoan(newLoan);
    setShowModal(false);
  };

  // Generate Price amortization table
  const generateAmortizationTable = (loan: Loan) => {
    const table = [];
    let currentBal = loan.amount;
    const rateDecimal = (loan.interestRate) / 100;
    
    // PMT = BB * [i * (1 + i)^n] / [(1 + i)^n - 1]
    const pmt = loan.amount * (rateDecimal * Math.pow(1 + rateDecimal, loan.installments)) / (Math.pow(1 + rateDecimal, loan.installments) - 1);

    for (let i = 1; i <= loan.installments; i++) {
      const interest = currentBal * rateDecimal;
      const amortization = pmt - interest;
      currentBal = Math.max(0, currentBal - amortization);

      table.push({
        installmentNum: i,
        pmt: pmt,
        interest: interest,
        amortization: amortization,
        endingBalance: currentBal,
        dueDate: new Date(new Date(loan.startDate).setMonth(new Date(loan.startDate).getMonth() + i)).toLocaleDateString('pt-BR')
      });
    }

    return table;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Empréstimos e Financiamentos</h3>
          <p className="text-sm text-slate-500">Controle de passivos financeiros, cronogramas de amortização Price/SAC e despesas com juros.</p>
        </div>

        <button 
          onClick={() => {
            setCreditor('');
            setAmount(0);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-royal-blue hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center space-x-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Financiamento</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Debt list */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h4 className="font-bold text-slate-800 text-sm mb-3">Linhas de Crédito Ativas</h4>
            <div className="space-y-2">
              {loans.map(loan => (
                <div 
                  key={loan.id}
                  onClick={() => setSelectedLoan(loan)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedLoan?.id === loan.id ? 'bg-blue-50/50 border-royal-blue shadow-sm' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-bold text-slate-800 text-sm">{loan.creditor}</h5>
                      <span className="inline-block text-[10px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded mt-1">{loan.type}</span>
                    </div>
                    <Landmark className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="mt-3 flex justify-between items-baseline">
                    <span className="text-xs text-slate-500">Saldo Devedor:</span>
                    <span className="font-mono font-bold text-slate-800">R$ {loan.balance.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Amortization schedule details */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {selectedLoan ? (
            <div>
              <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-800">Cronograma de Liquidação - {selectedLoan.creditor}</h4>
                  <p className="text-xs text-slate-500">Taxa de {selectedLoan.interestRate}% a.m. (Tabela Price) • {selectedLoan.installments} parcelas</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Captação:</span>
                  <div className="font-mono font-bold text-sm text-slate-800">R$ {selectedLoan.amount.toLocaleString('pt-BR')}</div>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3">Nº Parcela</th>
                      <th className="px-6 py-3">Vencimento</th>
                      <th className="px-6 py-3 text-right">Prestação (PMT)</th>
                      <th className="px-6 py-3 text-right">Juros (Despesa)</th>
                      <th className="px-6 py-3 text-right">Amortização</th>
                      <th className="px-6 py-3 text-right">Saldo Devedor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {generateAmortizationTable(selectedLoan).map((row) => (
                      <tr key={row.installmentNum} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-slate-800 font-bold">#{row.installmentNum}</td>
                        <td className="px-6 py-3 text-slate-500">{row.dueDate}</td>
                        <td className="px-6 py-3 text-right text-slate-800 font-bold">R$ {row.pmt.toFixed(2)}</td>
                        <td className="px-6 py-3 text-right text-rose-600">R$ {row.interest.toFixed(2)}</td>
                        <td className="px-6 py-3 text-right text-emerald-600">R$ {row.amortization.toFixed(2)}</td>
                        <td className="px-6 py-3 text-right text-slate-700">R$ {row.endingBalance.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <p>Nenhum financiamento cadastrado.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Loan Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h4 className="text-lg font-bold text-slate-800">Novo Empréstimo / Financiamento</h4>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Creditor / Banco *</label>
                <input type="text" required value={creditor} onChange={(e) => setCreditor(e.target.value)} placeholder="e.g. Banco Safra" className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Modalidade *</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm">
                  <option value="Capital de Giro">Capital de Giro</option>
                  <option value="Financiamento Frota">Financiamento Frota</option>
                  <option value="Leasing Equipamento">Leasing Equipamento</option>
                  <option value="Mútuo Administrativo">Mútuo Administrativo</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Principal Captado (R$) *</label>
                  <input type="number" required value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Taxa Juros (% a.m.) *</label>
                  <input type="number" step="0.01" required value={interestRate} onChange={(e) => setInterestRate(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nº Parcelas *</label>
                  <input type="number" required value={installments} onChange={(e) => setInstallments(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Data Captação *</label>
                  <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-royal-blue hover:bg-blue-700 text-white rounded-lg text-sm font-bold">Salvar Operação</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
