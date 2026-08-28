import React, { useRef, useState } from 'react';
import { Download, FileDown, Upload, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { FinanceOperation, FinanceOperationKind } from '../../types';
import { importFinanceOperations } from '../../lib/firebase';

interface Props {
  kind: FinanceOperationKind;
  rows: FinanceOperation[];
  canEdit?: boolean;
}

type Preview = { row: number; valid: boolean; message: string; payload: Record<string, any> };

const normalizeHeader = (value: unknown) => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const normalizedRow = (raw: Record<string, any>) => Object.fromEntries(Object.entries(raw).map(([key, value]) => [normalizeHeader(key), value]));
const pick = (row: Record<string, any>, ...keys: string[]) => {
  for (const key of keys.map(normalizeHeader)) {
    if (row[key] !== undefined && String(row[key]).trim() !== '') return row[key];
  }
  return '';
};
const number = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const text = String(value ?? '').trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (!text) return 0;
  const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
const integer = (value: unknown) => Math.max(0, Math.floor(number(value)));
const bool = (value: unknown) => ['sim', 's', '1', 'true', 'yes'].includes(normalizeHeader(value));
const date = (value: unknown) => {
  if (typeof value === 'number' && value > 0) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  const text = String(value ?? '').trim();
  const dmy = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  const ymd = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  return '';
};
const brDate = (value?: string) => value ? value.split('-').reverse().join('/') : '';

const META: Record<FinanceOperationKind, { label: string; sheet: string; headers: string[]; example: Record<string, any>; instructions: string[] }> = {
  orcamento: { label: 'Orçamento', sheet: 'Orcamento', headers: ['ID Sistema', 'Centro de Custo', 'Categoria', 'Valor Orçado', 'Data Inicial', 'Data Final', 'Observações'], example: { 'Centro de Custo': 'Laboratório', Categoria: 'Insumos', 'Valor Orçado': 15000, 'Data Inicial': '01/01/2027', 'Data Final': '31/12/2027', Observações: 'Orçamento anual' }, instructions: ['O valor realizado é calculado pelos lançamentos reais.', 'Linhas com ID Sistema são ignoradas na importação para evitar duplicidade.'] },
  emprestimo: { label: 'Empréstimo', sheet: 'Emprestimos', headers: ['ID Sistema', 'Credor', 'Tipo', 'Valor Principal', 'Juros % a.m.', 'Parcelas', 'Data Inicial', 'Dia Vencimento', 'Centro de Custo', 'Observações'], example: { Credor: 'Banco', Tipo: 'Capital de Giro', 'Valor Principal': 50000, 'Juros % a.m.': 1.2, Parcelas: 24, 'Data Inicial': '15/09/2026', 'Dia Vencimento': 15, 'Centro de Custo': 'Administrativo' }, instructions: ['Ao importar um empréstimo, as parcelas a pagar são criadas automaticamente.', 'Use taxa mensal em percentual, por exemplo 1,20.'] },
  cartao: { label: 'Cartão corporativo', sheet: 'Cartoes', headers: ['ID Sistema', 'Portador', 'Cargo', 'Últimos 4', 'Limite', 'Dia Fechamento', 'Dia Vencimento', 'Observações'], example: { Portador: 'Responsável', Cargo: 'Coordenador', 'Últimos 4': '1234', Limite: 10000, 'Dia Fechamento': 2, 'Dia Vencimento': 10 }, instructions: ['Nunca informe o número completo do cartão. Use apenas os últimos 4 dígitos.'] },
  despesa_cartao: { label: 'Despesa de cartão', sheet: 'Despesas_Cartao', headers: ['ID Sistema', 'Cartão Últimos 4', 'Data Compra', 'Estabelecimento', 'Valor', 'Centro de Custo', 'Categoria', 'Vencimento Fatura', 'Comprovante', 'Observações'], example: { 'Cartão Últimos 4': '1234', 'Data Compra': '20/08/2026', Estabelecimento: 'Posto', Valor: 320, 'Centro de Custo': 'Frota', Categoria: 'Combustível', 'Vencimento Fatura': '10/09/2026', Comprovante: 'Sim' }, instructions: ['Cada despesa importada gera automaticamente uma conta a pagar vinculada.'] },
  reembolso: { label: 'Reembolso / adiantamento', sheet: 'Reembolsos', headers: ['ID Sistema', 'Colaborador', 'Tipo', 'Finalidade', 'Valor', 'Data Solicitação', 'Vencimento', 'Centro de Custo', 'Observações'], example: { Colaborador: 'Colaborador', Tipo: 'Reembolso', Finalidade: 'Hospedagem', Valor: 890, 'Data Solicitação': '20/08/2026', Vencimento: '30/08/2026', 'Centro de Custo': 'Contrato A' }, instructions: ['Tipos aceitos: Reembolso ou Adiantamento.', 'O registro entra em aprovação antes de gerar a conta a pagar.'] },
  custo_pessoal: { label: 'Custo de pessoal', sheet: 'Custos_Pessoal', headers: ['ID Sistema', 'Colaborador / Grupo', 'Competência', 'Salário / Base', 'Encargos', 'Benefícios', 'Valor Total', 'Vencimento', 'Centro de Custo', 'Observações'], example: { 'Colaborador / Grupo': 'Equipe Técnica', Competência: '2026-08', 'Salário / Base': 20000, Encargos: 7000, Benefícios: 3000, 'Valor Total': 30000, Vencimento: '05/09/2026', 'Centro de Custo': 'Contrato A' }, instructions: ['Valor Total pode ser deixado vazio quando Salário/Base + Encargos + Benefícios estiverem preenchidos.'] },
  rateio: { label: 'Rateio de custos', sheet: 'Rateios', headers: ['ID Sistema', 'Nome da Regra', 'Centro de Custo Origem', 'Destino 1', '% 1', 'Destino 2', '% 2', 'Destino 3', '% 3', 'Destino 4', '% 4', 'Destino 5', '% 5', 'Observações'], example: { 'Nome da Regra': 'Rateio Administrativo', 'Centro de Custo Origem': 'Administrativo', 'Destino 1': 'Contrato A', '% 1': 60, 'Destino 2': 'Contrato B', '% 2': 40 }, instructions: ['A soma dos percentuais deve ser exatamente 100%.'] },
  ativo: { label: 'Ativo / investimento', sheet: 'Ativos', headers: ['ID Sistema', 'Ativo', 'Data Aquisição', 'Valor Aquisição', 'Valor Residual', 'Vida Útil Meses', 'Fornecedor', 'Centro de Custo', 'Gerar Conta a Pagar', 'Vencimento', 'Observações'], example: { Ativo: 'Calibrador', 'Data Aquisição': '01/08/2026', 'Valor Aquisição': 25000, 'Valor Residual': 2500, 'Vida Útil Meses': 60, Fornecedor: 'Fornecedor', 'Centro de Custo': 'Laboratório', 'Gerar Conta a Pagar': 'Sim', Vencimento: '30/08/2026' }, instructions: ['Se Gerar Conta a Pagar = Sim, o sistema cria a obrigação automaticamente.'] },
  tributo: { label: 'Tributo / retenção', sheet: 'Tributos', headers: ['ID Sistema', 'Tributo', 'Competência', 'Valor', 'Data Competência', 'Vencimento', 'Centro de Custo', 'Documento', 'Observações'], example: { Tributo: 'DAS', Competência: '2026-08', Valor: 5000, 'Data Competência': '01/08/2026', Vencimento: '20/09/2026', 'Centro de Custo': 'Administrativo', Documento: 'DAS-08/2026' }, instructions: ['O tributo importado gera uma conta a pagar automaticamente.'] },
};

const exportRow = (item: FinanceOperation) => {
  const d = item.details || {};
  if (item.kind === 'orcamento') return { 'ID Sistema': item.id, 'Centro de Custo': item.costCenter, Categoria: item.category, 'Valor Orçado': item.amount, 'Data Inicial': brDate(item.date), 'Data Final': brDate(item.dueDate), Observações: item.description };
  if (item.kind === 'emprestimo') return { 'ID Sistema': item.id, Credor: d.creditor, Tipo: d.loanType, 'Valor Principal': item.amount, 'Juros % a.m.': d.interestRate, Parcelas: d.installments, 'Data Inicial': brDate(item.date), 'Dia Vencimento': d.dueDay, 'Centro de Custo': item.costCenter, Observações: item.description };
  if (item.kind === 'cartao') return { 'ID Sistema': item.id, Portador: d.holder, Cargo: d.role, 'Últimos 4': d.last4, Limite: item.amount, 'Dia Fechamento': d.closingDay, 'Dia Vencimento': d.dueDay, Observações: item.description };
  if (item.kind === 'despesa_cartao') return { 'ID Sistema': item.id, 'Cartão Últimos 4': d.cardLast4, 'Data Compra': brDate(item.date), Estabelecimento: d.establishment, Valor: item.amount, 'Centro de Custo': item.costCenter, Categoria: item.category, 'Vencimento Fatura': brDate(item.dueDate), Comprovante: d.receiptAttached ? 'Sim' : 'Não', Observações: item.description };
  if (item.kind === 'reembolso') return { 'ID Sistema': item.id, Colaborador: d.employee, Tipo: d.reimbursementType, Finalidade: d.purpose, Valor: item.amount, 'Data Solicitação': brDate(item.date), Vencimento: brDate(item.dueDate), 'Centro de Custo': item.costCenter, Observações: item.description };
  if (item.kind === 'custo_pessoal') return { 'ID Sistema': item.id, 'Colaborador / Grupo': d.employee, Competência: d.competence, 'Salário / Base': d.baseSalary, Encargos: d.charges, Benefícios: d.benefits, 'Valor Total': item.amount, Vencimento: brDate(item.dueDate), 'Centro de Custo': item.costCenter, Observações: item.description };
  if (item.kind === 'rateio') {
    const targets = Array.isArray(d.targets) ? d.targets : [];
    const row: Record<string, any> = { 'ID Sistema': item.id, 'Nome da Regra': item.title, 'Centro de Custo Origem': d.sourceCostCenter || item.costCenter, Observações: item.description };
    targets.slice(0, 5).forEach((target: any, index: number) => { row[`Destino ${index + 1}`] = target.costCenter; row[`% ${index + 1}`] = target.percent; });
    return row;
  }
  if (item.kind === 'ativo') return { 'ID Sistema': item.id, Ativo: d.assetName || item.title, 'Data Aquisição': brDate(item.date), 'Valor Aquisição': item.amount, 'Valor Residual': d.salvageValue, 'Vida Útil Meses': d.lifeMonths, Fornecedor: d.supplier, 'Centro de Custo': item.costCenter, 'Gerar Conta a Pagar': d.createExpense ? 'Sim' : 'Não', Vencimento: brDate(item.dueDate), Observações: item.description };
  return { 'ID Sistema': item.id, Tributo: d.taxType || item.title, Competência: d.competence, Valor: item.amount, 'Data Competência': brDate(item.date), Vencimento: brDate(item.dueDate), 'Centro de Custo': item.costCenter, Documento: item.documentNumber, Observações: item.description };
};

const parseRow = (kind: FinanceOperationKind, raw: Record<string, any>, rowNumber: number): Preview => {
  const r = normalizedRow(raw);
  const sourceRecordId = String(pick(r, 'ID Sistema', 'id_sistema') || '').trim();
  const description = String(pick(r, 'Observações', 'observacoes') || '').trim();
  let payload: Record<string, any> = { kind, sourceRecordId, description };
  let error = '';

  if (kind === 'orcamento') {
    payload = { ...payload, amount: number(pick(r, 'Valor Orçado')), date: date(pick(r, 'Data Inicial')), dueDate: date(pick(r, 'Data Final')), costCenter: String(pick(r, 'Centro de Custo')).trim(), category: String(pick(r, 'Categoria')).trim(), details: {} };
    if (!payload.costCenter || payload.amount <= 0 || !payload.date || !payload.dueDate) error = 'Centro de custo, valor e período são obrigatórios.';
  } else if (kind === 'emprestimo') {
    payload = { ...payload, amount: number(pick(r, 'Valor Principal')), date: date(pick(r, 'Data Inicial')), costCenter: String(pick(r, 'Centro de Custo')).trim(), contactName: String(pick(r, 'Credor')).trim(), details: { creditor: String(pick(r, 'Credor')).trim(), loanType: String(pick(r, 'Tipo')).trim(), interestRate: number(pick(r, 'Juros % a.m.')), installments: integer(pick(r, 'Parcelas')), dueDay: integer(pick(r, 'Dia Vencimento')) } };
    if (!payload.details.creditor || payload.amount <= 0 || !payload.date || payload.details.installments < 1) error = 'Credor, valor, data e parcelas são obrigatórios.';
  } else if (kind === 'cartao') {
    payload = { ...payload, amount: number(pick(r, 'Limite')), details: { holder: String(pick(r, 'Portador')).trim(), role: String(pick(r, 'Cargo')).trim(), last4: String(pick(r, 'Últimos 4')).replace(/\D/g, '').slice(-4), closingDay: integer(pick(r, 'Dia Fechamento')), dueDay: integer(pick(r, 'Dia Vencimento')) } };
    if (!payload.details.holder || payload.details.last4.length !== 4 || payload.amount <= 0) error = 'Portador, últimos 4 dígitos e limite são obrigatórios.';
  } else if (kind === 'despesa_cartao') {
    payload = { ...payload, amount: number(pick(r, 'Valor')), date: date(pick(r, 'Data Compra')), dueDate: date(pick(r, 'Vencimento Fatura')), costCenter: String(pick(r, 'Centro de Custo')).trim(), category: String(pick(r, 'Categoria')).trim(), details: { cardLast4: String(pick(r, 'Cartão Últimos 4')).replace(/\D/g, '').slice(-4), establishment: String(pick(r, 'Estabelecimento')).trim(), receiptAttached: bool(pick(r, 'Comprovante')) } };
    if (payload.details.cardLast4.length !== 4 || !payload.details.establishment || payload.amount <= 0 || !payload.date || !payload.dueDate) error = 'Cartão, estabelecimento, valor, data e vencimento são obrigatórios.';
  } else if (kind === 'reembolso') {
    payload = { ...payload, amount: number(pick(r, 'Valor')), date: date(pick(r, 'Data Solicitação')), dueDate: date(pick(r, 'Vencimento')), costCenter: String(pick(r, 'Centro de Custo')).trim(), details: { employee: String(pick(r, 'Colaborador')).trim(), reimbursementType: normalizeHeader(pick(r, 'Tipo')).includes('adiant') ? 'adiantamento' : 'reembolso', purpose: String(pick(r, 'Finalidade')).trim() } };
    if (!payload.details.employee || !payload.details.purpose || payload.amount <= 0 || !payload.date || !payload.dueDate) error = 'Colaborador, finalidade, valor, data e vencimento são obrigatórios.';
  } else if (kind === 'custo_pessoal') {
    const baseSalary = number(pick(r, 'Salário / Base')); const charges = number(pick(r, 'Encargos')); const benefits = number(pick(r, 'Benefícios')); const total = number(pick(r, 'Valor Total')) || baseSalary + charges + benefits;
    payload = { ...payload, amount: total, dueDate: date(pick(r, 'Vencimento')), costCenter: String(pick(r, 'Centro de Custo')).trim(), details: { employee: String(pick(r, 'Colaborador / Grupo')).trim(), competence: String(pick(r, 'Competência')).trim(), baseSalary, charges, benefits } };
    if (!payload.details.competence || total <= 0 || !payload.dueDate) error = 'Competência, valor e vencimento são obrigatórios.';
  } else if (kind === 'rateio') {
    const targets = Array.from({ length: 5 }, (_, i) => ({ costCenter: String(pick(r, `Destino ${i + 1}`)).trim(), percent: number(pick(r, `% ${i + 1}`)) })).filter(item => item.costCenter && item.percent > 0);
    payload = { ...payload, title: String(pick(r, 'Nome da Regra')).trim(), costCenter: String(pick(r, 'Centro de Custo Origem')).trim(), details: { sourceCostCenter: String(pick(r, 'Centro de Custo Origem')).trim(), targets } };
    if (!payload.details.sourceCostCenter || targets.length === 0 || Math.abs(targets.reduce((sum, item) => sum + item.percent, 0) - 100) > 0.01) error = 'Origem e destinos somando 100% são obrigatórios.';
  } else if (kind === 'ativo') {
    payload = { ...payload, title: String(pick(r, 'Ativo')).trim(), amount: number(pick(r, 'Valor Aquisição')), date: date(pick(r, 'Data Aquisição')), dueDate: date(pick(r, 'Vencimento')), costCenter: String(pick(r, 'Centro de Custo')).trim(), contactName: String(pick(r, 'Fornecedor')).trim(), details: { assetName: String(pick(r, 'Ativo')).trim(), salvageValue: number(pick(r, 'Valor Residual')), lifeMonths: integer(pick(r, 'Vida Útil Meses')), supplier: String(pick(r, 'Fornecedor')).trim(), createExpense: bool(pick(r, 'Gerar Conta a Pagar')) } };
    if (!payload.details.assetName || payload.amount <= 0 || !payload.date || payload.details.lifeMonths < 1 || (payload.details.createExpense && !payload.dueDate)) error = 'Ativo, valor, data e vida útil são obrigatórios.';
  } else {
    payload = { ...payload, amount: number(pick(r, 'Valor')), date: date(pick(r, 'Data Competência')), dueDate: date(pick(r, 'Vencimento')), costCenter: String(pick(r, 'Centro de Custo')).trim(), documentNumber: String(pick(r, 'Documento')).trim(), details: { taxType: String(pick(r, 'Tributo')).trim(), competence: String(pick(r, 'Competência')).trim() } };
    if (!payload.details.taxType || payload.amount <= 0 || !payload.date || !payload.dueDate) error = 'Tributo, valor, data e vencimento são obrigatórios.';
  }
  return { row: rowNumber, valid: !error, message: error || (sourceRecordId ? 'Registro já existente: será ignorado.' : 'Pronto para importar.'), payload };
};

const saveWorkbook = (workbook: XLSX.WorkBook, fileName: string) => XLSX.writeFile(workbook, fileName, { compression: true });

export default function FinanceOperationSpreadsheetActions({ kind, rows, canEdit = false }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<Preview[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const meta = META[kind];

  const handleTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet([meta.example], { header: meta.headers });
    XLSX.utils.book_append_sheet(workbook, sheet, meta.sheet);
    const instructions = XLSX.utils.aoa_to_sheet([['INSTRUÇÕES'], ...meta.instructions.map(item => [item]), ['Não altere nomes das colunas. Datas: DD/MM/AAAA. Valores: número ou moeda.']]);
    XLSX.utils.book_append_sheet(workbook, instructions, 'Leia-me');
    saveWorkbook(workbook, `modelo_${meta.sheet.toLowerCase()}.xlsx`);
  };

  const handleExport = () => {
    const workbook = XLSX.utils.book_new();
    const data = rows.map(exportRow);
    const sheet = XLSX.utils.json_to_sheet(data.length ? data : [], { header: meta.headers });
    XLSX.utils.book_append_sheet(workbook, sheet, meta.sheet);
    saveWorkbook(workbook, `${meta.sheet.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
      if (raw.length === 0) throw new Error('A planilha está vazia.');
      if (raw.length > 200) throw new Error('O limite é de 200 registros por importação desta rotina.');
      const parsed = raw.map((row, index) => parseRow(kind, row, index + 2));
      setPreview(parsed);
      setShowPreview(true);
    } catch (error: any) {
      alert(error?.message || 'Não foi possível ler a planilha.');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const confirmImport = async () => {
    if (preview.some(item => !item.valid)) return;
    setBusy(true);
    try {
      const result = await importFinanceOperations(preview.map(item => item.payload));
      alert(`Importação concluída. Incluídos: ${result.imported}. Ignorados: ${result.skipped}. Erros: ${result.errors.length}.`);
      setShowPreview(false); setPreview([]);
    } catch (error: any) {
      alert(error?.message || 'Não foi possível importar os dados.');
    } finally { setBusy(false); }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={handleTemplate} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><FileDown className="h-3.5 w-3.5" />Modelo</button>
        <button type="button" onClick={handleExport} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Download className="h-3.5 w-3.5" />Exportar</button>
        <button type="button" disabled={!canEdit} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Upload className="h-3.5 w-3.5" />Importar</button>
        <input ref={inputRef} className="hidden" type="file" accept=".xls,.xlsx" onChange={event => handleFile(event.target.files?.[0])} />
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div><h3 className="font-extrabold text-slate-900">Prévia de importação — {meta.label}</h3><p className="text-xs text-slate-500">Nada é gravado antes da confirmação.</p></div>
              <button onClick={() => setShowPreview(false)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-[58vh] overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Linha</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Validação</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.map(item => <tr key={item.row}><td className="px-4 py-3 font-mono">{item.row}</td><td className="px-4 py-3">{item.valid ? <span className="inline-flex items-center gap-1 font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" />OK</span> : <span className="inline-flex items-center gap-1 font-bold text-rose-700"><AlertTriangle className="h-4 w-4" />Erro</span>}</td><td className="px-4 py-3 text-slate-600">{item.message}</td></tr>)}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 p-4">
              <span className="text-xs text-slate-500">{preview.filter(item => item.valid).length} válidos • {preview.filter(item => !item.valid).length} com erro</span>
              <div className="flex gap-2"><button onClick={() => setShowPreview(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold">Cancelar</button><button disabled={busy || preview.some(item => !item.valid)} onClick={confirmImport} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Importando...' : 'Confirmar importação'}</button></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
