import React from 'react';
import {
  AlertTriangle,
  FileText,
  LayoutGrid,
  Plus,
  Printer,
  RotateCcw,
  Settings2,
  X,
  XCircle,
} from 'lucide-react';
import type { CalibrationReport, Client, Instrument } from '../types';
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

type LookupState = 'empty' | 'valid' | 'not_found' | 'incomplete' | 'searching';
type LocalSlotStatus = 'available' | 'unavailable';

interface SlotDraft {
  certificateNumber: string;
}

interface LocalSlot {
  position: number;
  status: LocalSlotStatus;
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

const EMPTY_SLOTS = (): LocalSlot[] =>
  Array.from({ length: A4363.labelsPerSheet }, (_, index) => ({
    position: index + 1,
    status: 'available' as const,
  }));

const normalizeCertificate = (value: unknown) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const certificateDigits = (value: unknown) => normalizeCertificate(value).replace(/\D/g, '');

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

const matchesCertificate = (candidate: unknown, normalized: string, digits: string) => {
  const normalizedCandidate = normalizeCertificate(candidate);
  if (!normalizedCandidate) return false;
  if (normalizedCandidate === normalized) return true;
  return Boolean(digits) && certificateDigits(normalizedCandidate) === digits;
};

const findInstrumentByCertificate = (instruments: Instrument[], reports: CalibrationReport[], certificate: string) => {
  const normalized = normalizeCertificate(certificate);
  const digits = certificateDigits(normalized);
  if (!normalized) return undefined;

  let instrument = instruments.find(
    (item) =>
      item.isDeleted !== true &&
      [item.certificateNumber, item.coma].some((candidate) => matchesCertificate(candidate, normalized, digits)),
  );

  if (instrument) return instrument;

  const report = reports.find(
    (item) => item.isDeleted !== true && matchesCertificate(item.certNumber, normalized, digits),
  );

  if (!report) return undefined;
  return instruments.find((item) => item.id === report.instrumentId && item.isDeleted !== true);
};

const getLatestMatchingReport = (
  reports: CalibrationReport[],
  instrument: Instrument,
  certificate: string,
): CalibrationReport | undefined => {
  const certKey = normalizeCertificate(certificate);
  const certDigits = certificateDigits(certKey);
  const sameInstrument = reports.filter(
    (report) => report.isDeleted !== true && report.instrumentId === instrument.id,
  );
  const exact = sameInstrument.filter((report) => matchesCertificate(report.certNumber, certKey, certDigits));
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

  if (!instruments.length && !reports.length) {
    return { state: 'searching' };
  }

  const instrument = findInstrumentByCertificate(instruments, reports, certificate);
  if (!instrument) return { state: 'not_found' };

  const client = clients.find((item) => item.id === instrument?.clientId);
  const matchingReport = getLatestMatchingReport(reports, instrument, certificate);
  const rangeData = formatRange(instrument);
  const calibrationDate = formatDate(matchingReport?.date || instrument.lastCalibrationDate);
  const clientName = String(client?.name || '').trim();
  const diameter = field(instrument, 'diametro');
  const connection = field(instrument, 'conexao');
  const requestedCertificate = String(certificate || '').trim().toUpperCase();
  const matchingReportCertificate = String(matchingReport?.certNumber || '').trim();
  const certificateNumber =
    matchingReportCertificate && matchesCertificate(matchingReportCertificate, normalized, certificateDigits(normalized))
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

const slotClass = (slot: LocalSlot, resolved: ResolvedLabel) => {
  if (slot.status === 'unavailable') return 'border-dashed border-slate-300 bg-slate-50';
  if (resolved.state === 'valid') return 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-100';
  if (resolved.state === 'not_found') return 'border-red-400 bg-red-50';
  if (resolved.state === 'incomplete') return 'border-amber-400 bg-amber-50';
  if (resolved.state === 'searching') return 'border-sky-300 bg-sky-50';
  return 'border-slate-300 bg-white hover:border-slate-400';
};

const TEMP_SHEET_FILE_NAME = 'COMANINS_A4363_TEMPORARIA.pdf';

export default function BoxLabelSheet({
  clients,
  instruments,
  reports,
  currentUser,
  canEdit,
}: BoxLabelSheetProps) {
  const [sheetKey, setSheetKey] = React.useState(() => Date.now());
  const [slots, setSlots] = React.useState<LocalSlot[]>(() => EMPTY_SLOTS());
  const [drafts, setDrafts] = React.useState<Record<number, SlotDraft>>(EMPTY_DRAFTS);
  const [selectedPositions, setSelectedPositions] = React.useState<Set<number>>(new Set());
  const [batchOpen, setBatchOpen] = React.useState(false);
  const [batchText, setBatchText] = React.useState('');
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [calibration, setCalibration] = React.useState<A4363PrintCalibration>(() => {
    try {
      return normalizeA4363Calibration(JSON.parse(localStorage.getItem('comanins_a4363_print_calibration') || '{}'));
    } catch {
      return normalizeA4363Calibration();
    }
  });

  const actorName = currentUser?.name || currentUser?.username || 'Usuário interno';

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
  const unavailableCount = slots.filter((slot) => slot.status === 'unavailable').length;

  const resetTemporarySheet = React.useCallback(() => {
    setSlots(EMPTY_SLOTS());
    setDrafts(EMPTY_DRAFTS());
    setSelectedPositions(new Set());
    setBatchText('');
    setBatchOpen(false);
    setPreviewOpen(false);
    setSheetKey(Date.now());
  }, []);

  const handleNewSheet = () => {
    if (!canEdit) return;
    const hasWork =
      slots.some((slot) => slot.status === 'unavailable') ||
      Object.values(drafts).some((draft) => String(draft?.certificateNumber || '').trim() !== '');
    if (hasWork && !window.confirm('Iniciar nova folha temporária? Os dados atuais da tela serão limpos.')) {
      return;
    }
    resetTemporarySheet();
  };

  const toggleUnavailable = (position: number) => {
    if (!canEdit || isSaving) return;
    setSlots((current) =>
      current.map((item) =>
        item.position === position
          ? { ...item, status: item.status === 'unavailable' ? 'available' : 'unavailable' }
          : item,
      ),
    );

    setDrafts((current) => ({
      ...current,
      [position]: { certificateNumber: '' },
    }));

    setSelectedPositions((current) => {
      const next = new Set(current);
      next.delete(position);
      return next;
    });
  };

  const setCertificate = (position: number, value: string) => {
    setDrafts((current) => ({ ...current, [position]: { certificateNumber: value.toUpperCase() } }));
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
    const allowedPositions = new Set(
      slots.filter((slot) => slot.status === 'available').map((slot) => slot.position),
    );
    const positions = Array.from(selectedPositions)
      .filter((position) => allowedPositions.has(position))
      .sort((a, b) => a - b);
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
    const searching = slots.filter((slot) => {
      if (slot.status !== 'available') return false;
      const draft = drafts[slot.position]?.certificateNumber.trim();
      if (!draft) return false;
      return resolvedByPosition.get(slot.position)?.state === 'searching';
    });
    if (searching.length) {
      alert(`Aguarde a conclusão da busca dos certificados nas posições: ${searching.map((slot) => String(slot.position).padStart(2, '0')).join(', ')}.`);
      return false;
    }

    const incomplete = slots.filter((slot) => {
      if (slot.status !== 'available') return false;
      const draft = drafts[slot.position]?.certificateNumber.trim();
      if (!draft) return false;
      return !['valid', 'empty'].includes(resolvedByPosition.get(slot.position)?.state || 'empty');
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
    if (!assertReadyForPdf()) return;
    setIsSaving(true);
    try {
      const blob = await buildA4363LabelsPdf({ labels: validData, calibration });
      downloadPdfBlob(blob, TEMP_SHEET_FILE_NAME);
    } catch (error: any) {
      alert(error?.message || 'Não foi possível gerar o PDF A4363.');
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

  const temporarySheetCode = `TEMP-${String(sheetKey).slice(-6)}`;

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

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <div className="font-bold">Modo simplificado ativado</div>
        <div className="mt-1">
          Esta tela funciona somente de forma temporária neste navegador. Não arquiva folhas nem grava histórico de etiquetas.
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm">
        <div className="grid md:grid-cols-[minmax(0,1fr)_auto] gap-4 items-end">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">Folha A4363 atual</label>
            <div className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-slate-50 text-slate-900 text-sm">
              {temporarySheetCode} • temporária • operador {actorName}
            </div>
          </div>
          <div className="text-xs text-slate-500">
            <div><b>{availableCount}</b> posições disponíveis</div>
            <div><b>{unavailableCount}</b> posições indisponíveis</div>
            <div><b>{validData.length}</b> prontas para impressão</div>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-900">Grade da folha</div>
              <div className="text-xs text-slate-500">Preencha as posições que receberão as etiquetas.</div>
            </div>
            <button
              type="button"
              onClick={resetTemporarySheet}
              disabled={!canEdit || isSaving}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" /> Limpar tela
            </button>
          </div>

          <div className="overflow-x-auto p-4 md:p-5">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-2 gap-4">
                {slots.map((slot) => {
                  const resolved = resolvedByPosition.get(slot.position) || { state: 'empty' as LookupState };
                  const selected = selectedPositions.has(slot.position);
                  const isAvailable = slot.status === 'available';
                  return (
                    <div
                      key={slot.position}
                      className={`border rounded-lg p-3 transition-all ${slotClass(slot, resolved)} ${selected ? 'ring-2 ring-blue-300' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-extrabold text-slate-700">{String(slot.position).padStart(2, '0')}</span>
                          {isAvailable && (
                            <label className="inline-flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
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
                        <button
                          type="button"
                          onClick={() => toggleUnavailable(slot.position)}
                          disabled={!canEdit || isSaving}
                          className="text-[10px] font-bold text-slate-500 hover:text-slate-800 disabled:opacity-50"
                          title={slot.status === 'unavailable' ? 'Tornar disponível' : 'Marcar como etiqueta já removida/indisponível'}
                        >
                          {slot.status === 'unavailable' ? 'Tornar disponível' : 'Marcar indisponível'}
                        </button>
                      </div>

                      {slot.status === 'unavailable' ? (
                        <div className="text-center py-5 text-[11px] text-slate-400 font-semibold">Posição sem etiqueta física</div>
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
                          {resolved.state === 'searching' && (
                            <div className="text-[9px] font-bold text-sky-700">Buscando certificado...</div>
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
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm space-y-4 h-fit xl:sticky xl:top-4">
          <div>
            <div className="text-sm font-bold text-slate-900">Ações</div>
            <p className="text-xs text-slate-500 mt-1">Visualize e gere o PDF somente com os certificados válidos da tela.</p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setBatchOpen((value) => !value)}
              disabled={!canEdit}
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50 text-left"
            >
              Preenchimento em lote ({selectedPositions.size})
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              disabled={!validData.length}
              className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50 text-left"
            >
              Visualizar folha
            </button>
            <button
              type="button"
              onClick={handleGeneratePdf}
              disabled={!canEdit || isSaving || !validData.length}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white font-bold hover:bg-blue-800 disabled:opacity-50"
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

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-700 flex items-center gap-2"><FileText className="w-4 h-4" /> Nome do arquivo gerado</div>
            <div>{TEMP_SHEET_FILE_NAME}</div>
          </div>

          <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>Na janela de impressão do PDF use <b>Tamanho real / 100%</b>. Não use “Ajustar”, “Encaixar” ou redimensionamento automático.</span>
          </div>
        </div>
      </div>

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
            <div className="bg-slate-100 p-4 overflow-auto max-h-[75vh]">
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
