import React from "react";
import { AlertCircle, Printer, X } from "lucide-react";

export interface CalibrationLabelData {
  certificateNumber: string;
  calibrationDate: string;
}

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

const certificateFontSize = (value: string): number => {
  const length = value.length;
  if (length > 28) return 32;
  if (length > 22) return 40;
  if (length > 16) return 48;
  return 64;
};

export function CalibrationLabelArtwork({
  certificateNumber,
  calibrationDate,
  calibrationLogo,
  className = "",
  printable = false,
}: CalibrationLabelArtworkProps) {
  const formattedDate = formatCalibrationLabelDate(calibrationDate);
  const cleanCert = certificateNumber.replace(/^COMA-/i, "").trim();

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
        <rect x="25" y="5" width="310" height="149.8" rx="4" fill="none" stroke="#000" strokeWidth="2" />

        <image
          href={calibrationLogo || "/comanins-calibration-label-logo.png"}
          x="35"
          y="12"
          width="150"
          height="45"
          preserveAspectRatio="xMidYMid meet"
          style={{}}
        />
        <text
          x="325"
          y="28"
          textAnchor="end"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="17"
          fontWeight="900"
          fill="#000"
        >
          CALIBRADO
        </text>
        <text
          x="325"
          y="48"
          textAnchor="end"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="10"
          fontWeight="700"
          letterSpacing="0.8"
          fill="#000"
        >
          IDENTIFICAÇÃO METROLÓGICA
        </text>

        <line x1="25" y1="64" x2="335" y2="64" stroke="#000" strokeWidth="2" />
        <line x1="190" y1="64" x2="190" y2="154.8" stroke="#000" strokeWidth="1.5" />

        <text
          x="35"
          y="82"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="12"
          fontWeight="800"
          letterSpacing="1"
          fill="#000"
        >
          Nº CERTIFICADO
        </text>
        <text
          x="35"
          y="142"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize={certificateFontSize(cleanCert)}
          fontWeight="900"
          fill="#000"
          textLength={cleanCert.length > 18 ? 145 : undefined}
          lengthAdjust="spacingAndGlyphs"
        >
          {cleanCert}
        </text>

        <text
          x="262.5"
          y="82"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="12"
          fontWeight="800"
          letterSpacing="0.7"
          fill="#000"
        >
          DATA CALIB.
        </text>
        <text
          x="262.5"
          y="136"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="24"
          fontWeight="900"
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
  calibrationLogo,
  onClose,
}: CalibrationLabelPrintModalProps) {
  const handlePrint = () => {
    const printContent = document.getElementById("calibration-label-print");
    if (!printContent) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>Imprimir Etiqueta</title>
            <style>
              @page {
                size: 36mm 15.98mm;
                margin: 0;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 36mm !important;
                height: 15.98mm !important;
                overflow: hidden !important;
                background: transparent !important;
              }
              svg {
                display: block !important;
                width: 36mm !important;
                height: 15.98mm !important;
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
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }, 250);
    }
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
              Visualização da etiqueta de calibração
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Brother TZe-661 • 36 mm × 15,98 mm • impressão preta sobre fita amarela
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
                comprimento de 15,98 mm, margens zero, escala 100% e desative cabeçalhos e rodapés.
              </p>
            </div>
          </div>

          <div className="flex justify-center overflow-x-auto rounded-xl bg-slate-200 p-5">
            <CalibrationLabelArtwork
              certificateNumber={certificateNumber}
              calibrationDate={calibrationDate}
              calibrationLogo={calibrationLogo}
              printable
              className="w-full max-w-[720px] shadow-lg"
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
