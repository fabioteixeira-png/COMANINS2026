import React from "react";
import { AlertCircle, Printer, X } from "lucide-react";

export interface CalibrationLabelData {
  certificateNumber: string;
  calibrationDate: string;
  isComaninsStandard?: boolean;
  clientTag?: string;
  validityDate?: string;
  periodicityMonths?: 3 | 6 | 12;
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

export function CalibrationLabelArtwork({
  certificateNumber,
  calibrationDate,
  isComaninsStandard = false,
  clientTag = "",
  validityDate = "",
  periodicityMonths,
  calibrationLogo,
  className = "",
  printable = false,
}: CalibrationLabelArtworkProps) {
  const formattedDate = formatCalibrationLabelDate(calibrationDate);
  const formattedValidity = formatCalibrationLabelDate(validityDate);
  const cleanCert = certificateNumber.replace(/^COMA-/i, "").trim();
  const cleanTag = String(clientTag || "").trim().toUpperCase();

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
  calibrationLogo,
  onClose,
}: CalibrationLabelPrintModalProps) {
  const labelHeightMm = isComaninsStandard ? 36 : 15.98;

  const handlePrint = () => {
    const printContent = document.getElementById("calibration-label-print");
    if (!printContent) return;

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
      }, 250);
    };

    if (isComaninsStandard) {
      // O padrão COMANINS usa uma impressão totalmente isolada: somente o SVG
      // da etiqueta é enviado ao contexto de impressão. Isso impede que o
      // navegador herde qualquer elemento do Portal Interno.
      const svg = printContent.querySelector("svg");
      if (!svg) return;

      iframe.onload = () => {
        const printWindow = iframe.contentWindow;
        if (!printWindow) {
          cleanup();
          return;
        }
        printWindow.addEventListener("afterprint", cleanup, { once: true });
        window.setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          window.setTimeout(cleanup, 2000);
        }, 120);
      };

      iframe.srcdoc = `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Etiqueta Padrão COMANINS</title>
            <style>
              @page { size: 36mm 36mm; margin: 0; }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 36mm !important;
                height: 36mm !important;
                overflow: hidden !important;
                background: transparent !important;
              }
              body { display: block !important; }
              svg {
                display: block !important;
                width: 36mm !important;
                height: 36mm !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .tze661-tape-background { fill: transparent !important; }
            </style>
          </head>
          <body>${svg.outerHTML}</body>
        </html>
      `;
      document.body.appendChild(iframe);
      return;
    }

    // Mantém intacto o fluxo que já funciona para as etiquetas dos demais instrumentos.
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
              size: 36mm ${labelHeightMm}mm;
              margin: 0;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 36mm !important;
              height: ${labelHeightMm}mm !important;
              overflow: hidden !important;
              background: transparent !important;
            }
            svg {
              display: block !important;
              width: 36mm !important;
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
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calibration-label-title"
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <h2 id="calibration-label-title" className="text-base font-extrabold text-slate-900">
              {isComaninsStandard
                ? "Visualização da etiqueta do padrão COMANINS"
                : "Visualização da etiqueta de calibração"}
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Brother TZe-661 • 36 mm × {isComaninsStandard ? "36 mm" : "15,98 mm"} • impressão preta sobre fita amarela
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

        <div className="space-y-5 p-5 sm:p-7">
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Na janela de impressão, selecione a impressora Brother, mídia contínua de 36 mm,
                comprimento de {isComaninsStandard ? "36 mm" : "15,98 mm"}, margens zero, escala 100% e desative cabeçalhos e rodapés.
              </p>
            </div>
          </div>

          <div className="flex justify-center overflow-x-auto rounded-xl bg-slate-200 p-5">
            <CalibrationLabelArtwork
              certificateNumber={certificateNumber}
              calibrationDate={calibrationDate}
              isComaninsStandard={isComaninsStandard}
              clientTag={clientTag}
              validityDate={validityDate}
              periodicityMonths={periodicityMonths}
              calibrationLogo={calibrationLogo}
              printable
              className={isComaninsStandard ? "w-full max-w-[520px] shadow-lg" : "w-full max-w-[720px] shadow-lg"}
            />
          </div>

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
