import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, FilePlus2, Landmark, Link2, Upload, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { FinanceBankStatementItem, FinanceTransaction } from '../../types';
import { importFinanceBankStatement, reconcileFinanceBankStatementItem, syncFinanceBankStatementItems, syncFinanceCollection, syncFinanceTransactions } from '../../lib/firebase';

interface Props { canEdit?: boolean; }
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const openOf = (item: FinanceTransaction) => Math.max(0, Number.isFinite(Number(item.openBalance)) ? Number(item.openBalance) : Number(item.amount || 0) - Number(item.paidAmount || 0));
const inputClass = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const normalizeHeader = (value: unknown) => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const ofxTag = (block: string, tag: string) => {
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i'));
  return String(match?.[1] || '').trim();
};
const parseOfx = (text: string) => {
  const blocks = Array.from(text.matchAll(/<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>|<\/BANKTRANLIST>))/gi)).map(match => match[1]);
  const items = blocks.map((block, index) => {
    const rawDate = ofxTag(block, 'DTPOSTED').replace(/\D/g, '').slice(0, 8);
    const date = rawDate.length === 8 ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}` : '';
    const amount = Number(ofxTag(block, 'TRNAMT').replace(',', '.'));
    const name = ofxTag(block, 'NAME');
    const memo = ofxTag(block, 'MEMO');
    return { date, amount, description: [name, memo].filter(Boolean).join(' - ') || `Movimento ${index + 1}`, externalId: ofxTag(block, 'FITID'), documentNumber: ofxTag(block, 'CHECKNUM') };
  }).filter(item => item.date && Number.isFinite(item.amount) && Math.abs(item.amount) > 0.00001);
  const endingBalanceText = ofxTag(text, 'BALAMT');
  const endingBalance = endingBalanceText ? Number(endingBalanceText.replace(',', '.')) : null;
  return { items, endingBalance: Number.isFinite(Number(endingBalance)) ? Number(endingBalance) : null };
};

const parseSpreadsheet = (buffer: ArrayBuffer) => {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
  const items = raw.map((row, index) => {
    const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]));
    const pick = (...keys: string[]) => {
      for (const key of keys.map(normalizeHeader)) if (normalized[key] !== undefined && String(normalized[key]).trim() !== '') return normalized[key];
      return '';
    };
    const rawDate = pick('Data', 'Data Movimento', 'DTPOSTED');
    let date = '';
    if (typeof rawDate === 'number') {
      const parsed = XLSX.SSF.parse_date_code(rawDate); if (parsed) date = `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    } else {
      const text = String(rawDate).trim();
      const dmy = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/); const ymd = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
      if (dmy) date = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`; else if (ymd) date = `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
    }
    const value = pick('Valor', 'TRNAMT', 'Amount');
    const textValue = String(value ?? '').trim().replace(/R\$/gi, '').replace(/\s/g, '');
    const amount = typeof value === 'number' ? value : Number(textValue.includes(',') ? textValue.replace(/\./g, '').replace(',', '.') : textValue);
    return { date, amount, description: String(pick('Descrição', 'Historico', 'Histórico', 'Memo', 'Name') || `Movimento ${index + 1}`).trim(), externalId: String(pick('ID', 'FITID', 'Identificador')).trim(), documentNumber: String(pick('Documento', 'Doc', 'CHECKNUM')).trim() };
  }).filter(item => item.date && Number.isFinite(item.amount) && Math.abs(item.amount) > 0.00001);
  return { items, endingBalance: null as number | null };
};

export default function FinanceBankReconciliation({ canEdit = false }: Props) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [statementItems, setStatementItems] = useState<FinanceBankStatementItem[]>([]);
  const [accountId, setAccountId] = useState('');
  const [selectedMatches, setSelectedMatches] = useState<Record<string, string>>({});
  const [showResolved, setShowResolved] = useState(false);
  const [busyId, setBusyId] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const a = syncFinanceCollection<any>('financeBankAccounts', data => { setAccounts(data); setAccountId(current => current || data[0]?.id || ''); }, 200);
    const t = syncFinanceTransactions(setTransactions);
    const s = syncFinanceBankStatementItems(setStatementItems);
    return () => { a(); t(); s(); };
  }, []);

  const account = accounts.find(item => item.id === accountId);
  const accountLabel = account ? `${account.bank || 'Banco'} • Ag ${account.agency || '—'} • C/C ${account.account || '—'}` : '';
  const items = statementItems.filter(item => item.bankAccountId === accountId && (showResolved || item.status === 'pendente'));

  const candidatesFor = (item: FinanceBankStatementItem) => {
    const expected = item.amount < 0 ? 'despesa' : 'receita';
    return transactions.filter(tx => tx.type === expected && tx.status !== 'cancelado' && openOf(tx) + 0.00001 >= Math.abs(item.amount)).sort((a, b) => {
      const exactA = Math.abs(openOf(a) - Math.abs(item.amount)) < 0.01 ? 0 : 1;
      const exactB = Math.abs(openOf(b) - Math.abs(item.amount)) < 0.01 ? 0 : 1;
      return exactA - exactB || String(a.dueDate).localeCompare(String(b.dueDate));
    }).slice(0, 50);
  };

  const suggested = (item: FinanceBankStatementItem) => candidatesFor(item).find(tx => Math.abs(openOf(tx) - Math.abs(item.amount)) < 0.01);

  const handleFile = async (file?: File) => {
    if (!file || !account) return;
    try {
      const ext = file.name.toLowerCase().split('.').pop();
      let parsed: { items: Array<{ date: string; description: string; amount: number; externalId?: string; documentNumber?: string }>; endingBalance: number | null };
      if (ext === 'ofx') parsed = parseOfx(await file.text()); else parsed = parseSpreadsheet(await file.arrayBuffer());
      if (parsed.items.length === 0) throw new Error('Nenhuma movimentação válida foi encontrada no arquivo.');
      if (!confirm(`Importar ${parsed.items.length} movimento(s) para ${accountLabel}?`)) return;
      const result = await importFinanceBankStatement({ bankAccountId: account.id, bankAccountLabel: accountLabel, endingBalance: parsed.endingBalance, items: parsed.items });
      alert(`Extrato importado. Novos: ${result.imported}. Já existentes: ${result.skipped}.`);
    } catch (error: any) {
      alert(error?.message || 'Não foi possível importar o extrato.');
    } finally { if (fileRef.current) fileRef.current.value = ''; }
  };

  const reconcile = async (item: FinanceBankStatementItem, action: 'match' | 'create_and_match' | 'ignore') => {
    if (!canEdit) return;
    const transactionId = selectedMatches[item.id] || suggested(item)?.id;
    if (action === 'match' && !transactionId) { alert('Selecione um lançamento correspondente.'); return; }
    const message = action === 'ignore' ? 'Ignorar este movimento bancário?' : action === 'create_and_match' ? 'Criar um lançamento financeiro já pago e conciliar este movimento?' : 'Confirmar a conciliação com o lançamento selecionado?';
    if (!confirm(message)) return;
    setBusyId(item.id);
    try { await reconcileFinanceBankStatementItem(item.id, { action, transactionId }); }
    catch (error: any) { alert(error?.message || 'Não foi possível conciliar.'); }
    finally { setBusyId(''); }
  };

  const pendingCount = statementItems.filter(item => item.bankAccountId === accountId && item.status === 'pendente').length;
  const reconciledCount = statementItems.filter(item => item.bankAccountId === accountId && item.status === 'conciliado').length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <h4 className="font-extrabold text-slate-900">Bancos e Conciliação</h4>
            <p className="text-xs text-slate-500">Importe o extrato. O sistema sugere a conta correspondente e registra a baixa sem duplicar pagamentos.</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]"><span className="rounded-full bg-amber-50 px-2.5 py-1 font-bold text-amber-700">{pendingCount} pendente(s)</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">{reconciledCount} conciliado(s)</span></div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label><span className="mb-1 block text-[10px] font-bold uppercase text-slate-500">Conta bancária</span><select className={`${inputClass} min-w-[260px]`} value={accountId} onChange={e => setAccountId(e.target.value)}>{accounts.length === 0 && <option value="">Cadastre uma conta primeiro</option>}{accounts.map(item => <option key={item.id} value={item.id}>{item.bank} • Ag {item.agency || '—'} • C/C {item.account}</option>)}</select></label>
            <button disabled={!canEdit || !accountId} onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"><Upload className="h-4 w-4" />Importar extrato</button>
            <input ref={fileRef} className="hidden" type="file" accept=".ofx,.csv,.xls,.xlsx" onChange={e => handleFile(e.target.files?.[0])} />
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium"><input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} /> Mostrar conciliados</label>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-xs">
            <thead className="bg-slate-50 font-bold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Extrato</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Lançamento correspondente</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Nenhuma movimentação para exibir nesta conta.</td></tr> : items.map(item => {
                const suggestion = suggested(item); const candidates = candidatesFor(item); const selected = selectedMatches[item.id] || suggestion?.id || '';
                return <tr key={item.id} className="align-top hover:bg-slate-50/50"><td className="px-4 py-4"><div className="font-bold text-slate-800">{item.description}</div><div className="mt-1 text-slate-500">{new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR')} • Doc {item.documentNumber || item.externalId || '—'}</div></td><td className={`px-4 py-4 font-mono font-bold ${item.amount < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{item.amount < 0 ? '-' : '+'}{money(Math.abs(item.amount))}</td><td className="px-4 py-4">{item.status === 'pendente' ? <><select className={`${inputClass} w-full min-w-[330px] text-xs`} value={selected} onChange={e => setSelectedMatches({ ...selectedMatches, [item.id]: e.target.value })}><option value="">Selecione um lançamento...</option>{candidates.map(tx => <option key={tx.id} value={tx.id}>{tx.description} • {money(openOf(tx))} • venc. {tx.dueDate ? new Date(`${tx.dueDate}T12:00:00`).toLocaleDateString('pt-BR') : '—'}</option>)}</select>{suggestion && <div className="mt-1 text-[10px] font-bold text-blue-700">Sugestão automática por valor exato.</div>}</> : <span className="font-medium text-slate-600">{item.matchedTransactionDescription || item.matchedTransactionId || '—'}</span>}</td><td className="px-4 py-4">{item.status === 'conciliado' ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Conciliado</span> : item.status === 'ignorado' ? <span className="rounded-full bg-slate-100 px-2 py-1 font-bold text-slate-600">Ignorado</span> : <span className="rounded-full bg-amber-50 px-2 py-1 font-bold text-amber-700">Pendente</span>}</td><td className="px-4 py-4"><div className="flex justify-end gap-1">{item.status === 'pendente' && canEdit && <><button disabled={busyId === item.id || !selected} onClick={() => reconcile(item, 'match')} title="Conciliar com lançamento" className="rounded-lg bg-emerald-50 p-2 text-emerald-700 disabled:opacity-40"><Link2 className="h-4 w-4" /></button><button disabled={busyId === item.id} onClick={() => reconcile(item, 'create_and_match')} title="Criar lançamento e conciliar" className="rounded-lg bg-blue-50 p-2 text-blue-700"><FilePlus2 className="h-4 w-4" /></button><button disabled={busyId === item.id} onClick={() => reconcile(item, 'ignore')} title="Ignorar" className="rounded-lg bg-slate-100 p-2 text-slate-600"><XCircle className="h-4 w-4" /></button></>}</div></td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-[11px] text-blue-800"><Landmark className="mt-0.5 h-4 w-4 shrink-0" /><span>Se não existir lançamento correspondente, use <strong>Criar lançamento e conciliar</strong>. O sistema cria o pagamento/recebimento já baixado e mantém o vínculo com o movimento do extrato.</span></div>
    </div>
  );
}
