import React, { useState, useMemo } from 'react';
import { X, Search, Copy, Check, BookOpen, Download, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { OptionsTable, ColumnInstruction } from './financeSpreadsheetOptions';

interface FinanceAllocationGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  optionsTables: OptionsTable[];
  columnInstructions: ColumnInstruction[];
  onDownloadTemplate?: () => void;
}

export default function FinanceAllocationGuideModal({
  isOpen,
  onClose,
  title,
  subtitle,
  optionsTables,
  columnInstructions,
  onDownloadTemplate,
}: FinanceAllocationGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'options' | 'columns'>('options');
  const [selectedTableIndex, setSelectedTableIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const currentTable = optionsTables[selectedTableIndex] || optionsTables[0];

  const filteredOptions = useMemo(() => {
    if (!currentTable) return [];
    if (!search.trim()) return currentTable.options;
    const q = search.toLowerCase();
    return currentTable.options.filter(
      (opt) =>
        opt.value.toLowerCase().includes(q) ||
        opt.description.toLowerCase().includes(q) ||
        opt.allocationTip.toLowerCase().includes(q)
    );
  }, [currentTable, search]);

  const filteredColumns = useMemo(() => {
    if (!search.trim()) return columnInstructions;
    const q = search.toLowerCase();
    return columnInstructions.filter(
      (col) =>
        col.column.toLowerCase().includes(q) ||
        col.format.toLowerCase().includes(q) ||
        col.description.toLowerCase().includes(q)
    );
  }, [columnInstructions, search]);

  if (!isOpen) return null;

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedValue(value);
    setTimeout(() => {
      setCopiedValue((prev) => (prev === value ? null : prev));
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl mt-0.5">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-blue-600 text-white rounded-md">
                  Guia Oficial
                </span>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  {title}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {subtitle || 'Consulte a lista de opções padronizadas para alocação correta de custos, receitas e dados metrológicos.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDownloadTemplate && (
              <button
                type="button"
                onClick={onDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                title="Baixar planilha modelo Excel com todas as abas"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Baixar Planilha Modelo</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('options')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'options'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Opções de Alocação ({optionsTables.length} campos)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('columns')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'columns'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Especificação das Colunas ({columnInstructions.length})
            </button>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar termo ou código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:bg-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-5 bg-slate-50/50">
          {activeTab === 'options' ? (
            <div className="space-y-4">
              {/* Field Selectors (Pills) */}
              {optionsTables.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5 pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                    Campo:
                  </span>
                  {optionsTables.map((table, idx) => (
                    <button
                      key={table.field}
                      type="button"
                      onClick={() => setSelectedTableIndex(idx)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        selectedTableIndex === idx
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {table.field} ({table.options.length})
                    </button>
                  ))}
                </div>
              )}

              {/* Table of Options */}
              {currentTable ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-4 py-3 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                        {currentTable.title}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Coluna correspondente na planilha: <strong className="text-slate-700">{currentTable.field}</strong>
                      </p>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                      {filteredOptions.length} de {currentTable.options.length} opção(ões)
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2.5 w-64">Valor Oficial (Copiar para a Planilha)</th>
                          <th className="px-4 py-2.5">Descrição e Finalidade</th>
                          <th className="px-4 py-2.5">Regra de Alocação Recomendada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredOptions.length > 0 ? (
                          filteredOptions.map((opt) => (
                            <tr key={opt.value} className="hover:bg-blue-50/40 transition-colors">
                              <td className="px-4 py-3 align-top font-medium text-slate-900">
                                <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 group hover:border-blue-400">
                                  <span className="font-mono font-bold text-blue-900 break-words">
                                    {opt.value}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(opt.value)}
                                    className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                    title="Copiar valor exato"
                                  >
                                    {copiedValue === opt.value ? (
                                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top text-slate-700 leading-relaxed">
                                {opt.description}
                              </td>
                              <td className="px-4 py-3 align-top text-slate-600 leading-relaxed bg-slate-50/50">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 mr-1.5">
                                  Dica
                                </span>
                                {opt.allocationTip}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                              Nenhuma opção encontrada para o termo "{search}".
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  Nenhuma tabela de opções cadastrada para este módulo.
                </div>
              )}
            </div>
          ) : (
            /* Specification of Columns */
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                    Especificação Exata de Cada Coluna da Planilha
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Mantenha a primeira linha com estes nomes de cabeçalho.
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {filteredColumns.length} coluna(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5 w-48">Nome da Coluna</th>
                      <th className="px-4 py-2.5 w-28 text-center">Obrigatória?</th>
                      <th className="px-4 py-2.5 w-48">Formato Esperado</th>
                      <th className="px-4 py-2.5">Regras e Instruções</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredColumns.map((col) => (
                      <tr key={col.column} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 align-top font-bold text-slate-900 font-mono">
                          {col.column}
                        </td>
                        <td className="px-4 py-3 align-top text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              col.required === 'Sim'
                                ? 'bg-rose-100 text-rose-800'
                                : col.required === 'Condicional'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {col.required}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top text-slate-700 font-mono text-[11px]">
                          {col.format}
                        </td>
                        <td className="px-4 py-3 align-top text-slate-600 leading-relaxed">
                          {col.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Business notice */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Integração com DRE e Relatórios da COMANINS:</strong> Todas as opções acima refletem a parametrização oficial dos centros de custo metrológicos, planos de contas e formas de pagamento da empresa. A alocação adequada evita inconsistências nos relatórios gerenciais e na apuração de resultados por contrato.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Todas as planilhas baixadas incluem a aba “Opções de Alocação” e “Instruções”.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Fechar Guia
          </button>
        </div>
      </div>
    </div>
  );
}
