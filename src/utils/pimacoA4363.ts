import { jsPDF } from 'jspdf';

export const A4363 = {
  pageWidthMm: 210,
  pageHeightMm: 297,
  columns: 2,
  rows: 7,
  labelsPerSheet: 14,
  labelWidthMm: 99,
  labelHeightMm: 38.1,
  marginLeftMm: 4.7,
  marginTopMm: 15.15,
  columnGapMm: 2.6,
  rowGapMm: 0,
} as const;

export interface A4363PrintCalibration {
  offsetXmm: number;
  offsetYmm: number;
}

export interface BoxLabelPdfData {
  position: number;
  certificateNumber: string;
  clientName: string;
  range: string;
  unit: string;
  diameter: string;
  connection: string;
  calibrationDate: string;
}

const clampOffset = (value: number) => Math.max(-10, Math.min(10, Number.isFinite(value) ? value : 0));

export const normalizeA4363Calibration = (
  value?: Partial<A4363PrintCalibration> | null,
): A4363PrintCalibration => ({
  offsetXmm: clampOffset(Number(value?.offsetXmm || 0)),
  offsetYmm: clampOffset(Number(value?.offsetYmm || 0)),
});

export const a4363PositionMm = (
  position: number,
  calibration?: Partial<A4363PrintCalibration> | null,
) => {
  const safePosition = Math.max(1, Math.min(A4363.labelsPerSheet, Math.trunc(position)));
  const index = safePosition - 1;
  const row = Math.floor(index / A4363.columns);
  const column = index % A4363.columns;
  const normalized = normalizeA4363Calibration(calibration);
  return {
    x: A4363.marginLeftMm + column * (A4363.labelWidthMm + A4363.columnGapMm) + normalized.offsetXmm,
    y: A4363.marginTopMm + row * (A4363.labelHeightMm + A4363.rowGapMm) + normalized.offsetYmm,
  };
};

export const validateA4363Geometry = () => {
  const rightEdge =
    A4363.marginLeftMm +
    A4363.columns * A4363.labelWidthMm +
    (A4363.columns - 1) * A4363.columnGapMm;
  const bottomEdge =
    A4363.marginTopMm +
    A4363.rows * A4363.labelHeightMm +
    (A4363.rows - 1) * A4363.rowGapMm;
  return {
    rightEdge,
    bottomEdge,
    rightMargin: A4363.pageWidthMm - rightEdge,
    bottomMargin: A4363.pageHeightMm - bottomEdge,
    valid:
      rightEdge <= A4363.pageWidthMm + 0.01 &&
      bottomEdge <= A4363.pageHeightMm + 0.01,
  };
};

const toDataUrl = async (source: string): Promise<string> => {
  const response = await fetch(source, { cache: 'force-cache' });
  if (!response.ok) throw new Error('Não foi possível carregar a logomarca da etiqueta.');
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Não foi possível converter a logomarca para impressão.'));
    reader.readAsDataURL(blob);
  });
};

const fitText = (
  doc: jsPDF,
  value: string,
  maxWidthMm: number,
  preferredPt: number,
  minPt: number,
): number => {
  const text = String(value || '-');
  for (let size = preferredPt; size >= minPt; size -= 0.25) {
    doc.setFontSize(size);
    if (doc.getTextWidth(text) <= maxWidthMm) return size;
  }
  return minPt;
};

const printLabel = (
  doc: jsPDF,
  data: BoxLabelPdfData,
  logoDataUrl: string,
  calibration: A4363PrintCalibration,
) => {
  const { x, y } = a4363PositionMm(data.position, calibration);
  const leftPadding = 2.4;
  const logoBoxWidth = 24;
  const logoBoxHeight = 28;
  const textX = x + leftPadding + logoBoxWidth + 2.3;
  const textMaxWidth = A4363.labelWidthMm - (textX - x) - 2.6;

  // A logo pode ser quadrada, vertical ou horizontal. Calculamos o contain
  // dentro da área reservada para preservar a proporção sem distorção.
  const logoFormat = /^data:image\/jpe?g/i.test(logoDataUrl) ? 'JPEG' : 'PNG';
  const imageProperties = doc.getImageProperties(logoDataUrl);
  const naturalWidth = Number(imageProperties.width || 1);
  const naturalHeight = Number(imageProperties.height || 1);
  const scale = Math.min(logoBoxWidth / naturalWidth, logoBoxHeight / naturalHeight);
  const renderedWidth = naturalWidth * scale;
  const renderedHeight = naturalHeight * scale;
  const logoX = x + leftPadding + (logoBoxWidth - renderedWidth) / 2;
  const logoY = y + (A4363.labelHeightMm - renderedHeight) / 2;
  doc.addImage(logoDataUrl, logoFormat, logoX, logoY, renderedWidth, renderedHeight, undefined, 'FAST');

  doc.setTextColor(10, 38, 77);
  doc.setFont('helvetica', 'bold');
  const certificateText = `CERT. Nº ${data.certificateNumber}`;
  doc.setFontSize(fitText(doc, certificateText, textMaxWidth, 9.2, 6.8));
  doc.text(certificateText, textX, y + 6.6, { baseline: 'middle' });

  doc.setDrawColor(14, 68, 126);
  doc.setLineWidth(0.28);
  doc.line(textX, y + 9.1, x + A4363.labelWidthMm - 2.5, y + 9.1);

  const rows = [
    `CLIENTE: ${data.clientName}`,
    `RANGE: ${data.range} ${data.unit}`.replace(/\s+/g, ' ').trim(),
    `Ø: ${data.diameter}   CONEX.: ${data.connection}`,
    `CAL.: ${data.calibrationDate}`,
  ];
  const yRows = [14.2, 19.5, 24.8, 30.1];
  doc.setTextColor(17, 24, 39);
  rows.forEach((row, idx) => {
    doc.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
    doc.setFontSize(fitText(doc, row, textMaxWidth, idx === 0 ? 7.3 : 7, 5.4));
    doc.text(row, textX, y + yRows[idx], { baseline: 'middle' });
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.6);
  doc.setTextColor(90, 98, 108);
  doc.text('COMANINS • Identificação de caixa', textX, y + 35.0, { baseline: 'middle' });
};

export const buildA4363LabelsPdf = async ({
  labels,
  logoSrc = '/comanins-box-label-logo.png',
  calibration,
}: {
  labels: BoxLabelPdfData[];
  logoSrc?: string;
  calibration?: Partial<A4363PrintCalibration> | null;
}): Promise<Blob> => {
  const geometry = validateA4363Geometry();
  if (!geometry.valid) throw new Error('Geometria A4363 inválida. A impressão foi interrompida.');
  if (!labels.length) throw new Error('Nenhuma etiqueta válida foi selecionada para impressão.');

  const uniquePositions = new Set<number>();
  labels.forEach((label) => {
    if (label.position < 1 || label.position > A4363.labelsPerSheet) {
      throw new Error(`Posição inválida: ${label.position}.`);
    }
    if (uniquePositions.has(label.position)) {
      throw new Error(`A posição ${label.position} foi informada mais de uma vez.`);
    }
    uniquePositions.add(label.position);
  });

  const logoDataUrl = await toDataUrl(logoSrc);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const normalizedCalibration = normalizeA4363Calibration(calibration);
  labels.forEach((label) => printLabel(doc, label, logoDataUrl, normalizedCalibration));
  doc.setProperties({
    title: 'Etiquetas de Caixa COMANINS - Pimaco A4363',
    subject: 'Folha A4 com 14 posições - 99 x 38,1 mm',
    creator: 'Sistema COMANINS',
  });
  return doc.output('blob');
};

export const buildA4363TestPdf = (
  calibration?: Partial<A4363PrintCalibration> | null,
): Blob => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const normalized = normalizeA4363Calibration(calibration);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.15);

  for (let position = 1; position <= A4363.labelsPerSheet; position += 1) {
    const { x, y } = a4363PositionMm(position, normalized);
    doc.rect(x, y, A4363.labelWidthMm, A4363.labelHeightMm);
    doc.text(String(position).padStart(2, '0'), x + 2, y + 4.5);
    const mark = 3;
    doc.line(x, y, x + mark, y);
    doc.line(x, y, x, y + mark);
    doc.line(x + A4363.labelWidthMm, y, x + A4363.labelWidthMm - mark, y);
    doc.line(x + A4363.labelWidthMm, y, x + A4363.labelWidthMm, y + mark);
    doc.line(x, y + A4363.labelHeightMm, x + mark, y + A4363.labelHeightMm);
    doc.line(x, y + A4363.labelHeightMm, x, y + A4363.labelHeightMm - mark);
    doc.line(
      x + A4363.labelWidthMm,
      y + A4363.labelHeightMm,
      x + A4363.labelWidthMm - mark,
      y + A4363.labelHeightMm,
    );
    doc.line(
      x + A4363.labelWidthMm,
      y + A4363.labelHeightMm,
      x + A4363.labelWidthMm,
      y + A4363.labelHeightMm - mark,
    );
  }

  doc.setFontSize(8);
  doc.text('PIMACO A4363 • folha de teste • imprimir em Tamanho real / 100%', 105, 8, { align: 'center' });
  return doc.output('blob');
};

export const downloadPdfBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
