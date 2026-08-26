import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet, Upload, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { importFinanceTransactions } from '../../lib/firebase';
import type { FinanceTransaction } from '../../types';

interface FinanceImportProps {
  canEdit: boolean;
}

type PreviewRow = Partial<FinanceTransaction> & { settlementDate?: string; _row: number; _errors: string[] };

const normalizeHeader = (value: unknown) => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const parseAmount = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value ?? '').trim();
  if (!text) return null;
  const normalized = text.replace(/R\$/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDate = (value: unknown): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${String(parsed.y).padStart(4, '0')}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  const text = String(value ?? '').trim();
  if (!text) return '';
  const dmy = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  const ymd = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  return '';
};

const pick = (row: Record<string, any>, ...keys: string[]) => {
  for (const key of keys) if (row[key] !== undefined && String(row[key]).trim() !== '') return row[key];
  return '';
};

const mapRow = (raw: Record<string, any>, rowNumber: number): PreviewRow => {
  const row: Record<string, any> = {};
  Object.entries(raw).forEach(([key, value]) => { row[normalizeHeader(key)] = value; });

  const rawType = String(pick(row, 'tipo', 'type')).trim().toLowerCase();
  const type: FinanceTransaction['type'] | undefined = rawType.startsWith('rec') ? 'receita' : rawType.startsWith('des') ? 'despesa' : undefined;
  const amount = parseAmount(pick(row, 'valor_liquido', 'valor', 'amount'));
  const grossAmount = parseAmount(pick(row, 'valor_bruto', 'gross_amount'));
  const retentions = parseAmount(pick(row, 'retencoes', 'retencao', 'retentions'));
  const paidAmount = parseAmount(pick(row, 'valor_baixado', 'valor_pago', 'valor_recebido', 'paid_amount'));
  const settlementDate = parseDate(pick(row, 'data_da_baixa', 'data_baixa', 'data_pagamento', 'data_recebimento', 'settlement_date'));
  const date = parseDate(pick(row, 'data', 'data_competencia', 'date'));
  const dueDate = parseDate(pick(row, 'vencimento', 'data_vencimento', 'due_date')) || date;
  const rawStatus = String(pick(row, 'status')).trim().toLowerCase();
  const status: FinanceTransaction['status'] = ['pendente', 'pago', 'atrasado', 'cancelado'].includes(rawStatus)
    ? rawStatus as FinanceTransaction['status']
    : (paidAmount && amount && paidAmount >= amount ? 'pago' : 'pendente');

  const errors: string[] = [];
  if (!type) errors.push('Tipo deve ser Receita ou Despesa');
  if (!String(pick(row, 'descricao', 'description')).trim()) errors.push('Descrição obrigatória');
  if (amount === null || amount <= 0) errors.push('Valor líquido inválido');
  if (!date) errors.push('Data inválida');
  if (!dueDate) errors.push('Vencimento inválido');
  if (grossAmount !== null && amount !== null && grossAmount < amount) errors.push('Valor bruto não pode ser menor que o líquido');
  if (retentions !== null && retentions < 0) errors.push('Retenções inválidas');
  if (paidAmount !== null && amount !== null && paidAmount > amount) errors.push('Valor baixado excede o valor do título');
  if (((paidAmount || 0) > 0 || status === 'pago') && !settlementDate) errors.push('Data da Baixa é obrigatória quando houver Valor Baixado ou status Pago');

  return {
    _row: rowNumber,
    _errors: errors,
    type,
    description: String(pick(row, 'descricao', 'description')).trim(),
    amount: amount ?? 0,
    grossAmount: grossAmount ?? undefined,
    retentions: retentions ?? undefined,
    paidAmount: paidAmount ?? undefined,
    settlementDate: settlementDate || undefined,
    date,
    dueDate,
    status,
    category: String(pick(row, 'categoria', 'category')).trim(),
    costCenter: String(pick(row, 'centro_de_custo', 'centro_custo', 'cost_center')).trim(),
    contractNumber: String(pick(row, 'contrato', 'numero_contrato', 'contract_number')).trim(),
    contractClientName: String(pick(row, 'cliente_contrato', 'contract_client_name')).trim(),
    bankAccount: String(pick(row, 'conta_bancaria', 'bank_account')).trim(),
    paymentMethod: String(pick(row, 'forma_pagamento', 'meio_pagamento', 'payment_method')).trim(),
    contactName: String(pick(row, 'fornecedor_cliente', 'contato', 'contact_name')).trim(),
    contactDocument: String(pick(row, 'cpf_cnpj', 'documento_contato', 'contact_document')).trim(),
    documentNumber: String(pick(row, 'documento_nf', 'nf', 'numero_documento', 'document_number')).trim(),
    notes: String(pick(row, 'observacoes', 'notes')).trim(),
  };
};

export default function FinanceImport({ canEdit }: FinanceImportProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const validRows = useMemo(() => rows.filter((row) => row._errors.length === 0), [rows]);
  const invalidRows = rows.length - validRows.length;

  const downloadTemplate = () => {
    const headers = [[
      'Tipo', 'Descrição', 'Valor Líquido', 'Valor Bruto', 'Retenções', 'Data', 'Vencimento', 'Status',
      'Categoria', 'Centro de Custo', 'Contrato', 'Cliente Contrato', 'Conta Bancária', 'Forma Pagamento',
      'Fornecedor/Cliente', 'CPF/CNPJ', 'Documento/NF', 'Valor Baixado', 'Data da Baixa', 'Observações'
    ]];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = headers[0].map((header) => ({ wch: Math.max(14, header.length + 2) }));
    const instructions = XLSX.utils.aoa_to_sheet([
      ['INSTRUÇÕES'],
      ['Não altere os nomes das colunas da aba Importação.'],
      ['Tipo: Receita ou Despesa. Datas: DD/MM/AAAA ou AAAA-MM-DD.'],
      ['Valor Líquido é o valor original do título. Baixas parciais não reduzem esse valor.'],
      ['Valor Baixado é opcional. Se for maior que zero, Data da Baixa passa a ser obrigatória e será usada no regime de caixa.'],
      ['Máximo de 1.000 linhas por importação.'],
      ['A aba Importação é entregue sem linha fictícia para evitar cadastro acidental de dados demonstrativos.'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Importação');
    XLSX.utils.book_append_sheet(wb, instructions, 'Instruções');
    XLSX.writeFile(wb, 'MODELO_IMPORTACAO_FINANCEIRA_COMANINS.xlsx');
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setMessage('');
    setRows([]);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      const sheetName = wb.SheetNames.includes('Importação') ? 'Importação' : wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '', raw: true });
      if (raw.length === 0) throw new Error('A planilha não contém lançamentos.');
      if (raw.length > 1000) throw new Error('A planilha excede o limite de 1.000 lançamentos por lote.');
      setRows(raw.map((item, index) => mapRow(item, index + 2)));
    } catch (error: any) {
      setMessage(error?.message || 'Não foi possível ler a planilha.');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const runImport = async () => {
    if (!canEdit || validRows.length === 0 || invalidRows > 0) return;
    setLoading(true);
    setMessage('');
    try {
      const payload = validRows.map(({ _row, _errors, ...item }) => item);
      const result = await importFinanceTransactions(payload);
      const details = result.errors.length ? ` ${result.errors.length} linha(s) rejeitada(s) pelo servidor.` : '';
      setMessage(`Importação concluída: ${result.imported} incluído(s), ${result.skipped} duplicado(s).${details}`);
      if (result.errors.length === 0) setRows([]);
    } catch (error: any) {
      setMessage(error?.message || 'Falha durante a importação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-emerald-600" /> Importar lançamentos XLS/XLSX</h3>
            <p className="text-sm text-slate-500 mt-1">Importação validada de receitas e despesas, com prevenção de reimportação duplicada.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadTemplate} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold flex items-center gap-2 hover:bg-slate-50"><Download className="h-4 w-4" /> Baixar modelo</button>
            <button disabled={!canEdit} onClick={() => inputRef.current?.click()} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><Upload className="h-4 w-4" /> Selecionar planilha</button>
            <input ref={inputRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
          </div>
        </div>
        {!canEdit && <div className="mt-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3"><AlertTriangle className="h-4 w-4 inline mr-1" /> Seu perfil possui somente visualização do Financeiro. A importação exige permissão Editar.</div>}
        {message && <div className="mt-4 text-sm bg-slate-50 border border-slate-200 rounded-lg p-3">{message}</div>}
      </div>

      {rows.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-bold text-slate-800">Pré-validação — {fileName}</div>
              <div className="text-xs text-slate-500 mt-1">{rows.length} linha(s): <span className="text-emerald-700 font-bold">{validRows.length} válida(s)</span> · <span className="text-rose-700 font-bold">{invalidRows} com erro</span></div>
            </div>
            <button disabled={!canEdit || loading || invalidRows > 0 || validRows.length === 0} onClick={runImport} className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed">{loading ? 'Importando...' : 'Confirmar importação'}</button>
          </div>
          <div className="overflow-x-auto max-h-[520px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 sticky top-0"><tr><th className="px-3 py-2">Linha</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Descrição</th><th className="px-3 py-2 text-right">Valor</th><th className="px-3 py-2">Data</th><th className="px-3 py-2">Vencimento</th><th className="px-3 py-2">Data da Baixa</th><th className="px-3 py-2">Validação</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => <tr key={row._row} className={row._errors.length ? 'bg-rose-50/50' : ''}>
                  <td className="px-3 py-2 font-mono">{row._row}</td>
                  <td className="px-3 py-2">{row._errors.length ? <XCircle className="h-4 w-4 text-rose-600" /> : <CheckCircle className="h-4 w-4 text-emerald-600" />}</td>
                  <td className="px-3 py-2 capitalize">{row.type || '—'}</td><td className="px-3 py-2 min-w-[240px]">{row.description || '—'}</td>
                  <td className="px-3 py-2 text-right font-mono">R$ {Number(row.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td className="px-3 py-2">{row.date || '—'}</td><td className="px-3 py-2">{row.dueDate || '—'}</td><td className="px-3 py-2">{row.settlementDate || '—'}</td>
                  <td className="px-3 py-2 text-rose-700">{row._errors.join('; ') || 'OK'}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
