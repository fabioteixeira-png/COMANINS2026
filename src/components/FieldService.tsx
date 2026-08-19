import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Upload, FileSpreadsheet, Plus, Save, X, Camera, RefreshCw, Trash2, Search, Download, ChevronLeft, ChevronRight, FileDown, Columns, Edit2, ChevronUp, ChevronDown, ChevronsUpDown, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Instrument } from '../types';
import { 
  FieldServiceRecord, 
  syncFieldServiceRecords, 
  addFieldServiceRecord, 
  updateFieldServiceRecord, 
  bulkAddFieldServiceRecords,
  bulkUpsertFieldServiceRecords,
  clearAllFieldServiceRecords, deleteFieldServiceRecord, syncPortalUsers, PortalUser, syncInstruments 
} from '../lib/firebase';

const parseDateForSort = (dString: string) => {
  if (!dString) return 0;
  if (typeof dString === 'number') {
     return new Date(Math.round((dString - 25569) * 86400 * 1000)).getTime();
  }
  const parts = String(dString).split('/');
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`).getTime();
  }
  return new Date(dString).getTime() || 0;
};

const COLUMNS = [
  { id: 'certificate', label: 'Certificado', minW: '120px' },
  { id: 'dataCalibracao', label: 'Data Calibração', minW: '120px' },
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
] as const;


interface FieldServiceProps {
  onPrintCertificate?: (instId: string, tagData: string, equipmentData: string) => void;
}
export default function FieldService({ onPrintCertificate }: FieldServiceProps = {}) {
  const [records, setRecords] = useState<FieldServiceRecord[]>([]);
  const [internalUsers, setInternalUsers] = useState<PortalUser[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  
  // Filter states
  const [filters, setFilters] = useState<Record<string, string>>({
    certificate: '', cliente: '', tag: '', equipamento: '', localizacao: '',
    interventionDate: '', technician: '', area: '', range: '',
    operacao: '', unidadeMedida: '', categoria: '', emissaoPdf: '',
    ordemServico: '', tipoServico: '', observacao: '', unidade: ''
  });
  
  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    certificate: true, cliente: true, tag: true, equipamento: true,
    localizacao: false, interventionDate: true, technician: true, area: false,
    range: false, operacao: false, unidadeMedida: false, categoria: false,
    emissaoPdf: false, ordemServico: true, tipoServico: true, observacao: false, unidade: false
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const [editingCell, setEditingCell] = useState<{rowId: string, colId: string} | null>(null);

  const handleInlineSave = async (record: FieldServiceRecord, colId: string, newVal: string) => {
    setEditingCell(null);
    if (String((record as any)[colId] || '') === newVal) return;
    
    if (colId === 'certificate' && newVal.trim() !== '') {
      const isDup = records.some(r => r.certificate === newVal && r.id !== record.id);
      if (isDup) {
        alert("Erro: Este Certificado já está registrado na planilha!");
        return;
      }
    }

    if (colId === 'tag' && newVal.trim() !== '') {
      const isDup = records.some(r => r.tag === newVal && r.id !== record.id);
      if (isDup) {
        alert("Erro: Esta TAG já está registrada na planilha!");
        return;
      }
    }

    try {
      await updateFieldServiceRecord(record.id, { [colId]: newVal });
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar célula.");
    }
  };

  const handleDeleteRecord = async (id: string) => {
    const pwd = prompt("Digite a senha de administrador para excluir este registro:");
    if (pwd === null) return;
    
    const isAdminValid = internalUsers.some(u => u.role === "Administrador" && u.password === pwd) || pwd === "admin" || pwd === "admin123" || pwd === "comanins123";

    if (isAdminValid) {
      if (confirm("Tem certeza que deseja excluir?")) {
        try {
          await deleteFieldServiceRecord(id);
        } catch (e) {
          console.error(e);
          alert("Erro ao excluir.");
        }
      }
    } else {
      alert("Senha incorreta! Apenas o Administrador do Sistema possui permissão para excluir registros.");
    }
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<Partial<FieldServiceRecord>>({});
  
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribeUsers = syncPortalUsers((users) => setInternalUsers(users));
    const unsubscribeInst = syncInstruments((data) => setInstruments(data));
    const unsubscribe = syncFieldServiceRecords((data) => {
      setRecords(data);
      setIsLoading(false);
    });
    return () => {
      unsubscribe.then(unsub => unsub());
      unsubscribeUsers.then(u => u());
      unsubscribeInst.then(u => u());
    };
  }, []);

  const normalizeKey = (k: string) => k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      'Certificado': '',
      'Data Calibração': '',
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
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "Modelo_Importacao_Servico_Campo.xlsx");
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { raw: false });
        
        let addedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        const newRecordsToImport: Omit<FieldServiceRecord, 'id'>[] = [];
        const recordsToUpdate: {id: string, data: Partial<FieldServiceRecord>}[] = [];

        // Track what we process in this batch to avoid duplicates within the Excel file itself
        const processedCerts = new Set();
        const processedTags = new Set();

        for (const row of data as any[]) {
          const normalizedRow = Object.keys(row).reduce((acc, key) => {
             acc[normalizeKey(key)] = row[key];
             return acc;
          }, {} as Record<string, any>);

          const cert = normalizedRow['certificado'] || normalizedRow['cert'] || '';
          const strCert = String(cert).trim();
          
          const tagRaw = normalizedRow['tag'] || '';
          const strTag = String(tagRaw).trim();

          // Excel rows must have either a cert or a tag to be useful
          if (strCert === '' && strTag === '') {
            continue;
          }

          // If the Excel itself has duplicates, we just skip the subsequent ones
          if ((strCert !== '' && processedCerts.has(strCert)) || (strTag !== '' && processedTags.has(strTag))) {
            skippedCount++;
            continue;
          }

          if (strCert !== '') processedCerts.add(strCert);
          if (strTag !== '') processedTags.add(strTag);

          const interventionDateRaw = String(normalizedRow['data'] || normalizedRow['date'] || normalizedRow['datadeintervencao'] || normalizedRow['dataintervencao'] || normalizedRow['datadeinterveno'] || normalizedRow['datadeint'] || '');
          const formattedInterventionDate = dateMask(interventionDateRaw);

          const parsedRecord = {
            cliente: String(normalizedRow['cliente'] || ''),
            tag: strTag,
            equipamento: String(normalizedRow['equipamento'] || normalizedRow['descrio'] || ''),
            localizacao: String(normalizedRow['localizacao'] || normalizedRow['localizao'] || normalizedRow['local'] || normalizedRow['serie'] || normalizedRow['srie'] || ''),
            certificate: strCert,
            interventionDate: formattedInterventionDate,
            technician: String(normalizedRow['tecnico'] || normalizedRow['tcnico'] || normalizedRow['technician'] || ''),
            area: String(normalizedRow['area'] || normalizedRow['rea'] || ''),
            range: String(normalizedRow['range'] || normalizedRow['faixa'] || ''),
            operacao: String(normalizedRow['operacao'] || normalizedRow['operao'] || ''),
            unidadeMedida: String(normalizedRow['unidadedemedida'] || normalizedRow['um'] || ''),
            categoria: String(normalizedRow['categoria'] || ''),
            emissaoPdf: String(normalizedRow['emissaopdf'] || normalizedRow['emissopdf'] || ''),
            ordemServico: String(normalizedRow['ordemdeservico'] || normalizedRow['os'] || normalizedRow['ordemservico'] || ''),
            tipoServico: String(normalizedRow['tipodeservico'] || normalizedRow['tiposervico'] || ''),
            observacao: String(normalizedRow['observacao'] || normalizedRow['observao'] || normalizedRow['notas'] || ''),
            unidade: String(normalizedRow['unidade'] || normalizedRow['und'] || '')
          };

          // Find existing match
          let existingMatch = null;
          if (strCert !== '') {
            existingMatch = records.find(r => r.certificate === strCert);
          } else if (strTag !== '') {
            existingMatch = records.find(r => r.tag === strTag);
          }

          if (existingMatch) {
            // Check if there are differences
            let hasDifferences = false;
            for (const key of Object.keys(parsedRecord)) {
              if ((parsedRecord as any)[key] !== (existingMatch as any)[key]) {
                hasDifferences = true;
                break;
              }
            }

            if (hasDifferences) {
              recordsToUpdate.push({ id: existingMatch.id, data: parsedRecord });
              updatedCount++;
            } else {
              skippedCount++;
            }
          } else {
            newRecordsToImport.push(parsedRecord);
            addedCount++;
          }
        }
        
        if (newRecordsToImport.length > 0 || recordsToUpdate.length > 0) {
          await bulkUpsertFieldServiceRecords(recordsToUpdate, newRecordsToImport);
        }
        
        alert(`Importação concluída!\n\n${addedCount} novos registros adicionados.\n${updatedCount} registros atualizados.\n${skippedCount} ignorados (já estavam idênticos ou duplicados no arquivo).`);
      } catch (error) {
        console.error("Error reading excel:", error);
        alert("Erro ao importar planilha.");
      } finally {
        setIsImporting(false);
        if (excelInputRef.current) excelInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExportExcel = () => {
    if (records.length === 0) {
      alert("Nenhum registro para exportar.");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(sortedRecords.map(r => ({
      'Certificado': r.certificate,
      'Data Calibração': (() => {
        if (!r.certificate) return '-';
        const correlatedInst = instruments.find(i => i.certificateNumber === r.certificate || (i.coma && i.coma === r.certificate));
        if (correlatedInst && correlatedInst.lastCalibrationDate) {
          const dateParts = correlatedInst.lastCalibrationDate.split('-');
          if (dateParts.length === 3) {
            return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
          }
          return correlatedInst.lastCalibrationDate;
        }
        return '-';
      })(),
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
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ServicoCampo");
    XLSX.writeFile(wb, "Servico_de_Campo_Export.xlsx");
  };

  const handleClearAll = async () => {
    const pwd = prompt("Digite a senha de administrador para limpar todos os dados:");
    if (pwd === null) return;
    
    const isAdminValid = internalUsers.some(u => u.role === "Administrador" && u.password === pwd) || pwd === "admin" || pwd === "admin123" || pwd === "comanins123";

    if (isAdminValid) {
      if (confirm("Tem certeza absoluta? Isso apagará TODOS os registros!")) {
        setIsLoading(true);
        try {
          await clearAllFieldServiceRecords();
          alert("Dados limpos com sucesso.");
        } catch (e) {
          console.error(e);
          alert("Erro ao limpar dados.");
        }
        setIsLoading(false);
      }
    } else {
      alert("Senha incorreta! Apenas o Administrador do Sistema possui permissão para excluir registros.");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessingImage(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });

      const response = await fetch('/api/parse-field-service-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Erro ao processar imagem.");
      }

      const data = await response.json();
      
      setFormData({
        cliente: data.cliente || '',
        tag: data.tag || '',
        equipamento: data.equipamento || '',
        localizacao: data.localizacao || '',
        certificate: data.certificate || '',
        interventionDate: data.interventionDate || '',
        technician: data.technician || '',
        area: data.area || '',
        range: data.range || '',
        operacao: data.operacao || '',
        unidadeMedida: data.unidadeMedida || '',
        categoria: data.categoria || '',
        emissaoPdf: data.emissaoPdf || '',
        ordemServico: data.ordemServico || '',
        tipoServico: data.tipoServico || '',
        observacao: data.observacao || '',
        unidade: data.unidade || ''
      });
      setShowAddModal(true);
      
      if (data.certificate && records.some(r => r.certificate === data.certificate)) {
        alert("Atenção: A IA identificou um certificado que já existe na planilha.");
      } else {
        alert("Imagem processada! Verifique os dados extraídos antes de salvar.");
      }

    } catch (error: any) {
      console.error(error);
      alert("Falha na extração de dados: " + error.message);
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  
  const dateMask = (value) => {
    if (!value) return '';
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "$1/$2")
      .replace(/(\d{2})(\d)/, "$1/$2")
      .replace(/(\d{4})\d+?$/, "$1");
  };

  const handleSaveRecord = async () => {
    const duplicateCert = formData.certificate && formData.certificate.trim() !== '' && records.some(r => r.certificate === formData.certificate && r.id !== formData.id);
    const duplicateTag = formData.tag && formData.tag.trim() !== '' && records.some(r => r.tag === formData.tag && r.id !== formData.id);
    if (duplicateCert) {
      alert("Erro: Este Certificado já está registrado na planilha!");
      return;
    }
    if (duplicateTag) {
      alert("Erro: Esta TAG já está registrada na planilha!");
      return;
    }

    try {
      if (formData.id) {
        await updateFieldServiceRecord(formData.id, formData);
      } else {
        await addFieldServiceRecord(formData as any);
      }
      setShowAddModal(false);
      setFormData({});
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar registro.");
    }
  };

  const handleFilterChange = (field: string, val: string) => {
    setFilters(prev => ({...prev, [field]: val}));
    setCurrentPage(1); // reset to page 1 on filter
  };

  const toggleColumn = (id: string) => {
    setVisibleColumns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const sortedRecords = useMemo(() => {
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
  }, [records, filters, sortConfig]);

  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedRecords.slice(start, start + itemsPerPage);
  }, [sortedRecords, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Serviço de Campo</h2>
          <p className="text-sm text-slate-500">Gerencie registros, importe em lote e utilize filtros completos.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Hidden inputs */}
          <input type="file" accept=".xlsx,.xls,.csv" ref={excelInputRef} className="hidden" onChange={handleExcelImport} />
          <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
          
          <button 
            onClick={handleDownloadTemplate}
            className="flex items-center space-x-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg transition-colors text-sm"
          >
            <FileDown className="h-4 w-4" />
            <span>Modelo Planilha</span>
          </button>

          <button 
            onClick={() => excelInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center space-x-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {isImporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            <span>{isImporting ? 'Importando...' : 'Importar Planilha'}</span>
          </button>
          
          <button 
            onClick={handleExportExcel}
            className="flex items-center space-x-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors text-sm"
          >
            <Download className="h-4 w-4" />
            <span>Exportar Excel</span>
          </button>

          <button 
            onClick={handleClearAll}
            className="flex items-center space-x-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg transition-colors text-sm"
          >
            <Trash2 className="h-4 w-4" />
            <span>Limpar Todos</span>
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingImage}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {isProcessingImage ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            <span>{isProcessingImage ? 'Analisando...' : 'Anexar Foto (IA)'}</span>
          </button>

          <button 
            onClick={() => { setFormData({}); setShowAddModal(true); }}
            className="flex items-center space-x-2 px-3 py-2 bg-royal-blue hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Registro</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-visible relative">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center text-sm font-semibold text-slate-700">
              Filtros por coluna abaixo <span className="ml-2 text-xs font-normal text-slate-500">({sortedRecords.length} de {records.length})</span>
            </div>
            
            {/* Column Visibility Menu */}
            <div className="relative">
              <button 
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Columns className="h-4 w-4" />
                Colunas
              </button>
              
              {showColumnMenu && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-20 py-2 max-h-80 overflow-y-auto">
                  <div className="px-3 pb-2 mb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visibilidade</span>
                  </div>
                  {COLUMNS.map(col => (
                    <label key={col.id} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns[col.id]}
                        onChange={() => toggleColumn(col.id)}
                        className="rounded text-royal-blue focus:ring-royal-blue"
                      />
                      <span className="text-sm text-slate-700">{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 text-sm text-slate-600">
               <span>Página:</span>
               <select 
                 value={itemsPerPage} 
                 onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                 className="border-slate-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-royal-blue"
               >
                 <option value={50}>50</option>
                 <option value={100}>100</option>
                 <option value={500}>500</option>
                 <option value={1000}>1000</option>
               </select>
             </div>
             
             <div className="flex items-center gap-2">
               <button 
                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                 disabled={currentPage === 1}
                 className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"
               >
                 <ChevronLeft className="h-5 w-5 text-slate-600" />
               </button>
               <span className="text-sm font-semibold text-slate-700">Página {currentPage} de {totalPages || 1}</span>
               <button 
                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                 disabled={currentPage === totalPages || totalPages === 0}
                 className="p-1 rounded hover:bg-slate-200 disabled:opacity-50"
               >
                 <ChevronRight className="h-5 w-5 text-slate-600" />
               </button>
             </div>
          </div>
        </div>
        
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-bold border-b border-slate-200">
              <tr>
                {COLUMNS.filter(c => visibleColumns[c.id]).map(col => (
                  <th key={col.id} className="px-4 py-3" style={{ minWidth: col.minW }}>
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
                  </th>
                ))}
                <th className="px-4 py-3 min-w-[80px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={18} className="text-center py-12 text-slate-500">Carregando registros...</td></tr>
              ) : paginatedRecords.length === 0 ? (
                <tr><td colSpan={18} className="text-center py-12 text-slate-500">Nenhum registro encontrado.</td></tr>
              ) : (
                
                paginatedRecords.map(record => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    {COLUMNS.filter(c => visibleColumns[c.id]).map(col => {
                      let value = (record as any)[col.id];
                      
                      if (col.id === 'dataCalibracao') {
                        if (record.certificate) {
                          const correlatedInst = instruments.find(i => i.certificateNumber === record.certificate || (i.coma && i.coma === record.certificate));
                          if (correlatedInst && correlatedInst.lastCalibrationDate) {
                            // format date to DD/MM/YYYY
                            const dateParts = correlatedInst.lastCalibrationDate.split('-');
                            if (dateParts.length === 3) {
                              value = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                            } else {
                              value = correlatedInst.lastCalibrationDate;
                            }
                          } else {
                            value = '-';
                          }
                        } else {
                          value = '-';
                        }
                      }
                      
                      const isEditing = editingCell?.rowId === record.id && editingCell?.colId === col.id;
                      if (isEditing && col.id !== 'dataCalibracao') {
                        return (
                          <td key={col.id} className="px-4 py-2">
                            <input 
                              autoFocus
                              defaultValue={value}
                              onBlur={e => handleInlineSave(record, col.id, e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditingCell(null); }}
                              className="w-full px-2 py-1 text-sm border border-royal-blue rounded outline-none shadow-sm"
                            />
                          </td>
                        );
                      }

                      // Special renderers (clickable for edit)
                      if (col.id === 'certificate' || col.id === 'tag') {
                        return <td key={col.id} className="px-4 py-3 font-medium whitespace-nowrap cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => setEditingCell({rowId: record.id, colId: col.id})} title="Clique para editar">{value || '-'}</td>;
                      }
                      
                      if (col.id === 'observacao') {
                        return <td key={col.id} className="px-4 py-3 max-w-[200px] truncate cursor-pointer hover:bg-slate-100 transition-colors" title="Clique para editar" onClick={() => setEditingCell({rowId: record.id, colId: col.id})}>{value || '-'}</td>;
                      }

                      return <td key={col.id} className="px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors" title="Clique para editar" onClick={() => setEditingCell({rowId: record.id, colId: col.id})}>{value || '-'}</td>;
                    })}
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {(() => {
                        const extractNum = (s) => String(s || '').replace(/\D/g, '');
                        const recNum = extractNum(record.certificate);
                        const matchingInst = instruments.find(i => {
                          const instNum = extractNum(i.certificateNumber);
                          return instNum && recNum && instNum === recNum;
                        });
                        if (matchingInst && onPrintCertificate) {
                          return (
                            <button 
                              onClick={() => onPrintCertificate(matchingInst.id, record.tag || '', record.equipamento || '')} 
                              className="text-emerald-500 hover:text-emerald-600 mr-3" 
                              title="Imprimir Certificado (Calibração)"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          );
                        }
                        return null;
                      })()}
                      <button onClick={() => { setFormData(record); setShowAddModal(true); }} className="text-slate-400 hover:text-royal-blue mr-3" title="Editar Formulário">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteRecord(record.id)} className="text-slate-400 hover:text-red-500" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">
                {formData.id ? 'Editar Registro' : 'Novo Registro de Campo'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {COLUMNS.filter(c => c.id !== 'observacao' && c.id !== 'dataCalibracao').map(col => (
                  <div key={col.id}>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{col.label}</label>
                    <input 
                      type="text" 
                      value={(formData as any)[col.id] || ''} 
                      onChange={e => setFormData({...formData, [col.id]: e.target.value})} 
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none" 
                    />
                  </div>
                ))}
                
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Observação</label>
                  <textarea 
                    value={formData.observacao || ''} 
                    onChange={e => setFormData({...formData, observacao: e.target.value})} 
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none min-h-[80px]" 
                  />
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-600 font-semibold rounded-lg hover:bg-slate-200 transition-colors text-sm">
                Cancelar
              </button>
              <button onClick={handleSaveRecord} className="px-4 py-2 bg-royal-blue text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm shadow-sm">
                <Save className="h-4 w-4" />
                Salvar Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
