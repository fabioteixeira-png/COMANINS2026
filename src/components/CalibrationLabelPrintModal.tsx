import React from "react";
import { AlertCircle, Printer, X } from "lucide-react";

export interface CalibrationLabelData {
  instrumentId?: string;
  certificateNumber: string;
  calibrationDate: string;
  isComaninsStandard?: boolean;
  clientTag?: string;
  validityDate?: string;
  periodicityMonths?: 3 | 6 | 12;
  isRegistrationLabel?: boolean;
  clientName?: string;
  instrumentRange?: string;
  entryNumber?: string;
}

export const DEFAULT_CALIBRATION_LABEL_LOGO =
  "/COMANINS%202026_logo_horizontal_transparente.png";

interface CalibrationLabelArtworkProps extends CalibrationLabelData {
  className?: string;
  printable?: boolean;
  calibrationLogo?: string;
}

interface CalibrationLabelPrintModalProps extends CalibrationLabelData {
  onClose: () => void;
  onPrinted?: () => void;
  calibrationLogo?: string;
}

export const formatCalibrationLabelDate = (value: string): string => {
  const normalized = String(value || "").trim();
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;

  const brMatch = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return normalized;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? normalized : parsed.toLocaleDateString("pt-BR");
};

const parseCalibrationDateParts = (
  value: string,
): { year: number; month: number; day: number } | null => {
  const normalized = String(value || "").trim();
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3]),
    };
  }

  const brMatch = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    return {
      year: Number(brMatch[3]),
      month: Number(brMatch[2]),
      day: Number(brMatch[1]),
    };
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth() + 1,
    day: parsed.getDate(),
  };
};

/**
 * Soma a periodicidade em meses sem deixar datas como 31/01 "estourarem"
 * para o mês seguinte. Ex.: 31/01 + 3 meses => 30/04.
 */
export const calculateCalibrationValidityDate = (
  calibrationDate: string,
  months: 3 | 6 | 12,
): string => {
  const parts = parseCalibrationDateParts(calibrationDate);
  if (!parts) return "";

  const monthIndex = parts.month - 1 + months;
  const targetYear = parts.year + Math.floor(monthIndex / 12);
  const targetMonthIndex = ((monthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonthIndex + 1, 0),
  ).getUTCDate();
  const targetDay = Math.min(parts.day, lastDayOfTargetMonth);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${targetYear}-${pad(targetMonthIndex + 1)}-${pad(targetDay)}`;
};

const certificateFontSize = (value: string): number => {
  const length = value.length;
  if (length > 16) return 22;
  if (length > 12) return 26;
  if (length > 10) return 30;
  if (length > 8) return 34;
  if (length > 6) return 38;
  return 44;
};

const standardCertificateFontSize = (value: string): number => {
  const length = value.length;
  if (length > 18) return 28;
  if (length > 14) return 32;
  if (length > 10) return 38;
  return 44;
};

const standardTagFontSize = (value: string): number => {
  const length = value.length;
  if (length > 20) return 20;
  if (length > 16) return 23;
  if (length > 12) return 26;
  return 29;
};

const fitRegistrationSvgText = (
  value: string,
  baseFontSize: number,
  maxWidthUnits = 356,
): {
  fontSize: number;
  textLength?: number;
  lengthAdjust?: "spacingAndGlyphs";
} => {
  const len = Math.max(1, value.length);
  const estimatedWidth = len * baseFontSize * 0.62;
  if (estimatedWidth <= maxWidthUnits) {
    return { fontSize: baseFontSize };
  }
  const scaledFont = Math.max(14, Math.floor((maxWidthUnits / (len * 0.62)) * 10) / 10);
  const postScaleWidth = len * scaledFont * 0.62;
  if (postScaleWidth > maxWidthUnits) {
    return {
      fontSize: scaledFont,
      textLength: maxWidthUnits,
      lengthAdjust: "spacingAndGlyphs",
    };
  }
  return { fontSize: scaledFont };
};

export function CalibrationLabelArtwork({
  certificateNumber,
  calibrationDate,
  isComaninsStandard = false,
  clientTag = "",
  validityDate = "",
  periodicityMonths,
  isRegistrationLabel = false,
  clientName = "",
  instrumentRange = "",
  entryNumber = "",
  calibrationLogo,
  className = "",
  printable = false,
}: CalibrationLabelArtworkProps) {
  const formattedDate = formatCalibrationLabelDate(calibrationDate);
  const formattedValidity = formatCalibrationLabelDate(validityDate);
  const cleanCert = certificateNumber.replace(/^COMA-/i, "").trim();
  const cleanTag = String(clientTag || "").trim().toUpperCase();

  if (isRegistrationLabel) {
    const cleanClientName = String(clientName || "NÃO INFORMADO").trim().toUpperCase();
    const cleanRegCert = String(certificateNumber || "—").trim();
    const hasTag = Boolean(
      cleanTag &&
        !/^(n\/?a|s\/?tag|sem\s*tag|n[aã]o\s*informad[oa]|none|null|-|—)$/i.test(
          cleanTag,
        ),
    );
    const cleanRange1 = String(instrumentRange || "—").trim();
    const cleanEntry = String(entryNumber || "—").trim();

    const clientFit = fitRegistrationSvgText(cleanClientName, hasTag ? 22 : 25, 356);
    const certFit = fitRegistrationSvgText(cleanRegCert, hasTag ? 30 : 34, 356);
    const tagFit = fitRegistrationSvgText(cleanTag, 25, 356);
    const rangeFit = fitRegistrationSvgText(cleanRange1, hasTag ? 24 : 27, 356);
    const entryFit = fitRegistrationSvgText(cleanEntry, hasTag ? 26 : 30, 356);

    return (
      <div
        id={printable ? "calibration-label-print" : undefined}
        className={`calibration-label-artwork overflow-hidden ${className}`}
        style={{ aspectRatio: "1 / 1" }}
        aria-label={`Etiqueta de registro 40 por 40 milímetros. Cliente ${cleanClientName}. Certificado ${cleanRegCert}. ${hasTag ? `TAG ${cleanTag}. ` : ""}Faixa 1 ${cleanRange1}. Entrada ${cleanEntry}.`}
      >
        <svg
          className="block h-full w-full"
          viewBox="0 0 400 400"
          role="img"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Fundo 40mm x 40mm (400 x 400 unidades -> 10 un = 1 mm) */}
          <rect width="400" height="400" fill="#ffffff" />

          {/* Moldura respeitando margem física de 1 mm (x=10, y=10, 380x380 = 38mm x 38mm) */}
          <rect
            x="10"
            y="10"
            width="380"
            height="380"
            rx="4"
            fill="#ffffff"
            stroke="#000000"
            strokeWidth="3"
          />

          {/* Cabeçalho da etiqueta */}
          <text
            x="200"
            y="32"
            textAnchor="middle"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="15"
            fontWeight="900"
            fill="#000000"
          >
            COMANINS • ETIQUETA DE REGISTRO
          </text>
          <line x1="10" y1="44" x2="390" y2="44" stroke="#000000" strokeWidth="2.5" />

          {hasTag ? (
            <>
              {/* 1. CLIENTE (y: 44 -> 113) */}
              <text
                x="22"
                y="61"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize="11.5"
                fontWeight="800"
                fill="#000000"
              >
                CLIENTE
              </text>
              <text
                x="22"
                y="98"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize={clientFit.fontSize}
                fontWeight="900"
                fill="#000000"
                textLength={clientFit.textLength}
                lengthAdjust={clientFit.lengthAdjust}
              >
                {cleanClientName}
              </text>
              <line x1="10" y1="113" x2="390" y2="113" stroke="#000000" strokeWidth="2" />

              {/* 2. Nº DO CERTIFICADO / COMA (y: 113 -> 185) */}
              <text
                x="22"
                y="130"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize="11.5"
                fontWeight="800"
                fill="#000000"
              >
                Nº DO CERTIFICADO / COMA
              </text>
              <text
                x="22"
                y="172"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize={certFit.fontSize}
                fontWeight="900"
                fill="#000000"
                textLength={certFit.textLength}
                lengthAdjust={certFit.lengthAdjust}
              >
                {cleanRegCert}
              </text>
              <line x1="10" y1="185" x2="390" y2="185" stroke="#000000" strokeWidth="2" />

              {/* 3. TAG (y: 185 -> 253) */}
              <text
                x="22"
                y="202"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize="11.5"
                fontWeight="800"
                fill="#000000"
              >
                TAG
              </text>
              <text
                x="22"
                y="240"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize={tagFit.fontSize}
                fontWeight="900"
                fill="#000000"
                textLength={tagFit.textLength}
                lengthAdjust={tagFit.lengthAdjust}
              >
                {cleanTag}
              </text>
              <line x1="10" y1="253" x2="390" y2="253" stroke="#000000" strokeWidth="2" />

              {/* 4. FAIXA DO INSTRUMENTO - FAIXA 1 (y: 253 -> 321) */}
              <text
                x="22"
                y="270"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize="11.5"
                fontWeight="800"
                fill="#000000"
              >
                FAIXA DO INSTRUMENTO (FAIXA 1)
              </text>
              <text
                x="22"
                y="308"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize={rangeFit.fontSize}
                fontWeight="900"
                fill="#000000"
                textLength={rangeFit.textLength}
                lengthAdjust={rangeFit.lengthAdjust}
              >
                {cleanRange1}
              </text>
              <line x1="10" y1="321" x2="390" y2="321" stroke="#000000" strokeWidth="2" />

              {/* 5. Nº DA ENTRADA (y: 321 -> 390) */}
              <text
                x="22"
                y="338"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize="11.5"
                fontWeight="800"
                fill="#000000"
              >
                Nº DA ENTRADA
              </text>
              <text
                x="22"
                y="377"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize={entryFit.fontSize}
                fontWeight="900"
                fill="#000000"
                textLength={entryFit.textLength}
                lengthAdjust={entryFit.lengthAdjust}
              >
                {cleanEntry}
              </text>
            </>
          ) : (
            <>
              {/* 1. CLIENTE (y: 44 -> 130) */}
              <text
                x="22"
                y="64"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize="12.5"
                fontWeight="800"
                fill="#000000"
              >
                CLIENTE
              </text>
              <text
                x="22"
                y="110"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize={clientFit.fontSize}
                fontWeight="900"
                fill="#000000"
                textLength={clientFit.textLength}
                lengthAdjust={clientFit.lengthAdjust}
              >
                {cleanClientName}
              </text>
              <line x1="10" y1="130" x2="390" y2="130" stroke="#000000" strokeWidth="2" />

              {/* 2. Nº DO CERTIFICADO / COMA (y: 130 -> 218) */}
              <text
                x="22"
                y="150"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize="12.5"
                fontWeight="800"
                fill="#000000"
              >
                Nº DO CERTIFICADO / COMA
              </text>
              <text
                x="22"
                y="201"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize={certFit.fontSize}
                fontWeight="900"
                fill="#000000"
                textLength={certFit.textLength}
                lengthAdjust={certFit.lengthAdjust}
              >
                {cleanRegCert}
              </text>
              <line x1="10" y1="218" x2="390" y2="218" stroke="#000000" strokeWidth="2" />

              {/* 3. FAIXA DO INSTRUMENTO - FAIXA 1 (y: 218 -> 304) */}
              <text
                x="22"
                y="238"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize="12.5"
                fontWeight="800"
                fill="#000000"
              >
                FAIXA DO INSTRUMENTO (FAIXA 1)
              </text>
              <text
                x="22"
                y="286"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize={rangeFit.fontSize}
                fontWeight="900"
                fill="#000000"
                textLength={rangeFit.textLength}
                lengthAdjust={rangeFit.lengthAdjust}
              >
                {cleanRange1}
              </text>
              <line x1="10" y1="304" x2="390" y2="304" stroke="#000000" strokeWidth="2" />

              {/* 4. Nº DA ENTRADA (y: 304 -> 390) */}
              <text
                x="22"
                y="324"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize="12.5"
                fontWeight="800"
                fill="#000000"
              >
                Nº DA ENTRADA
              </text>
              <text
                x="22"
                y="374"
                fontFamily="Arial, Helvetica, sans-serif"
                fontSize={entryFit.fontSize}
                fontWeight="900"
                fill="#000000"
                textLength={entryFit.textLength}
                lengthAdjust={entryFit.lengthAdjust}
              >
                {cleanEntry}
              </text>
            </>
          )}
        </svg>
      </div>
    );
  }

  if (isComaninsStandard) {
    return (
      <div
        id={printable ? "calibration-label-print" : undefined}
        className={`calibration-label-artwork overflow-hidden ${className}`}
        style={{ aspectRatio: "1 / 1" }}
        aria-label={`Etiqueta de calibração de padrão COMANINS. Certificado ${cleanCert}. TAG ${cleanTag}. Calibração ${formattedDate}. Validade ${formattedValidity}.`}
      >
        <svg
          className="block h-full w-full"
          viewBox="0 0 360 360"
          role="img"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect className="tze661-tape-background" width="360" height="360" fill="#f4cf16" />

          <image
            href={calibrationLogo || DEFAULT_CALIBRATION_LABEL_LOGO}
            x="35"
            y="8"
            width="290"
            height="74"
            preserveAspectRatio="xMidYMid meet"
            onError={(event) => {
              if (event.currentTarget.getAttribute("href") !== DEFAULT_CALIBRATION_LABEL_LOGO) {
                event.currentTarget.setAttribute("href", DEFAULT_CALIBRATION_LABEL_LOGO);
              }
            }}
          />

          <text x="180" y="103" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="17" fontWeight="900" fill="#000">
            PADRÃO COMANINS
          </text>
          <text x="180" y="128" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="19" fontWeight="900" fill="#000">
            CALIBRADO
          </text>
          <line x1="18" y1="139" x2="342" y2="139" stroke="#000" strokeWidth="2" />

          <text x="18" y="160" fontFamily="Arial, Helvetica, sans-serif" fontSize="12" fontWeight="800" fill="#000">
            CERTIFICADO
          </text>
          <text x="18" y="204" fontFamily="Arial, Helvetica, sans-serif" fontSize={standardCertificateFontSize(cleanCert)} fontWeight="900" fill="#000">
            {cleanCert}
          </text>

          <text x="18" y="228" fontFamily="Arial, Helvetica, sans-serif" fontSize="12" fontWeight="800" fill="#000">
            TAG DO CLIENTE
          </text>
          <text x="18" y="260" fontFamily="Arial, Helvetica, sans-serif" fontSize={standardTagFontSize(cleanTag)} fontWeight="900" fill="#000">
            {cleanTag}
          </text>

          <line x1="18" y1="273" x2="342" y2="273" stroke="#000" strokeWidth="1.5" />
          <text x="18" y="298" fontFamily="Arial, Helvetica, sans-serif" fontSize="12" fontWeight="800" fill="#000">
            CALIBRAÇÃO
          </text>
          <text x="132" y="298" fontFamily="Arial, Helvetica, sans-serif" fontSize="18" fontWeight="900" fill="#000">
            {formattedDate}
          </text>

          <text x="18" y="326" fontFamily="Arial, Helvetica, sans-serif" fontSize="12" fontWeight="800" fill="#000">
            VALIDADE
          </text>
          <text x="132" y="326" fontFamily="Arial, Helvetica, sans-serif" fontSize="18" fontWeight="900" fill="#000">
            {formattedValidity}
          </text>

          <text x="18" y="348" fontFamily="Arial, Helvetica, sans-serif" fontSize="10" fontWeight="700" fill="#000">
            PERIODICIDADE: {periodicityMonths ? `${periodicityMonths} MESES` : "—"}
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div
      id={printable ? "calibration-label-print" : undefined}
      className={`calibration-label-artwork overflow-hidden ${className}`}
      style={{ aspectRatio: "36 / 15.98" }}
      aria-label={`Etiqueta de calibração. Certificado ${cleanCert}. Data ${formattedDate}.`}
    >
      <svg
        className="block h-full w-full"
        viewBox="-20 0 400 159.8"
        role="img"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect className="tze661-tape-background" width="360" height="159.8" fill="#f4cf16" />

        <image
          href={calibrationLogo || DEFAULT_CALIBRATION_LABEL_LOGO}
          x="60"
          y="4"
          width="240"
          height="78"
          preserveAspectRatio="xMidYMid meet"
          onError={(event) => {
            if (event.currentTarget.getAttribute("href") !== DEFAULT_CALIBRATION_LABEL_LOGO) {
              event.currentTarget.setAttribute("href", DEFAULT_CALIBRATION_LABEL_LOGO);
            }
          }}
        />
        <text
          x="220"
          y="112"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="15"
          fontWeight="900"
          fill="#000"
        >
          CALIBRADO
        </text>
        <text
          x="30"
          y="141"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize={certificateFontSize(cleanCert)}
          fontWeight="900"
          fill="#000"
          textLength={cleanCert.length > 5 ? 155 : undefined}
          lengthAdjust="spacingAndGlyphs"
        >
          {cleanCert}
        </text>

        <text
          x="220"
          y="141"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="20"
          fontWeight="700"
          fill="#000"
        >
          {formattedDate}
        </text>
      </svg>
    </div>
  );
}

export default function CalibrationLabelPrintModal({
  certificateNumber,
  calibrationDate,
  isComaninsStandard = false,
  clientTag = "",
  validityDate = "",
  periodicityMonths,
  isRegistrationLabel = false,
  clientName = "",
  instrumentRange = "",
  entryNumber = "",
  calibrationLogo,
  onClose,
  onPrinted,
}: CalibrationLabelPrintModalProps) {
  const handlePrint = () => {
    const printContent = document.getElementById("calibration-label-print");
    if (!printContent) return;

    onPrinted?.();

    // LOTE 43: a etiqueta de padrão COMANINS/BPC precisa ser impressa em uma
    // página física de 36 x 36 mm. O fluxo por iframe funciona para a etiqueta
    // normal (36 x 15,98 mm), mas o Chrome/driver pode conservar o tamanho de
    // mídia anterior ao imprimir um subframe. Para a BPC usamos um documento
    // de impressão de nível superior, com @page e conteúdo fixos em 36 x 36 mm.
    if (isComaninsStandard && !isRegistrationLabel) {
      const printWindow = window.open(
        "",
        "_blank",
        "popup=yes,width=720,height=760,resizable=yes,scrollbars=yes",
      );

      if (!printWindow) {
        window.alert(
          "O navegador bloqueou a janela de impressão. Libere pop-ups para este sistema e tente novamente.",
        );
        return;
      }

      const clonedContent = printContent.cloneNode(true) as HTMLElement;
      clonedContent.removeAttribute("class");
      clonedContent.setAttribute(
        "style",
        "display:block;width:36mm;height:36mm;min-width:36mm;min-height:36mm;max-width:36mm;max-height:36mm;margin:0;padding:0;overflow:hidden;box-sizing:border-box;",
      );

      const clonedSvg = clonedContent.querySelector("svg");
      if (clonedSvg) {
        clonedSvg.removeAttribute("class");
        clonedSvg.setAttribute("width", "36mm");
        clonedSvg.setAttribute("height", "36mm");
        clonedSvg.setAttribute(
          "style",
          "display:block;width:36mm;height:36mm;min-width:36mm;min-height:36mm;max-width:36mm;max-height:36mm;margin:0;padding:0;",
        );
      }

      const doc = printWindow.document;
      doc.open();
      doc.write(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Etiqueta BPC 36x36</title>
            <style>
              @page {
                size: 36mm 36mm;
                margin: 0;
              }
              * {
                box-sizing: border-box;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 36mm !important;
                height: 36mm !important;
                min-width: 36mm !important;
                min-height: 36mm !important;
                max-width: 36mm !important;
                max-height: 36mm !important;
                overflow: hidden !important;
                background: transparent !important;
              }
              #calibration-label-print {
                display: block !important;
                width: 36mm !important;
                height: 36mm !important;
                min-width: 36mm !important;
                min-height: 36mm !important;
                max-width: 36mm !important;
                max-height: 36mm !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                aspect-ratio: auto !important;
              }
              #calibration-label-print svg {
                display: block !important;
                width: 36mm !important;
                height: 36mm !important;
                min-width: 36mm !important;
                min-height: 36mm !important;
                max-width: 36mm !important;
                max-height: 36mm !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .tze661-tape-background {
                fill: transparent !important;
              }
              @media print {
                @page {
                  size: 36mm 36mm;
                  margin: 0;
                }
                html, body, #calibration-label-print, #calibration-label-print svg {
                  width: 36mm !important;
                  height: 36mm !important;
                }
              }
            </style>
          </head>
          <body>${clonedContent.outerHTML}</body>
        </html>
      `);
      doc.close();

      let printTriggered = false;
      const triggerPrint = () => {
        if (printTriggered || printWindow.closed) return;
        printTriggered = true;
        printWindow.focus();
        window.setTimeout(() => printWindow.print(), 180);
      };

      printWindow.addEventListener("afterprint", () => {
        window.setTimeout(() => {
          if (!printWindow.closed) printWindow.close();
        }, 250);
      }, { once: true });

      if (doc.readyState === "complete") {
        triggerPrint();
      } else {
        printWindow.addEventListener("load", triggerPrint, { once: true });
        window.setTimeout(triggerPrint, 700);
      }
      return;
    }

    // Motor homologado da etiqueta de calibração (iframe oculto 1x1px),
    // parametrizado para 40mm x 40mm na Etiqueta de Registro (XD210) ou 36mm x 15.98mm na Etiqueta de Calibração.
    const labelWidthMm = isRegistrationLabel ? 40 : 36;
    const labelHeightMm = isRegistrationLabel ? 40 : 15.98;

    const pageStyleEl = document.getElementById("comanins-page-size-rule") as HTMLStyleElement | null;
    const previousPageRule = pageStyleEl ? pageStyleEl.textContent : null;
    if (pageStyleEl) {
      pageStyleEl.textContent = `@page { size: ${labelWidthMm}mm ${labelHeightMm}mm; margin: 0; }`;
    }

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.style.border = "0";

    const cleanup = () => {
      window.setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
        if (pageStyleEl && previousPageRule !== null) {
          pageStyleEl.textContent = previousPageRule;
        }
      }, 250);
    };

    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      cleanup();
      return;
    }

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Imprimir Etiqueta</title>
          <style>
            @page {
              size: ${labelWidthMm}mm ${labelHeightMm}mm;
              margin: 0;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: ${labelWidthMm}mm !important;
              height: ${labelHeightMm}mm !important;
              overflow: hidden !important;
              background: transparent !important;
            }
            svg {
              display: block !important;
              width: ${labelWidthMm}mm !important;
              height: ${labelHeightMm}mm !important;
            }
            .tze661-tape-background {
              fill: transparent !important;
            }
          </style>
        </head>
        <body>
          ${printContent.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(cleanup, 1000);
    }, 250);
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-start justify-center overflow-y-auto bg-slate-950/85 p-2 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calibration-label-title"
    >
      <div className="my-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
        <div className="shrink-0 flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <h2 id="calibration-label-title" className="text-base font-extrabold text-slate-900">
              {isRegistrationLabel
                ? "Visualização da etiqueta de registro"
                : isComaninsStandard
                  ? "Visualização da etiqueta do padrão COMANINS"
                  : "Visualização da etiqueta de calibração"}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              {isRegistrationLabel
                ? "Label Maker XD210 • 40 mm × 40 mm • margem de 1 mm"
                : `Brother TZe-661 • 36 mm × ${isComaninsStandard ? "36 mm" : "15,98 mm"} • impressão preta sobre fita amarela`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
            title="Fechar visualização"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:space-y-5 sm:p-6">
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {isRegistrationLabel
                  ? "Na janela de impressão, selecione a impressora Label Maker XD210, etiqueta de 40 mm × 40 mm, margem de 1 mm (já incorporada na arte), escala 100% e desative cabeçalhos e rodapés."
                  : `Na janela de impressão, selecione a impressora Brother, mídia contínua de 36 mm, comprimento de ${isComaninsStandard ? "36 mm" : "15,98 mm"}, margens zero, escala 100% e desative cabeçalhos e rodapés.`}
              </p>
            </div>
          </div>

          <div className="flex justify-center overflow-auto rounded-xl bg-slate-200 p-3 sm:p-5">
            <CalibrationLabelArtwork
              certificateNumber={certificateNumber}
              calibrationDate={calibrationDate}
              isComaninsStandard={isComaninsStandard}
              clientTag={clientTag}
              validityDate={validityDate}
              periodicityMonths={periodicityMonths}
              isRegistrationLabel={isRegistrationLabel}
              clientName={clientName}
              instrumentRange={instrumentRange}
              entryNumber={entryNumber}
              calibrationLogo={calibrationLogo}
              printable
              className={
                isRegistrationLabel || isComaninsStandard
                  ? "w-[min(420px,46dvh)] max-w-full shadow-lg"
                  : "w-full max-w-[720px] shadow-lg"
              }
            />
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-teal-700"
            >
              <Printer className="h-4 w-4" />
              Imprimir etiqueta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
