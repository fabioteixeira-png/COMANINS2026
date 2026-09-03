import { jsPDF } from 'jspdf';
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { renderToStaticMarkup } from 'react-dom/server';

export interface FieldServiceCertificatePdfInput {
  fileName: string;
  certificateNumber: string;
  authKey: string;
  logoSrc?: string;
  company?: { endereco?: string; telefone?: string; email?: string } | null;
  client?: any;
  clientAddress?: string;
  instrument: any;
  fieldServiceTag?: string;
  fieldServiceEquip?: string;
  report?: any;
  referenceStandards?: any[];
}

const A4 = { width: 210, height: 297 } as const;
const MARGIN = 10;
const CONTENT_WIDTH = A4.width - MARGIN * 2;

const safeText = (value: unknown, fallback = '—') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const formatDate = (value: unknown, fallback = 'Não informada') => {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return raw;
};

const sourceToDataUrl = async (source?: string, timeoutMs = 5000): Promise<string | null> => {
  if (!source) return null;
  if (/^data:image\//i.test(source)) return source;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(source, { cache: 'force-cache', signal: controller.signal });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Falha ao converter imagem para PDF.'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
};

const imageSourceToPng = async (source?: string): Promise<string | null> => {
  const dataUrl = await sourceToDataUrl(source);
  if (!dataUrl) return null;
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = dataUrl;
    await image.decode();
    const maxDimension = 1200;
    const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round((image.naturalWidth || 1) * ratio));
    canvas.height = Math.max(1, Math.round((image.naturalHeight || 1) * ratio));
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
};

const qrCodeToPng = async (value: string): Promise<string | null> => {
  try {
    const markup = renderToStaticMarkup(
      React.createElement(QRCodeSVG, { value, size: 180, level: 'M', marginSize: 1 }),
    );
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
    const image = new Image();
    image.decoding = 'async';
    image.src = svgUrl;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 180;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 180, 180);
    context.drawImage(image, 0, 0, 180, 180);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
};

const getReferenceRows = (report: any, referenceStandards: any[] = []) => {
  const standards = Array.isArray(report?.referenceStandards) && report.referenceStandards.length
    ? report.referenceStandards
    : referenceStandards.slice(0, 3);
  return standards.map((std: any, index: number) =>
    `Padrão ${String.fromCharCode(65 + index)}: ${std?.identification ? `[${std.identification}] ` : ''}` +
    `Certificado Nº ${safeText(std?.certificateNumber)} - Tipo: ${safeText(std?.instrumentType)} - ` +
    `Faixa: ${safeText(std?.range)} - Validade: ${formatDate(std?.expirationDate, '—')} - Lab RBC: ${safeText(std?.rbcLab)}`,
  );
};

const buildPointRows = (instrument: any, report: any) => {
  const points = Array.isArray(report?.points) && report.points.length
    ? report.points
    : Array.isArray(instrument?.calibrationPoints)
      ? instrument.calibrationPoints
      : [];

  let maxHysteresis = 0;
  let maxRepeatability = 0;
  let maxAbsError = 0;
  const span = Math.abs(Number(instrument?.rangeMax || 0) - Number(instrument?.rangeMin || 0)) || 1;
  const mpeVal = report?.mpe !== undefined && report?.mpe !== null && report?.mpe !== ''
    ? Number(report.mpe)
    : Number(instrument?.mpe || 0);

  const rows = points.map((point: any) => {
    const values = [point?.refAsc1, point?.refDesc1, point?.refAsc2, point?.refDesc2].map((value) => {
      if (value === '' || value === undefined || value === null) return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    });
    const [a1, d1, a2, d2] = values;
    const valid = values.filter((value): value is number => value !== null);
    const avg = valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
    const nominal = Number(point?.nominal || 0);
    let absErr = valid.length ? Math.abs(nominal - avg) : 0;
    let normalizedAbsErr = absErr;
    if (instrument?.typeSpec === 'manovacuometro' && nominal < 0) {
      const minVal = Number(instrument?.rangeMin || 0);
      if (minVal <= -700) normalizedAbsErr = absErr / 760;
      else if (minVal <= -25) normalizedAbsErr = absErr / 29.92;
    }
    maxAbsError = Math.max(maxAbsError, normalizedAbsErr);

    const normalizeVacuum = (value: number) => {
      if (instrument?.typeSpec !== 'manovacuometro' || nominal >= 0) return value;
      const minVal = Number(instrument?.rangeMin || 0);
      if (minVal <= -700) return value / 760;
      if (minVal <= -25) return value / 29.92;
      return value;
    };

    let localHyst = 0;
    if (a1 !== null && d1 !== null) {
      const value = Math.abs(d1 - a1);
      localHyst = Math.max(localHyst, value);
      maxHysteresis = Math.max(maxHysteresis, normalizeVacuum(value));
    }
    if (a2 !== null && d2 !== null) {
      const value = Math.abs(d2 - a2);
      localHyst = Math.max(localHyst, value);
      maxHysteresis = Math.max(maxHysteresis, normalizeVacuum(value));
    }
    if (a1 !== null && a2 !== null) maxRepeatability = Math.max(maxRepeatability, normalizeVacuum(Math.abs(a2 - a1)));
    if (d1 !== null && d2 !== null) maxRepeatability = Math.max(maxRepeatability, normalizeVacuum(Math.abs(d2 - d1)));

    const error = valid.length ? Number((nominal - avg).toFixed(2)) : null;
    const unit = (instrument?.typeSpec === 'manovacuometro' || String(instrument?.description || '').toLowerCase().includes('manovacu')) && nominal < 0
      ? safeText(instrument?.unitNegative, 'mmHg')
      : safeText(instrument?.unit);

    return {
      nominal: safeText(point?.nominal),
      a1: a1 === null ? '-' : safeText(point?.refAsc1),
      d1: d1 === null ? '-' : safeText(point?.refDesc1),
      a2: a2 === null ? '-' : safeText(point?.refAsc2),
      d2: d2 === null ? '-' : safeText(point?.refDesc2),
      avg: valid.length ? avg.toFixed(2) : '-',
      error: error === null ? '-' : error > 0 ? `+${error}` : String(error),
      unit,
      localHyst,
      mpeVal,
    };
  });

  return {
    rows,
    classPct: span > 0 ? (maxAbsError / span) * 100 : 0,
    hysteresisPct: span > 0 ? (maxHysteresis / span) * 100 : 0,
    repeatabilityPct: span > 0 ? (maxRepeatability / span) * 100 : 0,
  };
};

export const downloadFieldServiceCertificatePdf = async (input: FieldServiceCertificatePdfInput) => {
  const { instrument, report, client } = input;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({
    title: input.fileName.replace(/\.pdf$/i, ''),
    subject: 'Certificado de calibração COMANINS',
    creator: 'Sistema COMANINS',
  });

  const [logoData, technicianSignature, rtSignature, qrData] = await Promise.all([
    imageSourceToPng(input.logoSrc || '/COMANINS%202026_logo_horizontal_transparente.png'),
    imageSourceToPng(report?.signaturePath),
    imageSourceToPng('/assinatura_rt.png'),
    qrCodeToPng(`https://www.comanins.com.br?chave=${input.authKey}`),
  ]);

  let y = 8;
  const pageBottom = 287;

  const addPage = () => {
    doc.addPage('a4', 'portrait');
    y = 10;
  };

  const ensureSpace = (height: number) => {
    if (y + height > pageBottom) addPage();
  };

  const sectionTitle = (text: string) => {
    ensureSpace(8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(text.toUpperCase(), MARGIN, y);
    y += 4.5;
  };

  const lineText = (label: string, value: unknown, indent = 3) => {
    const full = `${label}: ${safeText(value)}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(full, CONTENT_WIDTH - indent);
    ensureSpace(lines.length * 3.3 + 1);
    doc.text(lines, MARGIN + indent, y);
    y += lines.length * 3.3 + 0.6;
  };

  const paragraph = (text: string, indent = 3) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    const lines = doc.splitTextToSize(safeText(text), CONTENT_WIDTH - indent);
    ensureSpace(lines.length * 3.2 + 1);
    doc.text(lines, MARGIN + indent, y);
    y += lines.length * 3.2 + 0.8;
  };

  // Cabeçalho
  if (logoData) {
    try { doc.addImage(logoData, 'PNG', MARGIN, y, 38, 16, undefined, 'FAST'); } catch { /* fallback textual */ }
  }
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.text('Laboratório de Calibração Rastreada de acordo com a ABNT NBR ISO/IEC 17025', A4.width / 2, y + 4, { align: 'center', maxWidth: 110 });
  doc.setFontSize(12);
  doc.text(`CERTIFICADO DE CALIBRAÇÃO Nº ${safeText(input.certificateNumber)}`, A4.width / 2, y + 11, { align: 'center' });
  doc.setFontSize(6.5);
  doc.text(`Chave de Autenticidade (QRCode): ${safeText(input.authKey)}`, A4.width / 2, y + 16, { align: 'center' });
  if (qrData) {
    try { doc.addImage(qrData, 'PNG', A4.width - MARGIN - 18, y, 18, 18, undefined, 'FAST'); } catch { /* key text remains */ }
  }
  y += 20;
  doc.setDrawColor(148, 163, 184);
  doc.line(MARGIN, y, A4.width - MARGIN, y);
  y += 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${safeText(input.company?.endereco, 'Rua A3, N° 09, Poloplast, Camaçari-BA - CEP: 42801-581')} - Fone: ${safeText(input.company?.telefone, '(71) 3621-0311')} - ${safeText(input.company?.email, 'comercial@comanins.com.br')}`,
    A4.width / 2,
    y,
    { align: 'center', maxWidth: CONTENT_WIDTH },
  );
  y += 5;

  sectionTitle('1. Cliente');
  lineText('Nome', client?.name || client?.razaoSocial || 'Cliente Padrão');
  lineText('Endereço', input.clientAddress || 'Não informado');
  lineText('Contato', `${safeText(client?.phone, 'Não informado')} / ${safeText(client?.email, 'Não informado')}`);
  y += 1;

  sectionTitle('2. Instrumento Calibrado');
  const vacuum = instrument?.typeSpec === 'manovacuometro' || String(instrument?.description || '').toLowerCase().includes('manovacu');
  lineText('Descrição', instrument?.description);
  lineText('TAG do Cliente', input.fieldServiceTag || instrument?.tag);
  if (input.fieldServiceEquip) lineText('Equipamento', input.fieldServiceEquip);
  lineText('Marca / Modelo', `${safeText(instrument?.brand, 'Não Consta')} / ${safeText(instrument?.model, 'Não Consta')}`);
  lineText('Nº Série', safeText(instrument?.serialNumber, 'NÃO CONSTA'));
  lineText('Faixa', `${safeText(instrument?.rangeMin)} ${vacuum ? safeText(instrument?.unitNegative, 'mmHg') : ''} a ${safeText(instrument?.rangeMax)} ${safeText(instrument?.unit)}`.replace(/\s+/g, ' '));
  lineText('Tolerância (MPE)', `±${safeText(instrument?.mpe)} ${safeText(instrument?.unit)}`);
  y += 1;

  sectionTitle('3. Identificação da Calibração');
  lineText('Data de recebimento', formatDate(instrument?.dataEntrada || instrument?.dateOfIntake || instrument?.dataDaEntrada));
  lineText('Data de calibração', formatDate(instrument?.calibrationDate || instrument?.lastCalibrationDate || instrument?.date, new Date().toLocaleDateString('pt-BR')));
  lineText('Data de emissão', new Date().toLocaleDateString('pt-BR'));
  lineText('Local de calibração', 'Instalação Permanente do Laboratório Comanins');
  y += 1;

  sectionTitle('4. Condições Ambientais');
  lineText('Temperatura Ambiente', `${safeText(report?.temperature ?? instrument?.temperature, '20')}ºC (± 5ºC)`);
  lineText('Umidade Relativa do Ar', `${safeText(report?.humidity ?? instrument?.humidity, '50')}% (± 20%)`);
  y += 1;

  sectionTitle('5. Resumo do Método de Calibração');
  lineText('Método de Calibração', 'conforme procedimento PR-001-2017 Rev. 4');
  paragraph('A Calibração foi realizada conforme procedimento PR-001-2017 Rev. 4 comparando-se o instrumento com o padrão listado no item 7. A série de medições está definida na tabela de valores encontrados.');
  y += 1;

  sectionTitle('6. Comentários');
  paragraph(instrument?.calibrationObs || 'A reprodução deste documento somente poderá ser feita integralmente. Os resultados apresentados referem-se exclusivamente ao equipamento em questão.');
  y += 1;

  sectionTitle('7. Equipamentos Auxiliares e Padrões');
  const standards = getReferenceRows(report, input.referenceStandards || []);
  if (standards.length) standards.forEach((row) => paragraph(row));
  else paragraph('Nenhum padrão de referência específico registrado nesta calibração.');
  y += 1;

  sectionTitle('8. Valores Encontrados');
  const pointData = buildPointRows(instrument, report);
  const widths = [18, 22, 22, 22, 22, 24, 20, 24];
  const headers = ['VI', 'Cresc. 1', 'Decresc. 1', 'Cresc. 2', 'Decresc. 2', 'Média', 'Erro', 'Unidade'];
  const rowHeight = 5;
  const tableWidth = widths.reduce((sum, width) => sum + width, 0);
  const startX = MARGIN + (CONTENT_WIDTH - tableWidth) / 2;

  const drawHeader = () => {
    ensureSpace(rowHeight * 2);
    let x = startX;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(148, 163, 184);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.1);
    headers.forEach((header, index) => {
      doc.rect(x, y, widths[index], rowHeight, 'FD');
      doc.text(header, x + widths[index] / 2, y + 3.2, { align: 'center', maxWidth: widths[index] - 1 });
      x += widths[index];
    });
    y += rowHeight;
  };

  drawHeader();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  for (const row of pointData.rows) {
    if (y + rowHeight > pageBottom - 32) {
      addPage();
      sectionTitle('8. Valores Encontrados — continuação');
      drawHeader();
    }
    const cells = [row.nominal, row.a1, row.d1, row.a2, row.d2, row.avg, row.error, row.unit];
    let x = startX;
    cells.forEach((cell, index) => {
      doc.rect(x, y, widths[index], rowHeight);
      doc.text(String(cell), x + widths[index] / 2, y + 3.2, { align: 'center', maxWidth: widths[index] - 1 });
      x += widths[index];
    });
    y += rowHeight;
  }

  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text(`Índice de Classe (%): ${pointData.classPct.toFixed(2)}`, MARGIN + 3, y); y += 3.2;
  doc.text(`Repetitividade (%): ${pointData.repeatabilityPct.toFixed(3)}`, MARGIN + 3, y); y += 3.2;
  doc.text(`Histerese (%): ${pointData.hysteresisPct.toFixed(2)}`, MARGIN + 3, y); y += 5;

  ensureSpace(34);
  const sigY = y;
  const leftCenter = 58;
  const rightCenter = 152;
  if (technicianSignature) {
    try { doc.addImage(technicianSignature, 'PNG', leftCenter - 20, sigY, 40, 14, undefined, 'FAST'); } catch { /* name remains */ }
  }
  if (rtSignature) {
    try { doc.addImage(rtSignature, 'PNG', rightCenter - 20, sigY, 40, 14, undefined, 'FAST'); } catch { /* name remains */ }
  }
  doc.setDrawColor(100, 116, 139);
  doc.line(25, sigY + 16, 91, sigY + 16);
  doc.line(119, sigY + 16, 185, sigY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(safeText(report?.technicianName, 'Técnico Executante'), leftCenter, sigY + 20, { align: 'center' });
  doc.text('Fabio Henrique de Sena Teixeira', rightCenter, sigY + 20, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text('Técnico de Laboratório', leftCenter, sigY + 23, { align: 'center' });
  doc.text('Responsável Técnico', rightCenter, sigY + 23, { align: 'center' });
  doc.text('CFT-80333478568/BA', rightCenter, sigY + 26, { align: 'center' });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text('Este documento foi produzido e assinado eletronicamente no Portal COMANINS.', A4.width / 2, 292, { align: 'center' });
    doc.text(`Pág. ${page}/${pages}`, A4.width - MARGIN, 292, { align: 'right' });
  }

  doc.save(input.fileName);
};
