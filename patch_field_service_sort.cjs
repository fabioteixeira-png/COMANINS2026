const fs = require('fs');

let content = fs.readFileSync('src/components/FieldService.tsx', 'utf-8');

// 1. Add sort icons to Lucide imports
content = content.replace(
  "import { Upload, FileSpreadsheet, Plus, Save, X, Camera, RefreshCw, Trash2, Search, Download, ChevronLeft, ChevronRight, FileDown, Columns, Edit2 } from 'lucide-react';",
  "import { Upload, FileSpreadsheet, Plus, Save, X, Camera, RefreshCw, Trash2, Search, Download, ChevronLeft, ChevronRight, FileDown, Columns, Edit2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';"
);

// 2. Reorder COLUMNS
const oldColumns = `const COLUMNS = [
  { id: 'certificate', label: 'Certificado', minW: '120px' },
  { id: 'cliente', label: 'Cliente', minW: '150px' },
  { id: 'tag', label: 'Tag', minW: '120px' },
  { id: 'equipamento', label: 'Equipamento', minW: '150px' },
  { id: 'localizacao', label: 'Localização', minW: '150px' },
  { id: 'interventionDate', label: 'Data Intervenção', minW: '120px' },
  { id: 'technician', label: 'Técnico', minW: '120px' },
  { id: 'area', label: 'Área', minW: '120px' },
  { id: 'range', label: 'Range', minW: '120px' },
  { id: 'operacao', label: 'Operação', minW: '120px' },
  { id: 'unidadeMedida', label: 'UM', minW: '100px' },
  { id: 'categoria', label: 'Categoria', minW: '120px' },
  { id: 'emissaoPdf', label: 'Emissão PDF', minW: '100px' },
  { id: 'ordemServico', label: 'OS', minW: '100px' },
  { id: 'tipoServico', label: 'Tipo Serv.', minW: '120px' },
  { id: 'observacao', label: 'Observação', minW: '150px' },
  { id: 'unidade', label: 'Unidade', minW: '120px' },
] as const;`;

const newColumns = `const COLUMNS = [
  { id: 'certificate', label: 'Certificado', minW: '120px' },
  { id: 'interventionDate', label: 'Data Intervenção', minW: '120px' },
  { id: 'tag', label: 'Tag', minW: '120px' },
  { id: 'equipamento', label: 'Equipamento', minW: '150px' },
  { id: 'localizacao', label: 'Localização', minW: '150px' },
  { id: 'technician', label: 'Técnico', minW: '120px' },
  { id: 'area', label: 'Área', minW: '120px' },
  { id: 'range', label: 'Range', minW: '120px' },
  { id: 'operacao', label: 'Operação', minW: '120px' },
  { id: 'unidadeMedida', label: 'UM', minW: '100px' },
  { id: 'categoria', label: 'Categoria', minW: '120px' },
  { id: 'emissaoPdf', label: 'Emissão PDF', minW: '100px' },
  { id: 'ordemServico', label: 'OS', minW: '100px' },
  { id: 'tipoServico', label: 'Tipo Serv.', minW: '120px' },
  { id: 'observacao', label: 'Observação', minW: '150px' },
  { id: 'unidade', label: 'Unidade', minW: '120px' },
  { id: 'cliente', label: 'Cliente', minW: '150px' },
] as const;`;
content = content.replace(oldColumns, newColumns);

// 3. Update handleDownloadTemplate template order
const oldTemplate = `    const ws = XLSX.utils.json_to_sheet([{
      'Certificado': '',
      'Cliente': '',
      'Tag': '',
      'Equipamento': '',
      'Localização': '',
      'Data de Intervenção': '',
      'Técnico': '',
      'Área': '',
      'Range': '',
      'Operação': '',
      'Unidade de Medida': '',
      'Categoria': '',
      'Emissão PDF': '',
      'Ordem de Serviço': '',
      'Tipo de Serviço': '',
      'Observação': '',
      'Unidade': ''
    }]);`;

const newTemplate = `    const ws = XLSX.utils.json_to_sheet([{
      'Certificado': '',
      'Data de Intervenção': '',
      'Tag': '',
      'Equipamento': '',
      'Localização': '',
      'Técnico': '',
      'Área': '',
      'Range': '',
      'Operação': '',
      'Unidade de Medida': '',
      'Categoria': '',
      'Emissão PDF': '',
      'Ordem de Serviço': '',
      'Tipo de Serviço': '',
      'Observação': '',
      'Unidade': '',
      'Cliente': ''
    }]);`;
content = content.replace(oldTemplate, newTemplate);

// 4. Update handleExportExcel export order
const oldExport = `    const ws = XLSX.utils.json_to_sheet(sortedRecords.map(r => ({
      'Certificado': r.certificate,
      'Cliente': r.cliente || '',
      'Tag': r.tag,
      'Equipamento': r.equipamento,
      'Localização': r.localizacao,
      'Data de Intervenção': r.interventionDate,
      'Técnico': r.technician,
      'Área': r.area,
      'Range': r.range,
      'Operação': r.operacao,
      'Unidade de Medida': r.unidadeMedida,
      'Categoria': r.categoria,
      'Emissão PDF': r.emissaoPdf,
      'Ordem de Serviço': r.ordemServico,
      'Tipo de Serviço': r.tipoServico,
      'Observação': r.observacao,
      'Unidade': r.unidade
    })));`;

const newExport = `    const ws = XLSX.utils.json_to_sheet(sortedRecords.map(r => ({
      'Certificado': r.certificate,
      'Data de Intervenção': r.interventionDate,
      'Tag': r.tag,
      'Equipamento': r.equipamento,
      'Localização': r.localizacao,
      'Técnico': r.technician,
      'Área': r.area,
      'Range': r.range,
      'Operação': r.operacao,
      'Unidade de Medida': r.unidadeMedida,
      'Categoria': r.categoria,
      'Emissão PDF': r.emissaoPdf,
      'Ordem de Serviço': r.ordemServico,
      'Tipo de Serviço': r.tipoServico,
      'Observação': r.observacao,
      'Unidade': r.unidade,
      'Cliente': r.cliente || ''
    })));`;
content = content.replace(oldExport, newExport);


// 5. Add Sorting State and Handler
const sortStateCode = `
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
`;

content = content.replace(
  "const [editingCell, setEditingCell] = useState<{rowId: string, colId: string} | null>(null);",
  sortStateCode + "\n  const [editingCell, setEditingCell] = useState<{rowId: string, colId: string} | null>(null);"
);

// 6. Update sortedRecords useMemo
const oldSortedRecords = `  const sortedRecords = useMemo(() => {
    const filtered = records.filter(r => {
      return Object.entries(filters).every(([k, v]) => {
        if (!v) return true;
        const recordVal = String((r as any)[k] || '').toLowerCase();
        return recordVal.includes(String(v).toLowerCase());
      });
    });

    return filtered.sort((a, b) => 
      parseDateForSort(b.interventionDate) - parseDateForSort(a.interventionDate)
    );
  }, [records, filters]);`;

const newSortedRecords = `  const sortedRecords = useMemo(() => {
    let filtered = records.filter(r => {
      return Object.entries(filters).every(([k, v]) => {
        if (!v) return true;
        const recordVal = String((r as any)[k] || '').toLowerCase();
        return recordVal.includes(String(v).toLowerCase());
      });
    });

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        if (sortConfig.key === 'interventionDate') {
          const dateA = parseDateForSort(a.interventionDate);
          const dateB = parseDateForSort(b.interventionDate);
          if (dateA < dateB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (dateA > dateB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }

        const valA = String((a as any)[sortConfig.key] || '').toLowerCase();
        const valB = String((b as any)[sortConfig.key] || '').toLowerCase();
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default Sort (date descending)
      filtered.sort((a, b) => parseDateForSort(b.interventionDate) - parseDateForSort(a.interventionDate));
    }

    return filtered;
  }, [records, filters, sortConfig]);`;
content = content.replace(oldSortedRecords, newSortedRecords);

// 7. Update Table Headers to be clickable with icons
const oldTh = `                  <th key={col.id} className="px-4 py-3" style={{ minWidth: col.minW }}>
                    {col.label}
                    <input 
                      type="text" 
                      value={filters[col.id] || ''} 
                      onChange={e => handleFilterChange(col.id, e.target.value)} 
                      className="w-full mt-2 px-2 py-1.5 text-xs border border-slate-300 rounded bg-white font-normal outline-none focus:border-royal-blue" 
                      placeholder="Filtrar..." 
                    />
                  </th>`;

const newTh = `                  <th key={col.id} className="px-4 py-3" style={{ minWidth: col.minW }}>
                    <div 
                      className="flex items-center gap-1 cursor-pointer hover:text-royal-blue select-none"
                      onClick={() => handleSort(col.id)}
                      title="Clique para ordenar"
                    >
                      {col.label}
                      {sortConfig?.key === col.id ? (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-royal-blue" /> : <ChevronDown className="w-3 h-3 text-royal-blue" />
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-30 hover:opacity-100" />
                      )}
                    </div>
                    <input 
                      type="text" 
                      value={filters[col.id] || ''} 
                      onChange={e => handleFilterChange(col.id, e.target.value)} 
                      className="w-full mt-2 px-2 py-1.5 text-xs border border-slate-300 rounded bg-white font-normal outline-none focus:border-royal-blue" 
                      placeholder="Filtrar..." 
                    />
                  </th>`;
content = content.replace(oldTh, newTh);

fs.writeFileSync('src/components/FieldService.tsx', content);
console.log('Successfully patched FieldService sorting and column order.');
