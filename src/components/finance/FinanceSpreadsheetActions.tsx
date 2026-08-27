import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { AlertTriangle, CheckCircle, Download, FileSpreadsheet, Upload, X, XCircle } from 'lucide-react';
import { importFinanceModuleRows, importFinanceTransactions } from '../../lib/firebase';
import type { FinanceContract, FinanceMeasurement, FinanceTransaction } from '../../types';

export type FinanceSpreadsheetEntity = 'payables' | 'receivables' | 'contracts' | 'measurements' | 'bankAccounts' | 'categories';

type PreviewRow = {
  rowNumber: number;
  summary: string;
  payload: Record<string, any>;
  errors: string[];
};

interface FinanceSpreadsheetActionsProps {
  entity: FinanceSpreadsheetEntity;
  canEdit: boolean;
  exportRows: any[];
  compact?: boolean;
}

const normalizeHeader = (value: unknown) => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const pick = (row: Record<string, any>, ...keys: string[]) => {
  for (const key of keys) {
    if (row[key] !== undefined && String(row[key]).trim() !== '') return row[key];
  }
  return '';
};

const parseAmount = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value ?? '').trim();
  if (!text) return null;
  const normalized = text
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseInteger = (value: unknown, fallback = 1): number => {
  const parsed = Number(String(value ?? '').replace(/\D/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
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

const formatExportDate = (value: unknown) => {
  const date = parseDate(value);
  if (!date) return String(value || '');
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
};

const statusLabel = (value: unknown) => {
  const text = String(value || '').trim();
  const labels: Record<string, string> = {
    pendente: 'Pendente', pago: 'Pago', atrasado: 'Atrasado', cancelado: 'Cancelado',
    ativo: 'Ativo', encerrado: 'Encerrado', suspenso: 'Suspenso',
    em_analise: 'Em Análise', aprovada: 'Aprovada', faturada: 'Faturada', cancelada: 'Cancelada',
  };
  return labels[text] || text;
};

const ENTITY_META: Record<FinanceSpreadsheetEntity, { label: string; sheet: string; file: string; template: string; instructions: string[] }> = {
  payables: {
    label: 'Contas a Pagar', sheet: 'Contas a Pagar', file: 'CONTAS_A_PAGAR_COMANINS', template: 'MODELO_CONTAS_A_PAGAR_COMANINS',
    instructions: [
      'Use esta planilha para cadastrar despesas em lote. O tipo do lançamento é definido automaticamente como Despesa.',
      'Datas aceitas: DD/MM/AAAA ou AAAA-MM-DD. Valores aceitam formato brasileiro ou numérico.',
      'Valor Baixado e Data da Baixa são opcionais para carga inicial. Se houver baixa, a data é obrigatória.',
      'Registros já importados com a mesma composição são ignorados para evitar duplicidade.',
    ],
  },
  receivables: {
    label: 'Contas a Receber', sheet: 'Contas a Receber', file: 'CONTAS_A_RECEBER_COMANINS', template: 'MODELO_CONTAS_A_RECEBER_COMANINS',
    instructions: [
      'Use esta planilha para cadastrar receitas em lote. O tipo do lançamento é definido automaticamente como Receita.',
      'Valor Líquido representa o valor original do título. Valor Bruto e Retenções são opcionais.',
      'Valor Baixado e Data da Baixa são opcionais para carga inicial. Se houver baixa, a data é obrigatória.',
      'Registros já importados com a mesma composição são ignorados para evitar duplicidade.',
    ],
  },
  contracts: {
    label: 'Contratos', sheet: 'Contratos', file: 'CONTRATOS_FINANCEIROS_COMANINS', template: 'MODELO_CONTRATOS_FINANCEIROS_COMANINS',
    instructions: [
      'Número do Contrato é a chave operacional usada para impedir duplicidades.',
      'Status permitidos: Ativo, Suspenso ou Encerrado.',
      'A importação cria novos contratos e ignora números de contrato já existentes; não altera contratos existentes silenciosamente.',
    ],
  },
  measurements: {
    label: 'Medições', sheet: 'Medições', file: 'MEDICOES_FINANCEIRAS_COMANINS', template: 'MODELO_MEDICOES_FINANCEIRAS_COMANINS',
    instructions: [
      'Informe Número do Contrato, Cliente, Período, Tipo de Serviço, Valor e Data de Envio.',
      'Status permitidos: Em Análise, Aprovada, Faturada ou Cancelada.',
      'A importação cria novas medições e ignora linhas já existentes com a mesma chave operacional.',
    ],
  },
  bankAccounts: {
    label: 'Contas Bancárias', sheet: 'Contas Bancárias', file: 'CONTAS_BANCARIAS_COMANINS', template: 'MODELO_CONTAS_BANCARIAS_COMANINS',
    instructions: [
      'Banco, Agência, Conta e Tipo identificam a conta. O saldo informado é o saldo inicial de cadastro.',
      'Uma conta com a mesma combinação Banco + Agência + Conta é ignorada para evitar duplicidade.',
    ],
  },
  categories: {
    label: 'Plano de Contas', sheet: 'Plano de Contas', file: 'PLANO_DE_CONTAS_COMANINS', template: 'MODELO_PLANO_DE_CONTAS_COMANINS',
    instructions: [
      'Código e Nome são obrigatórios. O código contábil é usado para impedir duplicidade.',
      'Status padrão: Ativo. A importação não sobrescreve categorias existentes silenciosamente.',
    ],
  },
};

const templateHeaders = (entity: FinanceSpreadsheetEntity): string[] => {
  switch (entity) {
    case 'payables':
      return ['Descrição', 'Valor', 'Data Competência', 'Vencimento', 'Categoria', 'Centro de Custo', 'Fornecedor', 'CPF/CNPJ', 'Documento/NF', 'Forma de Pagamento', 'Conta Bancária', 'Contrato', 'Parcelas', 'Status', 'Valor Baixado', 'Data da Baixa', 'Observações'];
    case 'receivables':
      return ['Descrição', 'Valor Líquido', 'Valor Bruto', 'Retenções', 'Data Competência', 'Vencimento', 'Categoria', 'Centro de Custo', 'Cliente', 'CPF/CNPJ', 'Documento/NF', 'Contrato', 'Cliente Contrato', 'Forma de Pagamento', 'Conta Bancária', 'Status', 'Valor Baixado', 'Data da Baixa', 'Observações'];
    case 'contracts':
      return ['Cliente', 'Número do Contrato', 'Descrição', 'Valor Global', 'Data Inicial', 'Data Final', 'Status', 'Centro de Custo'];
    case 'measurements':
      return ['Número do Contrato', 'Cliente', 'Período', 'Tipo de Serviço', 'Valor', 'Status', 'Data de Envio', 'Número NF'];
    case 'bankAccounts':
      return ['Banco', 'Agência', 'Conta', 'Tipo', 'Saldo Inicial'];
    case 'categories':
      return ['Código', 'Nome', 'Tipo', 'Status'];
  }
};

const transactionExportRow = (item: FinanceTransaction) => ({
  'ID Sistema': item.id || '',
  'Descrição': item.description || '',
  'Valor Original': Number(item.amount || 0),
  'Valor Bruto': Number(item.grossAmount || item.amount || 0),
  'Retenções': Number(item.retentions || 0),
  'Data Competência': formatExportDate(item.date),
  'Vencimento': formatExportDate(item.dueDate),
  'Categoria': item.category || '',
  'Centro de Custo': item.costCenter || '',
  'Fornecedor/Cliente': item.contactName || '',
  'CPF/CNPJ': item.contactDocument || '',
  'Documento/NF': item.documentNumber || '',
  'Contrato': item.contractNumber || '',
  'Cliente Contrato': item.contractClientName || '',
  'Forma de Pagamento': item.paymentMethod || '',
  'Conta Bancária': item.bankAccount || '',
  'Status': statusLabel(item.status),
  'Valor Baixado': Number(item.paidAmount || 0),
  'Saldo em Aberto': Number(item.openBalance ?? Math.max(0, Number(item.amount || 0) - Number(item.paidAmount || 0))),
  'Data da Baixa': Array.isArray(item.settlements) && item.settlements.length ? formatExportDate(item.settlements[item.settlements.length - 1]?.date) : '',
  'Parcelas': Number(item.installments || 1),
  'Observações': item.notes || '',
});

const exportRowsForEntity = (entity: FinanceSpreadsheetEntity, rows: any[]) => {
  switch (entity) {
    case 'payables':
    case 'receivables':
      return rows.map((item) => transactionExportRow(item as FinanceTransaction));
    case 'contracts':
      return rows.map((item: FinanceContract) => ({
        'ID Sistema': item.id || '', 'Cliente': item.clientName || '', 'Número do Contrato': item.contractNumber || '', 'Descrição': item.description || '',
        'Valor Global': Number(item.value || 0), 'Data Inicial': formatExportDate(item.startDate), 'Data Final': formatExportDate(item.endDate),
        'Status': statusLabel(item.status), 'Centro de Custo': item.costCenter || '',
      }));
    case 'measurements':
      return rows.map((item: FinanceMeasurement) => ({
        'ID Sistema': item.id || '', 'Número do Contrato': item.contractNumber || '', 'Cliente': item.clientName || '', 'Período': item.period || '',
        'Tipo de Serviço': item.type || '', 'Valor': Number(item.value || 0), 'Status': statusLabel(item.status),
        'Data de Envio': formatExportDate(item.sendDate), 'Número NF': item.invoiceNumber || '',
      }));
    case 'bankAccounts':
      return rows.map((item: any) => ({ 'ID Sistema': item.id || '', 'Banco': item.bank || '', 'Agência': item.agency || '', 'Conta': item.account || '', 'Tipo': item.type || '', 'Saldo': Number(item.balance || 0) }));
    case 'categories':
      return rows.map((item: any) => ({ 'ID Sistema': item.id || '', 'Código': item.code || '', 'Nome': item.name || '', 'Tipo': item.type || '', 'Status': item.status || '' }));
  }
};

const normalizedRawRow = (raw: Record<string, any>) => {
  const row: Record<string, any> = {};
  Object.entries(raw || {}).forEach(([key, value]) => { row[normalizeHeader(key)] = value; });
  return row;
};

const parseTransactionRow = (raw: Record<string, any>, rowNumber: number, type: 'despesa' | 'receita'): PreviewRow => {
  const row = normalizedRawRow(raw);
  const amount = parseAmount(pick(row, type === 'receita' ? 'valor_liquido' : 'valor', 'valor_original', 'amount'));
  const grossAmount = parseAmount(pick(row, 'valor_bruto', 'gross_amount'));
  const retentions = parseAmount(pick(row, 'retencoes', 'retencao', 'retentions'));
  const paidAmount = parseAmount(pick(row, 'valor_baixado', 'valor_pago', 'valor_recebido', 'paid_amount'));
  const date = parseDate(pick(row, 'data_competencia', 'data', 'date'));
  const dueDate = parseDate(pick(row, 'vencimento', 'data_vencimento', 'due_date')) || date;
  const settlementDate = parseDate(pick(row, 'data_da_baixa', 'data_baixa', 'data_pagamento', 'data_recebimento', 'settlement_date'));
  const description = String(pick(row, 'descricao', 'description')).trim();
  const rawStatus = normalizeHeader(pick(row, 'status'));
  const status = ['pendente', 'pago', 'atrasado', 'cancelado'].includes(rawStatus) ? rawStatus : ((paidAmount || 0) >= Number(amount || 0) && Number(amount || 0) > 0 ? 'pago' : 'pendente');
  const errors: string[] = [];
  if (!description) errors.push('Descrição obrigatória');
  if (amount === null || amount <= 0) errors.push('Valor inválido');
  if (!date) errors.push('Data de competência inválida');
  if (!dueDate) errors.push('Vencimento inválido');
  if (grossAmount !== null && amount !== null && grossAmount < amount) errors.push('Valor bruto menor que o valor líquido/original');
  if (retentions !== null && retentions < 0) errors.push('Retenções inválidas');
  if (paidAmount !== null && amount !== null && paidAmount > amount) errors.push('Valor baixado excede o valor do título');
  if (((paidAmount || 0) > 0 || status === 'pago') && !settlementDate) errors.push('Data da Baixa obrigatória para título baixado/pago');

  const contactName = String(pick(row, type === 'receita' ? 'cliente' : 'fornecedor', 'fornecedor_cliente', 'contato', 'contact_name')).trim();
  const payload = {
    sourceRecordId: String(pick(row, 'id_sistema', 'id', 'source_record_id')).trim(),
    type,
    description,
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
    paymentMethod: String(pick(row, 'forma_de_pagamento', 'forma_pagamento', 'meio_pagamento', 'payment_method')).trim(),
    contactName,
    contactDocument: String(pick(row, 'cpf_cnpj', 'documento_contato', 'contact_document')).trim(),
    documentNumber: String(pick(row, 'documento_nf', 'nf', 'numero_documento', 'document_number')).trim(),
    installments: parseInteger(pick(row, 'parcelas', 'installments'), 1),
    notes: String(pick(row, 'observacoes', 'notes')).trim(),
  };
  return { rowNumber, summary: `${contactName || 'Sem contato'} · ${description || 'Sem descrição'} · R$ ${Number(amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, payload, errors };
};

const parseModuleRow = (entity: Exclude<FinanceSpreadsheetEntity, 'payables' | 'receivables'>, raw: Record<string, any>, rowNumber: number): PreviewRow => {
  const row = normalizedRawRow(raw);
  const errors: string[] = [];
  let payload: Record<string, any> = {};
  let summary = '';

  if (entity === 'contracts') {
    const clientName = String(pick(row, 'cliente', 'client_name')).trim();
    const contractNumber = String(pick(row, 'numero_do_contrato', 'numero_contrato', 'contrato', 'contract_number')).trim();
    const description = String(pick(row, 'descricao', 'description')).trim();
    const value = parseAmount(pick(row, 'valor_global', 'valor', 'value'));
    const startDate = parseDate(pick(row, 'data_inicial', 'inicio', 'start_date'));
    const endDate = parseDate(pick(row, 'data_final', 'fim', 'end_date'));
    const rawStatus = normalizeHeader(pick(row, 'status'));
    const status = rawStatus === 'suspenso' ? 'suspenso' : rawStatus === 'encerrado' ? 'encerrado' : 'ativo';
    if (!clientName) errors.push('Cliente obrigatório');
    if (!contractNumber) errors.push('Número do Contrato obrigatório');
    if (value === null || value <= 0) errors.push('Valor Global inválido');
    if (!startDate || !endDate) errors.push('Data Inicial e Data Final obrigatórias');
    if (startDate && endDate && endDate < startDate) errors.push('Data Final anterior à Data Inicial');
    payload = { sourceRecordId: String(pick(row, 'id_sistema', 'id', 'source_record_id')).trim(), clientId: 'manual', clientName, contractNumber, description, value: value ?? 0, startDate, endDate, status, costCenter: String(pick(row, 'centro_de_custo', 'centro_custo', 'cost_center')).trim() || contractNumber };
    summary = `${contractNumber || 'Sem contrato'} · ${clientName || 'Sem cliente'} · R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  } else if (entity === 'measurements') {
    const contractNumber = String(pick(row, 'numero_do_contrato', 'numero_contrato', 'contrato', 'contract_number')).trim();
    const clientName = String(pick(row, 'cliente', 'client_name')).trim();
    const period = String(pick(row, 'periodo', 'period')).trim();
    const type = String(pick(row, 'tipo_de_servico', 'tipo_servico', 'type')).trim() || 'Calibração';
    const value = parseAmount(pick(row, 'valor', 'value'));
    const rawStatus = normalizeHeader(pick(row, 'status'));
    const status = rawStatus === 'aprovada' ? 'aprovada' : rawStatus === 'faturada' ? 'faturada' : rawStatus === 'cancelada' ? 'cancelada' : 'em_analise';
    const sendDate = parseDate(pick(row, 'data_de_envio', 'data_envio', 'send_date'));
    const invoiceNumber = String(pick(row, 'numero_nf', 'nf', 'invoice_number')).trim();
    if (!contractNumber) errors.push('Número do Contrato obrigatório');
    if (!clientName) errors.push('Cliente obrigatório');
    if (!period) errors.push('Período obrigatório');
    if (value === null || value <= 0) errors.push('Valor inválido');
    if (!sendDate) errors.push('Data de Envio inválida');
    payload = { sourceRecordId: String(pick(row, 'id_sistema', 'id', 'source_record_id')).trim(), contractId: 'manual', contractNumber, clientName, period, type, value: value ?? 0, status, sendDate, invoiceNumber: invoiceNumber || undefined };
    summary = `${contractNumber || 'Sem contrato'} · ${period || 'Sem período'} · R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  } else if (entity === 'bankAccounts') {
    const bank = String(pick(row, 'banco', 'bank')).trim();
    const agency = String(pick(row, 'agencia', 'agency')).trim();
    const account = String(pick(row, 'conta', 'account')).trim();
    const type = String(pick(row, 'tipo', 'type')).trim() || 'Corrente';
    const balanceRaw = parseAmount(pick(row, 'saldo_inicial', 'saldo', 'balance'));
    if (!bank) errors.push('Banco obrigatório');
    if (!account) errors.push('Conta obrigatória');
    if (balanceRaw === null && String(pick(row, 'saldo_inicial', 'saldo', 'balance')).trim()) errors.push('Saldo inválido');
    payload = { sourceRecordId: String(pick(row, 'id_sistema', 'id', 'source_record_id')).trim(), bank, agency, account, type, balance: balanceRaw ?? 0 };
    summary = `${bank || 'Sem banco'} · AG ${agency || '—'} · Conta ${account || '—'}`;
  } else {
    const code = String(pick(row, 'codigo', 'code')).trim();
    const name = String(pick(row, 'nome', 'name')).trim();
    const type = String(pick(row, 'tipo', 'type')).trim() || 'Despesa Indireta';
    const statusText = String(pick(row, 'status')).trim() || 'Ativo';
    if (!code) errors.push('Código obrigatório');
    if (!name) errors.push('Nome obrigatório');
    payload = { sourceRecordId: String(pick(row, 'id_sistema', 'id', 'source_record_id')).trim(), code, name, type, status: statusText };
    summary = `${code || 'Sem código'} · ${name || 'Sem nome'}`;
  }

  return { rowNumber, summary, payload, errors };
};

export default function FinanceSpreadsheetActions({ entity, canEdit, exportRows, compact = false }: FinanceSpreadsheetActionsProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const meta = ENTITY_META[entity];
  const validRows = useMemo(() => preview.filter((row) => row.errors.length === 0), [preview]);
  const invalidRows = preview.length - validRows.length;

  const downloadTemplate = () => {
    const headers = [templateHeaders(entity)];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = headers[0].map((header) => ({ wch: Math.max(14, Math.min(32, header.length + 4)) }));
    const instructionRows = [['INSTRUÇÕES'], ...meta.instructions.map((text) => [text]), ['Máximo de 1.000 linhas por importação.'], ['A aba de dados é entregue sem linhas fictícias para evitar cadastro acidental.']];
    const instructionSheet = XLSX.utils.aoa_to_sheet(instructionRows);
    instructionSheet['!cols'] = [{ wch: 115 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, meta.sheet);
    XLSX.utils.book_append_sheet(wb, instructionSheet, 'Instruções');
    XLSX.writeFile(wb, `${meta.template}.xlsx`);
  };

  const exportData = () => {
    const rows = exportRowsForEntity(entity, exportRows || []);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : templateHeaders(entity);
    const ws = rows.length > 0 ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet([headers]);
    ws['!cols'] = headers.map((header) => ({ wch: Math.max(14, Math.min(34, String(header).length + 4)) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, meta.sheet);
    XLSX.writeFile(wb, `${meta.file}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setMessage('');
    setPreview([]);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      const preferred = wb.SheetNames.find((name) => normalizeHeader(name) === normalizeHeader(meta.sheet));
      const sheet = wb.Sheets[preferred || wb.SheetNames[0]];
      if (!sheet) throw new Error('Nenhuma aba de dados foi localizada na planilha.');
      const raw = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '', raw: true });
      if (raw.length === 0) throw new Error('A planilha não contém registros para importar.');
      if (raw.length > 1000) throw new Error('A planilha excede o limite de 1.000 registros por importação.');
      const mapped = raw.map((item, index) => {
        if (entity === 'payables') return parseTransactionRow(item, index + 2, 'despesa');
        if (entity === 'receivables') return parseTransactionRow(item, index + 2, 'receita');
        return parseModuleRow(entity, item, index + 2);
      });
      setPreview(mapped);
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
      let result: { imported: number; skipped: number; errors: Array<{ row: number; message: string }> };
      if (entity === 'payables' || entity === 'receivables') {
        result = await importFinanceTransactions(validRows.map((row) => row.payload));
      } else {
        result = await importFinanceModuleRows(entity, validRows.map((row) => row.payload));
      }
      const details = result.errors.length ? ` ${result.errors.length} linha(s) rejeitada(s) pelo servidor.` : '';
      setMessage(`Importação concluída: ${result.imported} incluído(s), ${result.skipped} duplicado(s).${details}`);
      if (result.errors.length === 0) setPreview([]);
    } catch (error: any) {
      setMessage(error?.message || 'Falha durante a importação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`flex flex-wrap items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
        <button type="button" onClick={downloadTemplate} className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50" title={`Baixar modelo de ${meta.label}`}>
          <FileSpreadsheet className="h-3.5 w-3.5" /> Modelo
        </button>
        <button type="button" onClick={exportData} className="px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100" title={`Exportar ${meta.label}`}>
          <Download className="h-3.5 w-3.5" /> Exportar
        </button>
        <button type="button" disabled={!canEdit} onClick={() => inputRef.current?.click()} className="px-3 py-2 rounded-lg border border-blue-300 bg-blue-50 text-blue-800 text-xs font-bold flex items-center gap-1.5 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed" title={!canEdit ? 'Seu perfil possui somente visualização' : `Importar ${meta.label}`}>
          <Upload className="h-3.5 w-3.5" /> Importar
        </button>
        <input ref={inputRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
      </div>

      {(preview.length > 0 || message) && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4">
              <div>
                <h4 className="font-extrabold text-slate-900 flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-blue-600" /> Importar {meta.label}</h4>
                <p className="text-xs text-slate-500 mt-1">{fileName || 'Planilha'} · pré-validação antes de qualquer gravação.</p>
              </div>
              <button type="button" onClick={() => { setPreview([]); setMessage(''); setFileName(''); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>

            {message && <div className="mx-5 mt-4 p-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700">{message}</div>}
            {!canEdit && <div className="mx-5 mt-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900"><AlertTriangle className="inline h-4 w-4 mr-1" /> Seu perfil possui somente visualização. A exportação é permitida, mas a importação exige Financeiro = Editar.</div>}

            {preview.length > 0 && <>
              <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-600"><strong>{preview.length}</strong> linha(s) · <span className="text-emerald-700 font-bold">{validRows.length} válida(s)</span> · <span className="text-rose-700 font-bold">{invalidRows} com erro</span></div>
                <button type="button" onClick={runImport} disabled={!canEdit || loading || invalidRows > 0 || validRows.length === 0} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">{loading ? 'Importando...' : 'Confirmar importação'}</button>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 sticky top-0 z-10"><tr><th className="px-4 py-2">Linha</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Resumo</th><th className="px-4 py-2">Validação</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.map((row) => <tr key={row.rowNumber} className={row.errors.length ? 'bg-rose-50/60' : ''}>
                      <td className="px-4 py-2 font-mono">{row.rowNumber}</td>
                      <td className="px-4 py-2">{row.errors.length ? <XCircle className="h-4 w-4 text-rose-600" /> : <CheckCircle className="h-4 w-4 text-emerald-600" />}</td>
                      <td className="px-4 py-2 font-medium text-slate-700 min-w-[320px]">{row.summary}</td>
                      <td className={`px-4 py-2 min-w-[320px] ${row.errors.length ? 'text-rose-700' : 'text-emerald-700'}`}>{row.errors.join('; ') || 'OK'}</td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            </>}
          </div>
        </div>
      )}
    </>
  );
}
