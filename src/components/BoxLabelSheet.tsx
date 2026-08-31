import React from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FileText,
  LayoutGrid,
  Lock,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Settings2,
  X,
  XCircle,
} from 'lucide-react';
import type { CalibrationReport, Client, Instrument } from '../types';
import {
  createBoxLabelSheetDoc,
  saveBoxLabelSheetDoc,
  syncBoxLabelSheets,
  type BoxLabelSheetRecord,
  type BoxLabelSheetSlot,
} from '../lib/firebase';
import {
  A4363,
  buildA4363LabelsPdf,
  buildA4363TestPdf,
  downloadPdfBlob,
  normalizeA4363Calibration,
  type A4363PrintCalibration,
  type BoxLabelPdfData,
} from '../utils/pimacoA4363';

interface BoxLabelSheetProps {
  clients: Client[];
  instruments: Instrument[];
  reports: CalibrationReport[];
  currentUser?: {
    id?: string;
    username?: string;
    name?: string;
  } | null;
  canEdit: boolean;
}

type LookupState = 'empty' | 'valid' | 'not_found' | 'incomplete';

interface SlotDraft {
  certificateNumber: string;
}

interface ResolvedLabel {
  state: LookupState;
  data?: BoxLabelPdfData;
  instrument?: Instrument;
  missing?: string[];
}

const EMPTY_DRAFTS = (): Record<number, SlotDraft> =>
  Object.fromEntries(
    Array.from({ length: A4363.labelsPerSheet }, (_, index) => [index + 1, { certificateNumber: '' }]),
  );

const normalizeCertificate = (value: unknown) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const formatDate = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString('pt-BR');
};

const field = (instrument: Instrument, key: keyof Instrument): string => {
  const current = instrument[key];
  if (current !== undefined && current !== null && String(current).trim() !== '') return String(current).trim();
  const snapshot = instrument.registrationSnapshot?.data?.[String(key)];
  return snapshot !== undefined && snapshot !== null ? String(snapshot).trim() : '';
};

const numberField = (instrument: Instrument, key: keyof Instrument): number | null => {
  const raw = field(instrument, key);
  if (!raw) return null;
  const parsed = Number(String(raw).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const formatRange = (instrument: Instrument): { range: string; unit: string } => {
  const min = numberField(instrument, 'rangeMin');
  const max = numberField(instrument, 'rangeMax');
  const unit = field(instrument, 'unit');
  if (min !== null && max !== null) {
    return { range: `${String(min).replace('.', ',')} a ${String(max).replace('.', ',')}`, unit };
  }
  const escala = field(instrument, 'escala');
  return { range: escala, unit };
};

const getLatestMatchingReport = (
  reports: CalibrationReport[],
  instrument: Instrument,
  certificate: string,
): CalibrationReport | undefined => {
  const certKey = normalizeCertificate(certificate);
  const sameInstrument = reports.filter(
    (report) => report.isDeleted !== true && report.instrumentId === instrument.id,
  );
  const exact = sameInstrument.filter((report) => normalizeCertificate(report.certNumber) === certKey);
  const approvedExact = exact.filter((report) => report.approved === true);
  const approvedAny = sameInstrument.filter((report) => report.approved === true);
  const candidates = approvedExact.length
    ? approvedExact
    : exact.length
      ? exact
      : approvedAny.length
        ? approvedAny
        : sameInstrument;
  return [...candidates].sort((a, b) => Date.parse(String(b.date || '')) - Date.parse(String(a.date || '')))[0];
};

const resolveLabel = ({
  certificate,
  position,
  instruments,
  clients,
  reports,
}: {
  certificate: string;
  position: number;
  instruments: Instrument[];
  clients: Client[];
  reports: CalibrationReport[];
}): ResolvedLabel => {
  const normalized = normalizeCertificate(certificate);
  if (!normalized) return { state: 'empty' };

  let instrument = instruments.find(
    (item) =>
      item.isDeleted !== true &&
      [item.certificateNumber, item.coma].some((candidate) => normalizeCertificate(candidate) === normalized),
  );

  if (!instrument) {
    const report = reports.find(
      (item) => item.isDeleted !== true && normalizeCertificate(item.certNumber) === normalized,
    );
    if (report) instrument = instruments.find((item) => item.id === report.instrumentId && item.isDeleted !== true);
  }

  if (!instrument) return { state: 'not_found' };

  const client = clients.find((item) => item.id === instrument?.clientId);
  const matchingReport = getLatestMatchingReport(reports, instrument, certificate);
  const rangeData = formatRange(instrument);
  const calibrationDate = formatDate(matchingReport?.date || instrument.lastCalibrationDate);
  const clientName = String(client?.name || '').trim();
  const diameter = field(instrument, 'diametro');
  const connection = field(instrument, 'conexao');
  // O número impresso deve representar exatamente o certificado pesquisado.
  // Se houver um laudo com correspondência exata, preservamos a grafia canônica
  // registrada nele; jamais substituímos pelo certificado atual do instrumento.
  const requestedCertificate = String(certificate || '').trim().toUpperCase();
  const matchingReportCertificate = String(matchingReport?.certNumber || '').trim();
  const certificateNumber =
    matchingReportCertificate && normalizeCertificate(matchingReportCertificate) === normalized
      ? matchingReportCertificate
      : requestedCertificate;

  const missing: string[] = [];
  if (!clientName) missing.push('cliente');
  if (!rangeData.range) missing.push('range');
  if (!rangeData.unit) missing.push('unidade');
  if (!diameter) missing.push('diâmetro');
  if (!connection) missing.push('conexão');
  if (!calibrationDate) missing.push('data de calibração');

  const data: BoxLabelPdfData = {
    position,
    certificateNumber,
    clientName: clientName || 'NÃO CADASTRADO',
    range: rangeData.range || 'NÃO CADASTRADO',
    unit: rangeData.unit || '',
    diameter: diameter || 'NÃO CADASTRADO',
    connection: connection || 'NÃO CADASTRADO',
    calibrationDate: calibrationDate || 'NÃO CADASTRADA',
  };

  return {
    state: missing.length ? 'incomplete' : 'valid',
    data,
    instrument,
    missing,
  };
};

const slotClass = (slot: BoxLabelSheetSlot, resolved: ResolvedLabel) => {
  if (slot.status === 'printed') return 'border-slate-300 bg-slate-100';
  if (slot.status === 'unavailable') return 'border-dashed border-slate-300 bg-slate-50';
  if (resolved.state === 'valid') return 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-100';
  if (resolved.state === 'not_found') return 'border-red-400 bg-red-50';
  if (resolved.state === 'incomplete') return 'border-amber-400 bg-amber-50';
  return 'border-slate-300 bg-white hover:border-slate-400';
};

const downloadName = (sheet: BoxLabelSheetRecord) =>
  `COMANINS_A4363_${String(sheet.displayCode || sheet.id).replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`;

export default function BoxLabelSheet({
  clients,
  instruments,
  reports,
  currentUser,
  canEdit,
}: BoxLabelSheetProps) {
  const [sheets, setSheets] = React.useState<BoxLabelSheetRecord[]>([]);
  const [activeSheetId, setActiveSheetId] = React.useState('');
  const [drafts, setDrafts] = React.useState<Record<number, SlotDraft>>(EMPTY_DRAFTS);
  const [selectedPositions, setSelectedPositions] = React.useState<Set<number>>(new Set());
  const [batchOpen, setBatchOpen] = React.useState(false);
  const [batchText, setBatchText] = React.useState('');
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [pendingPrintedPositions, setPendingPrintedPositions] = React.useState<number[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [loadingSheets, setLoadingSheets] = React.useState(true);
  const [sheetAccessError, setSheetAccessError] = React.useState('');
  const [calibration, setCalibration] = React.useState<A4363PrintCalibration>(() => {
    try {
      return normalizeA4363Calibration(JSON.parse(localStorage.getItem('comanins_a4363_print_calibration') || '{}'));
    } catch {
      return normalizeA4363Calibration();
    }
  });

  React.useEffect(() => {
    setSheetAccessError('');
    const unsubscribePromise = syncBoxLabelSheets(
      (items) => {
        setSheets(items);
        setLoadingSheets(false);
        setActiveSheetId((current) => {
          if (current && items.some((item) => item.id === current)) return current;
          return items.find((item) => item.status === 'open')?.id || '';
        });
      },
      (message) => {
        setSheetAccessError(message);
        setLoadingSheets(false);
      },
    );
    return () => {
      Promise.resolve(unsubscribePromise)
        .then((unsubscribe) => {
          if (typeof unsubscribe === 'function') unsubscribe();
        })
        .catch((error) => console.warn('Falha ao encerrar listener A4363:', error));
    };
  }, []);

  const activeSheet = sheets.find((sheet) => sheet.id === activeSheetId) || null;
  const slots = React.useMemo<BoxLabelSheetSlot[]>(() => {
    if (!activeSheet) return [];
    const byPosition = new Map(activeSheet.slots.map((slot) => [slot.position, slot]));
    return Array.from({ length: A4363.labelsPerSheet }, (_, index) => {
      const position = index + 1;
      return byPosition.get(position) || { position, status: 'available' as const };
    });
  }, [activeSheet]);

  const resolvedByPosition = React.useMemo(() => {
    const map = new Map<number, ResolvedLabel>();
    slots.forEach((slot) => {
      map.set(
        slot.position,
        resolveLabel({
          certificate: drafts[slot.position]?.certificateNumber || '',
          position: slot.position,
          instruments,
          clients,
          reports,
        }),
      );
    });
    return map;
  }, [slots, drafts, instruments, clients, reports]);

  const readyPositions = slots
    .filter((slot) => slot.status === 'available')
    .filter((slot) => resolvedByPosition.get(slot.position)?.state === 'valid')
    .map((slot) => slot.position);
  const availableCount = slots.filter((slot) => slot.status === 'available').length;
  const printedCount = slots.filter((slot) => slot.status === 'printed').length;

  const resetDrafts = () => {
    setDrafts(EMPTY_DRAFTS());
    setSelectedPositions(new Set());
    setBatchText('');
    setPendingPrintedPositions([]);
  };

  React.useEffect(() => {
    resetDrafts();
  }, [activeSheetId]);

  const actor = {
    id: currentUser?.id || currentUser?.username || '',
    name: currentUser?.name || currentUser?.username || 'Usuário interno',
  };

  const handleNewSheet = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    try {
      setSheetAccessError('');
      const created = await createBoxLabelSheetDoc(actor);
      setActiveSheetId(created.id);
      resetDrafts();
    } catch (error: any) {
      const message = error?.message || 'Não foi possível criar a folha A4363.';
      setSheetAccessError(message);
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateSheetSlots = async (nextSlots: BoxLabelSheetSlot[]) => {
    if (!activeSheet || !canEdit) return;
    const status = nextSlots.every((slot) => slot.status !== 'available') ? 'completed' : 'open';
    await saveBoxLabelSheetDoc(activeSheet.id, {
      slots: nextSlots,
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: actor.name,
      updatedById: actor.id,
    });
  };

  const toggleUnavailable = async (position: number) => {
    if (!activeSheet || !canEdit) return;
    setPendingPrintedPositions([]);
    const slot = slots.find((item) => item.position === position);
    if (!slot || slot.status === 'printed') return;
    const nextStatus = slot.status === 'unavailable' ? 'available' : 'unavailable';
    const nextSlots = slots.map((item) =>
      item.position === position
        ? { position, status: nextStatus as 'available' | 'unavailable' }
        : item,
    );
    setIsSaving(true);
    try {
      await updateSheetSlots(nextSlots);
      if (nextStatus === 'unavailable') {
        setDrafts((current) => ({ ...current, [position]: { certificateNumber: '' } }));
        setSelectedPositions((current) => {
          const next = new Set(current);
          next.delete(position);
          return next;
        });
      }
    } catch (error: any) {
      alert(error?.message || 'Não foi possível atualizar a posição.');
    } finally {
      setIsSaving(false);
    }
  };

  const setCertificate = (position: number, value: string) => {
    setDrafts((current) => ({ ...current, [position]: { certificateNumber: value.toUpperCase() } }));
    setPendingPrintedPositions([]);
  };

  const toggleSelectedPosition = (position: number) => {
    setSelectedPositions((current) => {
      const next = new Set(current);
      if (next.has(position)) next.delete(position);
      else next.add(position);
      return next;
    });
  };

  const applyBatch = () => {
    const positions = Array.from(selectedPositions).sort((a, b) => a - b);
    const certificates = batchText
      .split(/[\n;,]+/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (!positions.length) {
      alert('Selecione primeiro as posições disponíveis que receberão as etiquetas.');
      return;
    }
    if (certificates.length !== positions.length) {
      alert(`Foram selecionadas ${positions.length} posições, mas informados ${certificates.length} certificados.`);
      return;
    }
    setDrafts((current) => {
      const next = { ...current };
      positions.forEach((position, index) => {
        next[position] = { certificateNumber: certificates[index].toUpperCase() };
      });
      return next;
    });
    setBatchOpen(false);
    setBatchText('');
  };

  const validData = readyPositions
    .map((position) => resolvedByPosition.get(position)?.data)
    .filter((item): item is BoxLabelPdfData => Boolean(item));

  const assertReadyForPdf = () => {
    if (!activeSheet) {
      alert('Crie ou selecione uma folha A4363.');
      return false;
    }
    const incomplete = slots.filter((slot) => {
      if (slot.status !== 'available') return false;
      const draft = drafts[slot.position]?.certificateNumber.trim();
      if (!draft) return false;
      return resolvedByPosition.get(slot.position)?.state !== 'valid';
    });
    if (incomplete.length) {
      alert(`Corrija as etiquetas com erro ou dados incompletos nas posições: ${incomplete.map((slot) => String(slot.position).padStart(2, '0')).join(', ')}.`);
      return false;
    }
    if (!validData.length) {
      alert('Digite ao menos um número de certificado válido em uma posição disponível.');
      return false;
    }
    const duplicates = validData
      .map((item) => normalizeCertificate(item.certificateNumber))
      .filter((value, index, list) => list.indexOf(value) !== index);
    if (duplicates.length) {
      alert('O mesmo certificado não pode ser impresso duas vezes na mesma operação.');
      return false;
    }
    return true;
  };

  const handleGeneratePdf = async () => {
    if (!assertReadyForPdf() || !activeSheet) return;
    setIsSaving(true);
    try {
      const blob = await buildA4363LabelsPdf({ labels: validData, calibration });
      downloadPdfBlob(blob, downloadName(activeSheet));
      setPendingPrintedPositions(validData.map((item) => item.position));
    } catch (error: any) {
      alert(error?.message || 'Não foi possível gerar o PDF A4363.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmPrinted = async () => {
    if (!activeSheet || !pendingPrintedPositions.length || !canEdit) return;
    const now = new Date().toISOString();
    const printMap = new Map<number, BoxLabelPdfData>();
    validData.forEach((item) => printMap.set(item.position, item));
    const nextSlots = slots.map((slot) => {
      if (!pendingPrintedPositions.includes(slot.position)) return slot;
      const data = printMap.get(slot.position);
      return {
        position: slot.position,
        status: 'printed' as const,
        certificateNumber: data?.certificateNumber || drafts[slot.position]?.certificateNumber || '',
        instrumentId: resolvedByPosition.get(slot.position)?.instrument?.id || '',
        clientName: data?.clientName || '',
        printedAt: now,
        printedBy: actor.name,
        printedById: actor.id,
      };
    });
    setIsSaving(true);
    try {
      await updateSheetSlots(nextSlots);
      setDrafts((current) => {
        const next = { ...current };
        pendingPrintedPositions.forEach((position) => {
          next[position] = { certificateNumber: '' };
        });
        return next;
      });
      setSelectedPositions(new Set());
      setPendingPrintedPositions([]);
    } catch (error: any) {
      alert(error?.message || 'Não foi possível confirmar a utilização das etiquetas.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveCalibration = (next: A4363PrintCalibration) => {
    const normalized = normalizeA4363Calibration(next);
    setCalibration(normalized);
    localStorage.setItem('comanins_a4363_print_calibration', JSON.stringify(normalized));
  };

  const generateTest = () => {
    const blob = buildA4363TestPdf(calibration);
    downloadPdfBlob(blob, 'COMANINS_A4363_FOLHA_TESTE.pdf');
  };

  const openSheets = sheets.filter((sheet) => sheet.status === 'open');

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 mb-1">
            <LayoutGrid className="w-4 h-4" /> Recepção
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold text-slate-900">Etiqueta Caixa</h1>
          <p className="text-sm text-slate-600 mt-2 max-w-3xl">
            Pimaco A4363 • 14 etiquetas por folha • 2 colunas × 7 linhas • 99,0 × 38,1 mm.
            Digite o certificado diretamente na posição física que ainda existe na folha.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50"
          >
            <Settings2 className="w-4 h-4" /> Ajustar impressão
          </button>
          <button
            type="button"
            onClick={handleNewSheet}
            disabled={!canEdit || isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white font-bold hover:bg-blue-800 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Nova folha
          </button>
        </div>
      </div>

      {sheetAccessError && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="font-bold">Acesso à Etiqueta Caixa precisa de atenção</div>
          <div className="mt-1">{sheetAccessError}</div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm">
        <div className="grid md:grid-cols-[minmax(0,1fr)_auto] gap-4 items-end">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">Folha A4363 atual</label>
            <select
              value={activeSheetId}
              onChange={(event) => setActiveSheetId(event.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white text-slate-900"
            >
              <option value="">{loadingSheets ? 'Carregando folhas...' : 'Selecione uma folha parcial ou crie uma nova'}</option>
              {openSheets.map((sheet) => (
                <option key={sheet.id} value={sheet.id}>
                  {sheet.displayCode} • {sheet.slots.filter((slot) => slot.status === 'available').length} disponíveis
                </option>
              ))}
            </select>
          </div>
          {activeSheet && (
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700">Impressas: {printedCount}</span>
              <span className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700">Disponíveis: {availableCount}</span>
              <span className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700">Prontas agora: {readyPositions.length}</span>
            </div>
          )}
        </div>
      </div>

      {!activeSheet ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <FileText className="w-10 h-10 text-slate-400 mx-auto" />
          <h2 className="font-bold text-slate-800 mt-3">Nenhuma folha selecionada</h2>
          <p className="text-sm text-slate-500 mt-1">Crie uma nova folha ou continue uma folha parcial já cadastrada.</p>
        </div>
      ) : (
        <>
          <div className="bg-slate-100/70 border border-slate-200 rounded-2xl p-3 md:p-5 overflow-x-auto">
            <div className="mx-auto min-w-[680px] max-w-[980px] bg-white shadow-sm border border-slate-300 p-4 md:p-6" style={{ aspectRatio: '210 / 297' }}>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0 h-full content-center">
                {slots.map((slot) => {
                  const resolved = resolvedByPosition.get(slot.position) || { state: 'empty' as const };
                  const isAvailable = slot.status === 'available';
                  const selected = selectedPositions.has(slot.position);
                  return (
                    <div
                      key={slot.position}
                      className={`relative border rounded-sm p-2.5 transition-colors min-h-[88px] flex flex-col justify-between ${slotClass(slot, resolved)}`}
                      style={{ aspectRatio: '99 / 38.1' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold text-slate-500">{String(slot.position).padStart(2, '0')}</span>
                          {isAvailable && (
                            <label className="inline-flex items-center gap-1 text-[9px] text-slate-500 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleSelectedPosition(slot.position)}
                                disabled={!canEdit}
                              />
                              lote
                            </label>
                          )}
                        </div>
                        {slot.status === 'printed' ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500"><Lock className="w-3 h-3" /> usada</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleUnavailable(slot.position)}
                            disabled={!canEdit || isSaving}
                            className="text-[9px] font-bold text-slate-500 hover:text-slate-800 disabled:opacity-50"
                            title={slot.status === 'unavailable' ? 'Marcar como disponível' : 'Marcar como etiqueta já removida/indisponível'}
                          >
                            {slot.status === 'unavailable' ? 'Tornar disponível' : 'Marcar indisponível'}
                          </button>
                        )}
                      </div>

                      {slot.status === 'printed' ? (
                        <div className="text-center py-2">
                          <CheckCircle2 className="w-5 h-5 text-slate-400 mx-auto" />
                          <div className="text-[10px] font-bold text-slate-600 mt-1">{slot.certificateNumber || 'IMPRESSA'}</div>
                          {slot.printedAt && <div className="text-[8px] text-slate-400">{formatDate(slot.printedAt)}</div>}
                        </div>
                      ) : slot.status === 'unavailable' ? (
                        <div className="text-center py-2 text-[10px] text-slate-400 font-semibold">Posição sem etiqueta física</div>
                      ) : (
                        <div className="space-y-1.5">
                          <input
                            value={drafts[slot.position]?.certificateNumber || ''}
                            onChange={(event) => setCertificate(slot.position, event.target.value)}
                            placeholder="Nº certificado"
                            disabled={!canEdit}
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-200"
                          />
                          {resolved.state === 'valid' && resolved.data && (
                            <div className="grid grid-cols-[36px_1fr] gap-2 items-center">
                              <img src="/comanins-box-label-logo.png" alt="COMANINS" className="w-8 h-8 object-contain" />
                              <div className="min-w-0 leading-tight">
                                <div className="text-[9px] font-extrabold text-blue-900 truncate">CERT. Nº {resolved.data.certificateNumber}</div>
                                <div className="text-[8px] font-bold text-slate-800 truncate">{resolved.data.clientName}</div>
                                <div className="text-[8px] text-slate-600 truncate">{resolved.data.range} {resolved.data.unit}</div>
                                <div className="text-[8px] text-slate-600 truncate">Ø {resolved.data.diameter} • {resolved.data.connection}</div>
                                <div className="text-[8px] text-slate-600">CAL. {resolved.data.calibrationDate}</div>
                              </div>
                            </div>
                          )}
                          {resolved.state === 'not_found' && (
                            <div className="flex items-center gap-1 text-[9px] font-bold text-red-700"><XCircle className="w-3 h-3" /> Certificado não encontrado</div>
                          )}
                          {resolved.state === 'incomplete' && (
                            <div className="flex items-start gap-1 text-[9px] font-bold text-amber-700"><AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> Faltando: {resolved.missing?.join(', ')}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setBatchOpen((value) => !value)}
                disabled={!canEdit}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                Preenchimento em lote ({selectedPositions.size})
              </button>
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                disabled={!validData.length}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                Visualizar folha
              </button>
              <button
                type="button"
                onClick={handleGeneratePdf}
                disabled={!canEdit || isSaving || !validData.length}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white font-bold hover:bg-blue-800 disabled:opacity-50"
              >
                <Printer className="w-4 h-4" /> Gerar PDF A4363
              </button>
            </div>

            {batchOpen && (
              <div className="border border-blue-200 bg-blue-50 rounded-xl p-4">
                <div className="font-bold text-blue-900">Preenchimento em lote</div>
                <p className="text-xs text-blue-800 mt-1">
                  Marque as posições desejadas na folha e informe exatamente a mesma quantidade de certificados, um por linha. A associação seguirá a ordem crescente das posições.
                </p>
                <textarea
                  value={batchText}
                  onChange={(event) => setBatchText(event.target.value)}
                  rows={5}
                  placeholder={'260845\n260846\n260847'}
                  className="mt-3 w-full border border-blue-200 rounded-lg p-3 font-mono text-sm bg-white"
                />
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={applyBatch} className="px-3 py-2 bg-blue-700 text-white font-bold rounded-lg">Aplicar certificados</button>
                  <button type="button" onClick={() => setBatchOpen(false)} className="px-3 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg">Cancelar</button>
                </div>
              </div>
            )}

            {pendingPrintedPositions.length > 0 && (
              <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="font-bold text-emerald-900 flex items-center gap-2"><Check className="w-4 h-4" /> PDF gerado</div>
                  <p className="text-xs text-emerald-800 mt-1">
                    Depois de imprimir fisicamente a folha, confirme para bloquear as posições {pendingPrintedPositions.map((position) => String(position).padStart(2, '0')).join(', ')} como utilizadas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={confirmPrinted}
                  disabled={isSaving || !canEdit}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-800 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> Confirmar impressão
                </button>
              </div>
            )}

            <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>Na janela de impressão do PDF use <b>Tamanho real / 100%</b>. Não use “Ajustar”, “Encaixar” ou redimensionamento automático.</span>
            </div>
          </div>
        </>
      )}

      {previewOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/65 backdrop-blur-sm p-4 overflow-y-auto flex items-start justify-center">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-6 p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Pré-visualização da folha A4363</h2>
                <p className="text-xs text-slate-500 mt-1">Somente as posições com certificado válido receberão conteúdo no PDF.</p>
              </div>
              <button type="button" onClick={() => setPreviewOpen(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-slate-100 p-4 overflow-x-auto">
              <div className="bg-white border border-slate-300 min-w-[620px] mx-auto p-5 grid grid-cols-2 gap-x-2 gap-y-0" style={{ aspectRatio: '210 / 297' }}>
                {Array.from({ length: A4363.labelsPerSheet }, (_, index) => index + 1).map((position) => {
                  const data = resolvedByPosition.get(position)?.state === 'valid' ? resolvedByPosition.get(position)?.data : undefined;
                  return (
                    <div key={position} className="border border-dashed border-slate-200 p-2 flex items-center" style={{ aspectRatio: '99 / 38.1' }}>
                      {data ? (
                        <div className="grid grid-cols-[44px_1fr] gap-2 w-full items-center">
                          <img src="/comanins-box-label-logo.png" alt="COMANINS" className="w-10 h-10 object-contain" />
                          <div className="text-[9px] leading-tight min-w-0">
                            <div className="font-extrabold text-blue-900 truncate">CERT. Nº {data.certificateNumber}</div>
                            <div className="font-bold truncate">{data.clientName}</div>
                            <div className="truncate">RANGE: {data.range} {data.unit}</div>
                            <div className="truncate">Ø {data.diameter} • CONEX. {data.connection}</div>
                            <div>CAL. {data.calibrationDate}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-300">{String(position).padStart(2, '0')}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/65 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Configurar impressão A4363</h2>
                <p className="text-xs text-slate-500 mt-1">O ajuste é salvo apenas neste navegador, pois depende da impressora utilizada.</p>
              </div>
              <button type="button" onClick={() => setSettingsOpen(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <label className="text-sm font-semibold text-slate-700">
                Ajuste horizontal (mm)
                <input
                  type="number"
                  min="-10"
                  max="10"
                  step="0.1"
                  value={calibration.offsetXmm}
                  onChange={(event) => saveCalibration({ ...calibration, offsetXmm: Number(event.target.value) })}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Ajuste vertical (mm)
                <input
                  type="number"
                  min="-10"
                  max="10"
                  step="0.1"
                  value={calibration.offsetYmm}
                  onChange={(event) => saveCalibration({ ...calibration, offsetYmm: Number(event.target.value) })}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </label>
            </div>
            <div className="mt-4 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
              Geometria nominal: margem esquerda 4,7 mm; margem superior 15,15 mm; etiqueta 99,0 × 38,1 mm; intervalo entre colunas 2,6 mm.
            </div>
            <div className="flex flex-wrap gap-2 mt-5">
              <button type="button" onClick={generateTest} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-700 text-white font-bold rounded-lg"><Printer className="w-4 h-4" /> Folha de teste</button>
              <button type="button" onClick={() => saveCalibration({ offsetXmm: 0, offsetYmm: 0 })} className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 bg-white text-slate-700 font-semibold rounded-lg"><RotateCcw className="w-4 h-4" /> Zerar ajustes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
