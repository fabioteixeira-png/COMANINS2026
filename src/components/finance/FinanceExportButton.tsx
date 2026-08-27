import React from 'react';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

interface FinanceExportButtonProps {
  rows: Array<Record<string, any>>;
  fileName: string;
  sheetName: string;
  label?: string;
  title?: string;
}

export default function FinanceExportButton({ rows, fileName, sheetName, label = 'Exportar', title }: FinanceExportButtonProps) {
  const handleExport = () => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const ws = safeRows.length > 0 ? XLSX.utils.json_to_sheet(safeRows) : XLSX.utils.aoa_to_sheet([['Sem dados para o filtro atual']]);
    const headers = safeRows.length > 0 ? Object.keys(safeRows[0]) : ['Sem dados para o filtro atual'];
    ws['!cols'] = headers.map((header) => ({ wch: Math.max(14, Math.min(34, String(header).length + 4)) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <button type="button" onClick={handleExport} title={title || label} className="px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100">
      <Download className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
