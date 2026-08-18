const fs = require('fs');
const content = `import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Upload, FileSpreadsheet, Plus, Save, X, Camera, RefreshCw, Trash2, Search, Download, ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  FieldServiceRecord, 
  syncFieldServiceRecords, 
  addFieldServiceRecord, 
  updateFieldServiceRecord, 
  bulkAddFieldServiceRecords,
  clearAllFieldServiceRecords 
} from '../lib/firebase';

const parseDateForSort = (dString: string) => {
  if (!dString) return 0;
  if (typeof dString === 'number') {
     return new Date(Math.round((dString - 25569) * 86400 * 1000)).getTime();
  }
  const parts = String(dString).split('/');
  if (parts.length === 3) {
    return new Date(\`\${parts[2]}-\${parts[1]}-\${parts[0]}T00:00:00\`).getTime();
  }
  return new Date(dString).getTime() || 0;
};

export default function FieldService() {
  const [records, setRecords] = useState<FieldServiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  
  // Filter states
  const [filters, setFilters] = useState({
    certificate: '', tag: '', equipamento: '', localizacao: '',
    interventionDate: '', technician: '', area: '', range: '',
    operacao: '', unidadeMedida: '', categoria: '', emissaoPdf: '',
    ordemServico: '', tipoServico: '', observacao: '', unidade: ''
  });
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<Partial<FieldServiceRecord>>({});
  
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = syncFieldServiceRecords((data) => {
      setRecords(data);
      setIsLoading(false);
    });
    return () => {
      unsubscribe.then(unsub => unsub());
    };
  }, []);

  const normalizeKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      'Certificado': '',
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
        // { raw: false } converts dates and other values to strings according to excel display
        const data = XLSX.utils.sheet_to_json(ws, { raw: false });
        
        let duplicates = 0;
        const newRecordsToImport: Omit<FieldServiceRecord, 'id'>[] = [];
        const existingCerts = new Set(records.map(r => r.certificate));

        for (const row of data as any[]) {
          const normalizedRow = Object.keys(row).reduce((acc, key) => {
             acc[normalizeKey(key)] = row[key];
             return acc;
          }, {} as Record<string, any>);

          const cert = normalizedRow['certificado'] || normalizedRow['cert'] || '';
          if (!cert) continue; 
          
          if (existingCerts.has(String(cert))) {
            duplicates++;
            continue;
          }
          existingCerts.add(String(cert));

          newRecordsToImport.push({
            tag: String(normalizedRow['tag'] || ''),
            equipamento: String(normalizedRow['equipamento'] || normalizedRow['descrio'] || ''),
            localizacao: String(normalizedRow['localizacao'] || normalizedRow['localizao'] || normalizedRow['local'] || normalizedRow['serie'] || normalizedRow['srie'] || ''),
            certificate: String(cert),
            interventionDate: String(normalizedRow['data'] || normalizedRow['date'] || normalizedRow['dataintervencao'] || normalizedRow['datadeinterveno'] || ''),
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
          });
        }
        
        if (newRecordsToImport.length > 0) {
          await bulkAddFieldServiceRecords(newRecordsToImport);
        }
        
        alert(\`Importação concluída!\\n\${newRecordsToImport.length} novos registros adicionados.\\n\${duplicates} ignorados (certificado já existente).\`);
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
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ServicoCampo");
    XLSX.writeFile(wb, "Servico_de_Campo_Export.xlsx");
  };

  const handleClearAll = async () => {
    const pwd = prompt("Digite a senha de administrador para limpar todos os dados:");
    if (pwd === "comanins123" || pwd === "admin123" || pwd === "admin") {
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
    } else if (pwd !== null) {
      alert("Senha incorreta!");
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

  const handleSaveRecord = async () => {
    if (!formData.certificate) {
      alert("O campo Certificado é obrigatório.");
      return;
    }

    const isDuplicate = records.some(r => r.certificate === formData.certificate && r.id !== formData.id);
    if (isDuplicate) {
      alert("Erro: Este Certificado já está registrado na planilha!");
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

  // Memoize filtering and sorting to prevent UI lockup on keystrokes with 20k rows
  const sortedRecords = useMemo(() => {
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
  }, [records, filters]);

  // Calculate pagination
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center text-sm font-semibold text-slate-700">
            Filtros por coluna abaixo <span className="ml-2 text-xs font-normal text-slate-500">({sortedRecords.length} registros filtrados de {records.length})</span>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 text-sm text-slate-600">
               <span>Itens por página:</span>
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
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 min-w-[120px]">
                  Certificado
                  <input type="text" value={filters.certificate} onChange={e=>handleFilterChange('certificate', e.target.value)} className="w-full mt-1 px-2 py-1 text-xs border rounded font-normal" placeholder="Filtrar..." />
                </th>
                <th className="px-4 py-3 min-w-[120px]">
                  Tag
                  <input type="text" value={filters.tag} onChange={e=>handleFilterChange('tag', e.target.value)} className="w-full mt-1 px-2 py-1 text-xs border rounded font-normal" placeholder="Filtrar..." />
                </th>
                <th className="px-4 py-3 min-w-[150px]">
                  Equipamento
                  <input type="text" value={filters.equipamento} onChange={e=>handleFilterChange('equipamento', e.target.value)} className="w-full mt-1 px-2 py-1 text-xs border rounded font-normal" placeholder="Filtrar..." />
                </th>
                <th className="px-4 py-3 min-w-[150px]">
                  Localização
                  <input type="text" value={filters.localizacao} onChange={e=>handleFilterChange('localizacao', e.target.value)} className="w-full mt-1 px-2 py-1 text-xs border rounded font-normal" placeholder="Filtrar..." />
                </th>
                <th className="px-4 py-3 min-w-[120px]">
                  Data Intervenção
                  <input type="text" value={filters.interventionDate} onChange={e=>handleFilterChange('interventionDate', e.target.value)} className="w-full mt-1 px-2 py-1 text-xs border rounded font-normal" placeholder="Filtrar..." />
                </th>
                <th className="px-4 py-3 min-w-[120px]">
                  Técnico
                  <input type="text" value={filters.technician} onChange={e=>handleFilterChange('technician', e.target.value)} className="w-full mt-1 px-2 py-1 text-xs border rounded font-normal" placeholder="Filtrar..." />
                </th>
                <th className="px-4 py-3 min-w-[120px]">
                  Área
                  <input type="text" value={filters.area} onChange={e=>handleFilterChange('area', e.target.value)} className="w-full mt-1 px-2 py-1 text-xs border rounded font-normal" placeholder="Filtrar..." />
                </th>
                <th className="px-4 py-3 min-w-[120px]">
                  Range
                  <input type="text" value={filters.range} onChange={e=>handleFilterChange('range', e.target.value)} className="w-full mt-1 px-2 py-1 text-xs border rounded font-normal" placeholder="Filtrar..." />
                </th>
                <th className="px-4 py-3 min-w-[120px]">
                  Operação
                  <input type="text" value={filters.operacao} onChange={e=>handleFilterChange('operacao', e.target.value)} className="w-full mt-1 px-2 py-1 text-xs border rounded font-normal" placeholder="Filtrar..." />
                </th>
                <th className="px-4 py-3 min-w-[100px]">
                  UM
                  <input type="text" value={filters.unidadeMedida} onChange={e=>handleFilterChange('unidadeMedida', e.target.value)} className="w-full mt-1 px-2 py-1 text-xs border rounded font-normal" placeholder="Filtrar..." />
                </th>
                <th className="px-4 py-3 min-w-[120px]">
                  Categoria
                  <input type="text" value={filters.categoria} onChange={e=>handleFilterChange('categoria', e.target.value)} className="w-full mt-1 px-2 py-1 text-xs border rounded font-normal" placeholder="Filtrar..." />
                </th>
                <th className="px-4 py-3 min-w-[100px]">
                  Emissão PDF
                  <input type="text" value={filters.emissaoPdf} onChange={e=>handleFilterChange('emissaoPdf', e.target.value)} className="w-full mt-1 px-2 py-1 text-xs border rounded font-normal" placeholder="Filtrar..." />
                </th>
                <th className="px-4 py-3 min-w-[100px]">
                  OS
                  <input type="text" value={filters.ordemServico} onChange={e=>handleFilterChange('ordemServico', e.target.value)} className="w-full mt-1 px-2 py-1 text-xs border rounded font-normal" placeholder="Filtrar..." />
                </th>
                <th className="px-4 py-3 min-w-[120px]">
                  Tipo Serv.
                  <input type="text" value={filters.tipoServico} onChange={e=>handleFilterChange('tipoServico', e.target.value)} className="w-full mt-1 px-2 py-1 text-xs border rounded font-normal" placeholder="Filtrar..." />
                </th>
                <th className="px-4 py-3 min-w-[150px]">
                  Observação
                  <input type="text" value={filters.observacao} onChange={e=>handleFilterChange('observacao', e.target.value)} className="w-full mt-1 px-2 py-1 text-xs border rounded font-normal" placeholder="Filtrar..." />
                </th>
                <th className="px-4 py-3 min-w-[120px]">
                  Unidade
                  <input type="text" value={filters.unidade} onChange={e=>handleFilterChange('unidade', e.target.value)} className="w-full mt-1 px-2 py-1 text-xs border rounded font-normal" placeholder="Filtrar..." />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={16} className="text-center py-8 text-slate-500">Carregando...</td></tr>
              ) : paginatedRecords.length === 0 ? (
                <tr><td colSpan={16} className="text-center py-8 text-slate-500">Nenhum registro encontrado.</td></tr>
              ) : (
                paginatedRecords.map(record => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{record.certificate}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap cursor-pointer hover:text-blue-600" onClick={() => { setFormData(record); setShowAddModal(true); }}>{record.tag || '-'}</td>
                    <td className="px-4 py-3">{record.equipamento || '-'}</td>
                    <td className="px-4 py-3">{record.localizacao || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{record.interventionDate || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{record.technician || '-'}</td>
                    <td className="px-4 py-3">{record.area || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{record.range || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{record.operacao || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{record.unidadeMedida || '-'}</td>
                    <td className="px-4 py-3">{record.categoria || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{record.emissaoPdf || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{record.ordemServico || '-'}</td>
                    <td className="px-4 py-3">{record.tipoServico || '-'}</td>
                    <td className="px-4 py-3 min-w-[150px] max-w-xs truncate" title={record.observacao}>{record.observacao || '-'}</td>
                    <td className="px-4 py-3">{record.unidade || '-'}</td>
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
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Certificado *</label>
                  <input type="text" value={formData.certificate || ''} onChange={e => setFormData({...formData, certificate: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none" placeholder="Ex: CERT-001" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tag do Equipamento</label>
                  <input type="text" value={formData.tag || ''} onChange={e => setFormData({...formData, tag: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none" placeholder="Ex: PI-101" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Equipamento</label>
                  <input type="text" value={formData.equipamento || ''} onChange={e => setFormData({...formData, equipamento: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none" placeholder="Nome do equipamento..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Localização</label>
                  <input type="text" value={formData.localizacao || ''} onChange={e => setFormData({...formData, localizacao: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none" placeholder="Local..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data da Intervenção</label>
                  <input type="text" value={formData.interventionDate || ''} onChange={e => setFormData({...formData, interventionDate: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none" placeholder="DD/MM/AAAA" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Técnico</label>
                  <input type="text" value={formData.technician || ''} onChange={e => setFormData({...formData, technician: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none" placeholder="Nome do técnico..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Área</label>
                  <input type="text" value={formData.area || ''} onChange={e => setFormData({...formData, area: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none" placeholder="Área..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Range</label>
                  <input type="text" value={formData.range || ''} onChange={e => setFormData({...formData, range: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none" placeholder="Ex: 0 a 10" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Operação</label>
                  <input type="text" value={formData.operacao || ''} onChange={e => setFormData({...formData, operacao: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none" placeholder="Operação..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unidade de Medida</label>
                  <input type="text" value={formData.unidadeMedida || ''} onChange={e => setFormData({...formData, unidadeMedida: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none" placeholder="Ex: bar, kgf/cm²" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Categoria</label>
                  <input type="text" value={formData.categoria || ''} onChange={e => setFormData({...formData, categoria: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none" placeholder="Categoria..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Emissão PDF</label>
                  <input type="text" value={formData.emissaoPdf || ''} onChange={e => setFormData({...formData, emissaoPdf: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none" placeholder="Emissão PDF..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ordem de Serviço</label>
                  <input type="text" value={formData.ordemServico || ''} onChange={e => setFormData({...formData, ordemServico: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none" placeholder="Nº da OS..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Serviço</label>
                  <input type="text" value={formData.tipoServico || ''} onChange={e => setFormData({...formData, tipoServico: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none" placeholder="Tipo de serviço..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unidade</label>
                  <input type="text" value={formData.unidade || ''} onChange={e => setFormData({...formData, unidade: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none" placeholder="Unidade geral..." />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Observação</label>
                  <textarea value={formData.observacao || ''} onChange={e => setFormData({...formData, observacao: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none min-h-[80px]" placeholder="Observações de campo..." />
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
`
fs.writeFileSync('src/components/FieldService.tsx', content);
