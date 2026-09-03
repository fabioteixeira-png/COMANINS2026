import React, { useState, useEffect, useRef, useMemo } from 'react';
import { compressImageToWebResolution } from '../lib/imageCompressor';
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
  deleteFieldServiceRecord, syncInstruments, refreshFieldServiceRecords
} from '../lib/firebase';
import { authJsonFetch, verifyAdminCredentials } from '../utils/authApi';
import { buildFieldServiceA4Workbook } from '../utils/fieldServiceA4Workbook';

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


export interface FieldServiceCertificateContext {
  fieldServiceRecordId: string;
  clientId?: string;
  cliente?: string;
  unidade?: string;
}

interface FieldServiceProps {
  canEdit?: boolean;
  onPrintCertificate?: (
    instId: string,
    tagData: string,
    equipmentData: string,
    context: FieldServiceCertificateContext,
  ) => void;
  onDownloadCertificate?: (
    instId: string,
    tagData: string,
    equipmentData: string,
    context: FieldServiceCertificateContext,
    fileName: string,
  ) => void | Promise<void>;
}
export default function FieldService({ canEdit = false, onPrintCertificate, onDownloadCertificate }: FieldServiceProps = {}) {
  const [records, setRecords] = useState<FieldServiceRecord[]>([]);
  const [downloadingCertificateId, setDownloadingCertificateId] = useState<string>('');
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);

  // Filter states
  const [filters, setFilters] = useState<Record<string, string>>({
    certificate: '', dataCalibracao: '', cliente: '', tag: '', equipamento: '', localizacao: '',
    interventionDate: '', technician: '', area: '', range: '',
    operacao: '', unidadeMedida: '', categoria: '', emissaoPdf: '',
    ordemServico: '', tipoServico: '', observacao: '', unidade: ''
  });

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    certificate: true, dataCalibracao: true, cliente: true, tag: true, equipamento: true,
    localizacao: false, interventionDate: true, technician: true, area: false,
    range: false, operacao: false, unidadeMedida: false, categoria: false,
    emissaoPdf: false, ordemServico: true, tipoServico: true, observacao: false, unidade: false
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(() => new Set());



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
    if (!canEdit) {
      setEditingCell(null);
      alert("Seu perfil possui somente permissão de visualização no módulo Serviço de Campo.");
      return;
    }

    const previousValue = String((record as any)[colId] || '');
    if (previousValue === newVal) {
      setEditingCell(null);
      return;
    }

    if (colId === 'certificate' && newVal.trim() !== '') {
      const normalizedCertificate = newVal.trim().toUpperCase();
      const isDup = records.some(
        (r) => String(r.certificate || '').trim().toUpperCase() === normalizedCertificate && r.id !== record.id,
      );
      if (isDup) {
        alert("Erro: Este Certificado já está registrado na planilha!");
        return;
      }
    }

    if (colId === 'tag' && newVal.trim() !== '') {
      const normalizedTag = newVal.trim().toUpperCase();
      const isDup = records.some(
        (r) => String(r.tag || '').trim().toUpperCase() === normalizedTag && r.id !== record.id,
      );
      if (isDup) {
        alert("Erro: Esta TAG já está registrada na planilha!");
        return;
      }
    }

    const previousCalibrationDate = record.dataCalibracao || '';
    const previousClientId = record.clientId || '';
    const updatePayload: Partial<FieldServiceRecord> = { [colId]: newVal } as Partial<FieldServiceRecord>;

    if (colId === 'certificate') {
      const linkedInstrument = findInstrumentByCertificate(newVal);
      updatePayload.certificate = newVal.trim().toUpperCase();
      updatePayload.dataCalibracao = linkedInstrument?.lastCalibrationDate || '';
      if (linkedInstrument?.clientId) updatePayload.clientId = linkedInstrument.clientId;
    }

    // Atualização otimista: a célula não volta para o certificado antigo enquanto
    // o Firestore confirma a gravação. O snapshot local usa o mesmo payload persistido.
    setRecords((current) => current.map((item) => (
      item.id === record.id ? { ...item, ...updatePayload } as FieldServiceRecord : item
    )));
    setEditingCell(null);

    try {
      await updateFieldServiceRecord(record.id, updatePayload);
    } catch (e) {
      console.error(e);
      setRecords((current) => current.map((item) => (
        item.id === record.id
          ? {
              ...item,
              [colId]: previousValue,
              ...(colId === 'certificate'
                ? { dataCalibracao: previousCalibrationDate, clientId: previousClientId }
                : {}),
            } as FieldServiceRecord
          : item
      )));
      alert("Erro ao salvar célula. O valor anterior foi restaurado.");
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!canEdit) {
      alert("Seu perfil possui somente permissão de visualização no módulo Serviço de Campo.");
      return;
    }
    const adminUsername = prompt("Digite o usuário do administrador:");
    if (adminUsername === null) return;
    const pwd = prompt("Digite a senha do administrador para excluir este registro:");
    if (pwd === null) return;

    try {
      const isAdminValid = await verifyAdminCredentials(adminUsername, pwd);
      if (!isAdminValid) {
        alert("Credencial administrativa inválida.");
        return;
      }
      if (confirm("Tem certeza que deseja excluir?")) {
        await deleteFieldServiceRecord(id);
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Erro ao validar autorização administrativa.");
    }
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<Partial<FieldServiceRecord>>({});

  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isRefreshingRecords, setIsRefreshingRecords] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);

  useEffect(() => {
    if (!canEdit) {
      setEditingCell(null);
      setShowAddModal(false);
      setFormData({});
    }
  }, [canEdit]);

  useEffect(() => {
    const unsubscribeInst = syncInstruments((data) => setInstruments(data));
    const unsubscribe = syncFieldServiceRecords((data) => {
      setRecords(data);
      setIsLoading(false);
    });
    return () => {
      unsubscribe.then(unsub => unsub());
      unsubscribeInst.then(u => u());
    };
  }, []);

  const normalizeKey = (k: string) => k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const normalizeCertificate = (value: unknown) => String(value || '').trim().toUpperCase();
  const certificateDigits = (value: unknown) => normalizeCertificate(value).replace(/\D/g, '');

  const findInstrumentByCertificate = (certificate: unknown): Instrument | undefined => {
    const normalized = normalizeCertificate(certificate);
    if (!normalized) return undefined;
    const numeric = certificateDigits(normalized);
    return instruments.find((instrument) => {
      const certificateNumber = normalizeCertificate(instrument.certificateNumber);
      const coma = normalizeCertificate(instrument.coma);
      if (certificateNumber === normalized || coma === normalized) return true;
      if (!numeric) return false;
      return certificateDigits(certificateNumber) === numeric || certificateDigits(coma) === numeric;
    });
  };

  const formatCalibrationDate = (value: unknown): string => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    return raw;
  };

  const resolveCalibrationDate = (record: Partial<FieldServiceRecord>): string => {
    const instrument = findInstrumentByCertificate(record.certificate);
    return formatCalibrationDate(instrument?.lastCalibrationDate || record.dataCalibracao || '');
  };

  const loadComaninsLogoBytes = async (): Promise<Uint8Array> => {
    const response = await fetch('/COMANINS%202026_logo_horizontal_transparente.png', { cache: 'force-cache' });
    if (!response.ok) throw new Error('Não foi possível carregar a logo COMANINS.');
    return new Uint8Array(await response.arrayBuffer());
  };

  const triggerWorkbookDownload = (bytes: Uint8Array, fileName: string) => {
    const workbookBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([workbookBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const resolveClientId = (record: Partial<FieldServiceRecord>): string => {
    const cert = normalizeCertificate(record.certificate);
    const tag = String(record.tag || '').trim().toUpperCase();

    if (cert) {
      const certificateMatch = findInstrumentByCertificate(cert);
      if (certificateMatch?.clientId) return String(certificateMatch.clientId).trim();
    }

    if (tag) {
      const tagMatches = instruments.filter(
        (instrument) => String(instrument.tag || '').trim().toUpperCase() === tag,
      );
      const clientIds = Array.from(new Set(tagMatches.map((instrument) => String(instrument.clientId || '').trim()).filter(Boolean)));
      if (clientIds.length === 1) return clientIds[0];
    }

    return String(record.clientId || '').trim();
  };

  const handleRefreshRecords = async () => {
    setIsRefreshingRecords(true);
    try {
      await refreshFieldServiceRecords();
    } catch (error) {
      console.error(error);
      alert('Não foi possível atualizar os registros de Serviço de Campo.');
    } finally {
      setIsRefreshingRecords(false);
    }
  };

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
    if (!canEdit) {
      e.target.value = '';
      alert("Seu perfil possui somente permissão de visualização no módulo Serviço de Campo.");
      return;
    }
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
            clientId: '',
            cliente: String(normalizedRow['cliente'] || ''),
            tag: strTag,
            equipamento: String(normalizedRow['equipamento'] || normalizedRow['descrio'] || ''),
            localizacao: String(normalizedRow['localizacao'] || normalizedRow['localizao'] || normalizedRow['local'] || normalizedRow['serie'] || normalizedRow['srie'] || ''),
            certificate: strCert,
            dataCalibracao: String(normalizedRow['datacalibracao'] || normalizedRow['datadecalibracao'] || ''),
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
          const linkedInstrument = findInstrumentByCertificate(parsedRecord.certificate);
          if (linkedInstrument?.lastCalibrationDate) {
            parsedRecord.dataCalibracao = linkedInstrument.lastCalibrationDate;
          }
          parsedRecord.clientId = resolveClientId(parsedRecord);

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
    if (sortedRecords.length === 0) {
      alert("Nenhum registro encontrado para o filtro atual.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(sortedRecords.map((record) => ({
      'Certificado': record.certificate || '',
      'Data Calibração': resolveCalibrationDate(record) || '',
      'Data de Intervenção': record.interventionDate || '',
      'Tag': record.tag || '',
      'Equipamento': record.equipamento || '',
      'Localização': record.localizacao || '',
      'Técnico': record.technician || '',
      'Área': record.area || '',
      'Range': record.range || '',
      'Operação': record.operacao || '',
      'Unidade de Medida': record.unidadeMedida || '',
      'Categoria': record.categoria || '',
      'Emissão PDF': record.emissaoPdf || '',
      'Ordem de Serviço': record.ordemServico || '',
      'Tipo de Serviço': record.tipoServico || '',
      'Observação': record.observacao || '',
      'Unidade': record.unidade || '',
      'Cliente': record.cliente || '',
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ServicoCampo');
    XLSX.writeFile(workbook, 'Servico_de_Campo_Export.xlsx');
  };

  const handleExportA4 = async () => {
    const exportRecords = sortedRecords.filter((record) => selectedRecordIds.has(record.id));
    if (exportRecords.length === 0) {
      alert("Selecione ao menos um registro na coluna Selecionar antes de gerar a Planilha A4.");
      return;
    }

    try {
      const logoPng = await loadComaninsLogoBytes();
      const workbookBytes = buildFieldServiceA4Workbook(
        exportRecords.map((record) => ({
          tag: String(record.tag || ''),
          equipamento: String(record.equipamento || ''),
          localizacao: String(record.localizacao || ''),
          area: String(record.area || ''),
          range: String(record.range || ''),
          operacao: String(record.operacao || ''),
          unidadeMedida: String(record.unidadeMedida || ''),
          certificate: String(record.certificate || ''),
          tipoServico: String(record.tipoServico || ''),
          ordemServico: String(record.ordemServico || ''),
          observacao: String(record.observacao || ''),
          unidade: String(record.unidade || ''),
        })),
        logoPng,
      );

      const uniqueUnits: string[] = Array.from(new Set<string>(
        exportRecords.map((record) => String(record.unidade || '').trim()).filter(Boolean),
      ));
      const suffix = (uniqueUnits.length === 1 ? uniqueUnits[0] : 'FILTRO')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '_');

      triggerWorkbookDownload(
        workbookBytes,
        `LISTA_DE_SERVICOS_${suffix || 'CAMPO'}.xlsx`,
      );
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'Não foi possível gerar a planilha A4.');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) {
      e.target.value = '';
      alert("Seu perfil possui somente permissão de visualização no módulo Serviço de Campo.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    try {
      let base64 = "";
      try {
        // Manuscritos exigem mais definição que uma foto de cadastro comum.
        base64 = await compressImageToWebResolution(file, 2200, 2200, 0.86);
      } catch {
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      }

      const response = await authJsonFetch('/api/parse-field-service-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mode: 'table' })
      });

      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responseData.error || "Erro ao processar imagem.");
      }

      const extractedRows = Array.isArray(responseData.records)
        ? responseData.records
        : (responseData && typeof responseData === 'object' ? [responseData] : []);

      const rows = extractedRows
        .map((data: any) => {
          const certificate = String(data.certificate || '').trim();
          const linkedInstrument = findInstrumentByCertificate(certificate);
          return {
            'Certificado': certificate,
            'Data Calibração': formatCalibrationDate(linkedInstrument?.lastCalibrationDate || data.dataCalibracao || ''),
            'Data de Intervenção': dateMask(String(data.interventionDate || '')),
            'Tag': String(data.tag || ''),
            'Equipamento': String(data.equipamento || ''),
            'Localização': String(data.localizacao || ''),
            'Técnico': String(data.technician || ''),
            'Área': String(data.area || ''),
            'Range': String(data.range || ''),
            'Operação': String(data.operacao || ''),
            'Unidade de Medida': String(data.unidadeMedida || ''),
            'Categoria': String(data.categoria || ''),
            'Emissão PDF': String(data.emissaoPdf || ''),
            'Ordem de Serviço': String(data.ordemServico || ''),
            'Tipo de Serviço': String(data.tipoServico || ''),
            'Observação': String(data.observacao || ''),
            'Unidade': String(data.unidade || ''),
            'Cliente': String(data.cliente || ''),
          };
        })
        .filter((row: any) => Object.values(row).some((value) => String(value || '').trim() !== ''));

      if (rows.length === 0) {
        throw new Error('Nenhuma linha legível foi identificada na foto. Tente uma imagem mais nítida e bem enquadrada.');
      }

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!cols'] = [
        { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 26 }, { wch: 22 },
        { wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 16 },
        { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 34 }, { wch: 18 }, { wch: 24 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Importacao');
      const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
      XLSX.writeFile(workbook, `IMPORTACAO_SERVICO_CAMPO_IA_${stamp}.xlsx`);

      alert(`Leitura concluída: ${rows.length} linha(s) reconhecida(s).\n\nA planilha de importação foi gerada. Revise os dados e use o botão “Importar Planilha” no próprio Serviço de Campo.`);
    } catch (error: any) {
      console.error(error);
      alert("Falha na extração dos dados manuscritos: " + error.message);
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
    if (!canEdit) {
      alert("Seu perfil possui somente permissão de visualização no módulo Serviço de Campo.");
      setShowAddModal(false);
      return;
    }
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
      const linkedInstrument = findInstrumentByCertificate(formData.certificate);
      const recordToSave: Partial<FieldServiceRecord> = {
        ...formData,
        certificate: normalizeCertificate(formData.certificate),
        dataCalibracao: linkedInstrument?.lastCalibrationDate || formData.dataCalibracao || '',
        clientId: resolveClientId(formData),
      };
      if (formData.id) {
        await updateFieldServiceRecord(formData.id, recordToSave);
      } else {
        await addFieldServiceRecord(recordToSave as any);
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
        const rawValue = k === 'dataCalibracao' ? resolveCalibrationDate(r) : (r as any)[k];
        const recordVal = String(rawValue || '').toLowerCase();
        return recordVal.includes(String(v).toLowerCase());
      });
    });

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        if (sortConfig.key === 'interventionDate' || sortConfig.key === 'dataCalibracao') {
          const dateA = parseDateForSort(sortConfig.key === 'dataCalibracao' ? resolveCalibrationDate(a) : a.interventionDate);
          const dateB = parseDateForSort(sortConfig.key === 'dataCalibracao' ? resolveCalibrationDate(b) : b.interventionDate);
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
  }, [records, filters, sortConfig, instruments]);

  const selectedFilteredRecords = useMemo(
    () => sortedRecords.filter((record) => selectedRecordIds.has(record.id)),
    [sortedRecords, selectedRecordIds],
  );
  const allFilteredSelected = sortedRecords.length > 0 && selectedFilteredRecords.length === sortedRecords.length;
  const someFilteredSelected = selectedFilteredRecords.length > 0 && !allFilteredSelected;

  const toggleRecordSelection = (recordId: string) => {
    setSelectedRecordIds((current) => {
      const next = new Set(current);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
  };

  const toggleAllFilteredRecords = () => {
    setSelectedRecordIds((current) => {
      const next = new Set(current);
      if (allFilteredSelected) {
        sortedRecords.forEach((record) => next.delete(record.id));
      } else {
        sortedRecords.forEach((record) => next.add(record.id));
      }
      return next;
    });
  };

  useEffect(() => {
    const existingIds = new Set(records.map((record) => record.id));
    setSelectedRecordIds((current) => {
      const next = new Set(Array.from(current).filter((id) => existingIds.has(id)));
      if (next.size === current.size && Array.from(next).every((id) => current.has(id))) return current;
      return next;
    });
  }, [records]);

  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedRecords.slice(start, start + itemsPerPage);
  }, [sortedRecords, currentPage, itemsPerPage]);

  useEffect(() => {
    const tableScroller = tableScrollRef.current;
    if (!tableScroller) return;
    const updateWidth = () => setTableScrollWidth(tableScroller.scrollWidth);
    updateWidth();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateWidth) : null;
    observer?.observe(tableScroller);
    window.addEventListener('resize', updateWidth);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [paginatedRecords.length, visibleColumns]);

  const syncTopScroll = () => {
    if (topScrollRef.current && tableScrollRef.current) {
      tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const syncTableScroll = () => {
    if (topScrollRef.current && tableScrollRef.current) {
      topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
    }
  };

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
          <input type="file" accept="image/*,.heic,.heif" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />

          <button
            onClick={handleDownloadTemplate}
            className="flex items-center space-x-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg transition-colors text-sm"
          >
            <FileDown className="h-4 w-4" />
            <span>Modelo Planilha</span>
          </button>

          {canEdit && (
            <button
              onClick={() => excelInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center space-x-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              {isImporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              <span>{isImporting ? 'Importando...' : 'Importar Planilha'}</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors text-sm"
            title="Exporta os registros do filtro atual em um arquivo Excel editável"
          >
            <Download className="h-4 w-4" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={handleExportA4}
            className="flex items-center space-x-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors text-sm"
            title="Gera somente os registros marcados na coluna Selecionar, em XLSX real com logo COMANINS e página A4 horizontal"
          >
            <Printer className="h-4 w-4" />
            <span>Gerar Planilha A4</span>
          </button>

          <button
            onClick={handleRefreshRecords}
            disabled={isRefreshingRecords}
            className="flex items-center space-x-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
            title="Atualizar a base manualmente. A navegação entre abas usa o cache em memória."
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshingRecords ? 'animate-spin' : ''}`} />
            <span>Atualizar Dados</span>
          </button>

          {canEdit && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingImage}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
              >
                {isProcessingImage ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                <span>{isProcessingImage ? 'Lendo manuscritos...' : 'Foto → Planilha (IA)'}</span>
              </button>

              <button
                onClick={() => { setFormData({}); setShowAddModal(true); }}
                className="flex items-center space-x-2 px-3 py-2 bg-royal-blue hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Novo Registro</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-visible relative">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center text-sm font-semibold text-slate-700">
              Filtros por coluna abaixo <span className="ml-2 text-xs font-normal text-slate-500">({sortedRecords.length} de {records.length})</span>
              <span className="ml-3 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                {selectedFilteredRecords.length} selecionado(s)
              </span>
              {selectedFilteredRecords.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedRecordIds(new Set())}
                  className="ml-2 text-[11px] font-bold text-slate-500 hover:text-rose-600 underline"
                >
                  Limpar seleção
                </button>
              )}
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

        <div
          ref={topScrollRef}
          onScroll={syncTopScroll}
          className="overflow-x-auto overflow-y-hidden h-4 border-b border-slate-200 bg-slate-50"
          title="Rolagem horizontal superior"
        >
          <div style={{ width: `${tableScrollWidth}px`, height: '1px' }} />
        </div>
        <div ref={tableScrollRef} onScroll={syncTableScroll} className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 min-w-[92px] text-center align-top">
                  <div className="flex flex-col items-center gap-2">
                    <span>Selecionar</span>
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      ref={(element) => { if (element) element.indeterminate = someFilteredSelected; }}
                      onChange={toggleAllFilteredRecords}
                      disabled={sortedRecords.length === 0}
                      className="h-4 w-4 rounded border-slate-300 text-royal-blue focus:ring-royal-blue"
                      title={allFilteredSelected ? 'Desmarcar todos os registros filtrados' : 'Selecionar todos os registros filtrados'}
                    />
                  </div>
                </th>
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
                <tr><td colSpan={COLUMNS.filter(c => visibleColumns[c.id]).length + 2} className="text-center py-12 text-slate-500">Carregando registros...</td></tr>
              ) : paginatedRecords.length === 0 ? (
                <tr><td colSpan={COLUMNS.filter(c => visibleColumns[c.id]).length + 2} className="text-center py-12 text-slate-500">Nenhum registro encontrado.</td></tr>
              ) : (

                paginatedRecords.map(record => (
                  <tr key={record.id} className={`transition-colors ${selectedRecordIds.has(record.id) ? 'bg-blue-50/70 hover:bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <td className="px-3 py-3 text-center align-middle">
                      <input
                        type="checkbox"
                        checked={selectedRecordIds.has(record.id)}
                        onChange={() => toggleRecordSelection(record.id)}
                        className="h-4 w-4 rounded border-slate-300 text-royal-blue focus:ring-royal-blue"
                        aria-label={`Selecionar TAG ${record.tag || record.id}`}
                      />
                    </td>
                    {COLUMNS.filter(c => visibleColumns[c.id]).map(col => {
                      let value = (record as any)[col.id];

                      if (col.id === 'dataCalibracao') {
                        value = resolveCalibrationDate(record) || '-';
                      }

                      const isEditing = canEdit && editingCell?.rowId === record.id && editingCell?.colId === col.id;
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
                        return <td key={col.id} className={`px-4 py-3 font-medium whitespace-nowrap ${canEdit ? 'cursor-pointer hover:bg-blue-50 transition-colors' : ''}`} onClick={() => canEdit && setEditingCell({rowId: record.id, colId: col.id})} title={canEdit ? "Clique para editar" : "Somente visualização"}>{value || '-'}</td>;
                      }

                      if (col.id === 'observacao') {
                        return <td key={col.id} className={`px-4 py-3 max-w-[200px] truncate ${canEdit ? 'cursor-pointer hover:bg-slate-100 transition-colors' : ''}`} title={canEdit ? "Clique para editar" : "Somente visualização"} onClick={() => canEdit && setEditingCell({rowId: record.id, colId: col.id})}>{value || '-'}</td>;
                      }

                      return <td key={col.id} className={`px-4 py-3 whitespace-nowrap ${canEdit ? 'cursor-pointer hover:bg-slate-100 transition-colors' : ''}`} title={canEdit ? "Clique para editar" : "Somente visualização"} onClick={() => canEdit && setEditingCell({rowId: record.id, colId: col.id})}>{value || '-'}</td>;
                    })}
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {(() => {
                        const matchingInst = findInstrumentByCertificate(record.certificate);
                        if (matchingInst && (onPrintCertificate || onDownloadCertificate)) {
                          const context: FieldServiceCertificateContext = {
                            fieldServiceRecordId: record.id,
                            clientId: record.clientId,
                            cliente: record.cliente || '',
                            unidade: record.unidade || '',
                          };
                          const safeFilePart = (value: unknown, fallback: string) =>
                            String(value || fallback)
                              .trim()
                              .replace(/[\\/:*?"<>|]+/g, '-')
                              .replace(/\s+/g, ' ');
                          const downloadFileName = `${safeFilePart(record.tag || matchingInst.tag, 'SEM TAG')} - ${safeFilePart(record.certificate || matchingInst.certificateNumber || matchingInst.coma, 'SEM CERTIFICADO')}.pdf`;
                          return (
                            <>
                              {onPrintCertificate && (
                                <button
                                  onClick={() => onPrintCertificate(
                                    matchingInst.id,
                                    record.tag || '',
                                    record.equipamento || '',
                                    context,
                                  )}
                                  className="text-emerald-500 hover:text-emerald-600 mr-3"
                                  title="Visualizar / imprimir Certificado de Calibração"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              )}
                              {onDownloadCertificate && (
                                <button
                                  onClick={async () => {
                                    if (downloadingCertificateId) return;
                                    setDownloadingCertificateId(record.id);
                                    try {
                                      await onDownloadCertificate(
                                        matchingInst.id,
                                        record.tag || '',
                                        record.equipamento || '',
                                        context,
                                        downloadFileName,
                                      );
                                    } finally {
                                      setDownloadingCertificateId('');
                                    }
                                  }}
                                  disabled={Boolean(downloadingCertificateId)}
                                  className="text-blue-600 hover:text-blue-700 disabled:text-slate-300 disabled:cursor-wait mr-3"
                                  title={downloadingCertificateId === record.id ? 'Gerando PDF...' : `Baixar PDF: ${downloadFileName}`}
                                >
                                  <Download className={`w-4 h-4 ${downloadingCertificateId === record.id ? 'animate-pulse' : ''}`} />
                                </button>
                              )}
                            </>
                          );
                        }
                        return null;
                      })()}
                      {canEdit && (
                        <>
                          <button onClick={() => { setFormData(record); setShowAddModal(true); }} className="text-slate-400 hover:text-royal-blue mr-3" title="Editar Formulário">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteRecord(record.id)} className="text-slate-400 hover:text-red-500" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && canEdit && (
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
