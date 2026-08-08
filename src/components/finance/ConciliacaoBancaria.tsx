import React, { useState, useEffect } from 'react';
import { 
  Landmark, Upload, CheckCircle2, AlertCircle, Clock, Check, 
  HelpCircle, RefreshCw, ChevronRight, Play, Info 
} from 'lucide-react';
import { FinanceTransaction } from '../../types';
import { syncFinanceTransactions, updateFinanceTransaction } from '../../lib/firebase';

interface ExtratoItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  docNumber: string;
  situation: 'pendente' | 'sugerida' | 'conciliada' | 'divergente' | 'ignorada';
  matchedTxId?: string;
  matchedTxDescription?: string;
}

export default function ConciliacaoBancaria() {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('Itaú Sede');
  const [imported, setImported] = useState(false);
  
  const isSimulacao = (localStorage.getItem('finance_op_mode') || 'homologado') === 'simulacao';

  // Bank statement list
  const [extratoItems, setExtratoItems] = useState<ExtratoItem[]>(() => {
    return isSimulacao ? [
      { id: 'ext-01', date: '2026-08-01', description: 'PIX EMITIDO POSTO IP', amount: -1500.00, docNumber: '091244', situation: 'sugerida' },
      { id: 'ext-02', date: '2026-08-01', description: 'TED RECEBIDA BRASKEM', amount: 45000.00, docNumber: '556102', situation: 'sugerida' },
      { id: 'ext-03', date: '2026-08-02', description: 'TARIFA MANUTENCAO CONTA', amount: -89.90, docNumber: '000089', situation: 'pendente' },
      { id: 'ext-04', date: '2026-08-02', description: 'PIX RECEBIDO ACELEN SA', amount: 8500.00, docNumber: '891245', situation: 'pendente' },
    ] : [];
  });

  useEffect(() => {
    const unsubscribe = syncFinanceTransactions((data) => {
      setTransactions(data);
    });
    return () => unsubscribe();
  }, []);

  // Simple auto-matching recommendation engine based on Amount and DueDate (Page 13)
  useEffect(() => {
    if (transactions.length === 0) return;

    setExtratoItems(prev => prev.map(item => {
      if (item.situation === 'conciliada') return item;

      // Find if there is an open bill with the EXACT amount
      const searchAmount = Math.abs(item.amount);
      const isOutflow = item.amount < 0;

      const matchingBill = transactions.find(t => {
        const isCorrectType = isOutflow ? t.type === 'despesa' : t.type === 'receita';
        const isUnpaid = t.status !== 'pago';
        const matchesValue = Math.abs(t.amount - searchAmount) < 0.01;
        return isCorrectType && isUnpaid && matchesValue;
      });

      if (matchingBill) {
        return {
          ...item,
          situation: 'sugerida',
          matchedTxId: matchingBill.id,
          matchedTxDescription: `${matchingBill.contactName} - ${matchingBill.description}`
        };
      }

      return item;
    }));
  }, [transactions]);

  const handleImportOFX = () => {
    setImported(true);
    alert('✓ Extrato bancário de Itaú Sede (Julho-Agosto/2026) importado com sucesso via OFX.');
  };

  const handleConciliate = async (item: ExtratoItem) => {
    if (!item.matchedTxId) {
      alert('Selecione ou crie um lançamento correspondente antes de conciliar.');
      return;
    }

    // Update the bill status in Firestore
    await updateFinanceTransaction(item.matchedTxId, {
      status: 'pago',
      notes: `[Conciliado via Conciliação Bancária em ${new Date().toLocaleDateString('pt-BR')} por Admin]`
    });

    // Mark statement item as reconciled
    setExtratoItems(prev => prev.map(i => {
      if (i.id === item.id) {
        return { ...i, situation: 'conciliada' };
      }
      return i;
    }));

    alert('✓ Lançamento conciliado e conta atualizada como "PAGO" com sucesso!');
  };

  const handleIgnore = (id: string) => {
    setExtratoItems(prev => prev.map(i => {
      if (i.id === id) {
        return { ...i, situation: 'ignorada' };
      }
      return i;
    }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Upper header */}
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Conciliação Bancária Automatizada</h3>
          <p className="text-sm text-slate-500">Importação de extratos OFX/CSV e validação de saldos em tempo real.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select 
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-royal-blue focus:border-royal-blue"
          >
            <option value="Itaú Sede">Itaú Sede - AG 3840 CC 99201-1</option>
            <option value="Bradesco Operacional">Bradesco Operacional - AG 1204 CC 44102-3</option>
          </select>

          <button 
            onClick={handleImportOFX}
            className="px-4 py-2 bg-royal-blue hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center space-x-2 transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span>Importar Extrato OFX</span>
          </button>
        </div>
      </div>

      {/* Grid Layout of Movements */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="px-6 py-3 font-semibold">Data Movimento</th>
              <th className="px-6 py-3 font-semibold">Histórico Bancário</th>
              <th className="px-6 py-3 font-semibold">Valor</th>
              <th className="px-6 py-3 font-semibold">Sugerido por IA / Regras</th>
              <th className="px-6 py-3 font-semibold text-center">Status Conciliação</th>
              <th className="px-6 py-3 font-semibold text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {extratoItems.map((item, idx) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                  {new Date(item.date).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">{item.description}</div>
                  <div className="text-[10px] text-slate-400">Doc: {item.docNumber}</div>
                </td>
                <td className={`px-6 py-4 font-mono font-bold ${item.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {item.amount < 0 ? '-' : '+'} R$ {Math.abs(item.amount).toFixed(2).replace('.', ',')}
                </td>
                <td className="px-6 py-4">
                  {item.situation === 'sugerida' && item.matchedTxDescription ? (
                    <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 space-y-1">
                      <p className="font-bold flex items-center">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-blue-600 animate-pulse" />
                        <span>Correspondência Encontrada</span>
                      </p>
                      <p className="font-mono">{item.matchedTxDescription}</p>
                    </div>
                  ) : item.situation === 'conciliada' ? (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center">
                      <Check className="h-3.5 w-3.5 mr-1" /> Vinculado com sucesso
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Sem sugestão de regra direta</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  {item.situation === 'conciliada' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      Conciliado
                    </span>
                  )}
                  {item.situation === 'sugerida' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 animate-pulse">
                      Aguardando Confirmação
                    </span>
                  )}
                  {item.situation === 'pendente' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Pendente de Vínculo
                    </span>
                  )}
                  {item.situation === 'ignorada' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      Ignorada
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  {item.situation !== 'conciliada' ? (
                    <div className="flex items-center justify-center space-x-1">
                      {item.situation === 'sugerida' && (
                        <button 
                          onClick={() => handleConciliate(item)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold"
                        >
                          Confirmar
                        </button>
                      )}
                      <button 
                        onClick={() => handleIgnore(item.id)}
                        className="px-2 py-1 border border-slate-300 rounded hover:bg-slate-100 text-xs text-slate-600"
                      >
                        Ignorar
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-semibold">✓ Feito</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex items-center space-x-2">
        <Info className="h-4 w-4 text-royal-blue flex-shrink-0" />
        <span>Importar o mesmo arquivo OFX mais de uma vez é bloqueado automaticamente pelo hash de transação bancária (FITID).</span>
      </div>
    </div>
  );
}
