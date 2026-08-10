import React from 'react';
import { X, Printer } from 'lucide-react';
import ComaninsLogo from './ComaninsLogo';

interface IntakeLabelPrintModalProps {
  instrument: any;
  client: any;
  onClose: () => void;
}

export default function IntakeLabelPrintModal({ instrument, client, onClose }: IntakeLabelPrintModalProps) {
  // Ensure missing values don't break the layout
  const numEntrada = instrument?.numeroDaEntrada || "N/A";
  const numCertificado = instrument?.certificateNumber || "N/A";
  const cliente = client?.name || instrument?.clientId || "N/A";
  const tag = instrument?.tag || "N/A";
  
  // Format range: from rangeMin to rangeMax unit
  const rangeMin = instrument?.rangeMin !== undefined && instrument?.rangeMin !== null ? instrument.rangeMin : "";
  const rangeMax = instrument?.rangeMax !== undefined && instrument?.rangeMax !== null ? instrument.rangeMax : "";
  const unit = instrument?.unit || "";
  const range = (rangeMin !== "" && rangeMax !== "") ? `${rangeMin} a ${rangeMax} ${unit}`.trim() : "N/A";
  
  const dataRetorno = instrument?.dataDeRetorno || "N/A";

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[99999] flex flex-col items-center justify-center p-0 sm:p-6 print:static print:block print:bg-white print:text-black print:backdrop-blur-none animate-fadeIn">
      {/* Top Bar - Header (HIDDEN on print) */}
      <div className="w-full max-w-[400px] bg-slate-800 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between border border-slate-700 print:hidden absolute top-10 z-30">
        <div className="flex items-center space-x-3">
          <div className="bg-teal-600 text-white font-mono text-[10px] font-black px-2 py-0.5 rounded tracking-widest uppercase">
            ETIQUETA 40x40
          </div>
          <div className="hidden sm:block">
            <span className="text-xs font-bold text-slate-100 block">
              Imprimir Etiqueta
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-teal-600 text-white hover:bg-teal-500 rounded-xl transition-all flex items-center text-xs font-bold gap-2 shadow-md cursor-pointer border border-teal-500/30"
            title="Imprimir"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-xl transition-all flex items-center text-xs font-bold cursor-pointer border border-slate-600"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Printable Area */}
      <style>{`
        @media print {
          @page {
            size: 40mm 40mm;
            margin: 0;
          }
          html, body {
            width: 40mm;
            height: 40mm;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: white !important;
          }
          body * {
            visibility: hidden;
          }
          #print-label-container, #print-label-container * {
            visibility: visible;
          }
          #print-label-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 40mm;
            height: 40mm;
            margin: 0;
            padding: 0;
            background: white !important;
            box-sizing: border-box;
          }
        }
      `}</style>
      
      <div id="print-label-container" className="bg-white w-[40mm] h-[40mm] shadow-2xl relative print:shadow-none print:border-none print:m-0 flex items-center justify-center p-[1mm] border border-slate-200 box-border overflow-hidden rounded-none mx-auto print:mx-0">
        <div className="w-full h-full flex flex-col justify-between overflow-hidden bg-white text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
          
          <div className="flex items-center justify-center border-b border-black pb-[1mm] mb-[1mm]">
            <ComaninsLogo variant="horizontal" size={90} color="#000000" className="opacity-100" />
          </div>

          <div className="flex-1 flex flex-col justify-center gap-y-[1.5mm] leading-none" style={{ fontSize: '10pt' }}>
            <div className="flex justify-between items-center bg-black text-white px-1 py-0.5 rounded-sm">
              <span className="font-bold text-[8pt]">ENTRADA:</span>
              <span className="font-bold text-[12pt]">{numEntrada}</span>
            </div>
            
            <div className="flex justify-between items-end">
              <span className="font-bold text-[7pt]">CERTIFICADO:</span>
              <span className="font-bold text-[9pt]">{numCertificado}</span>
            </div>

            <div className="flex justify-between items-end">
              <span className="font-bold text-[7pt]">TAG:</span>
              <span className="font-bold text-[9pt] truncate max-w-[25mm]">{tag}</span>
            </div>
            
            <div className="flex flex-col">
              <span className="font-bold text-[7pt]">CLIENTE:</span>
              <span className="truncate w-full font-bold uppercase text-[8pt] pt-[0.5mm]">{cliente}</span>
            </div>

            <div className="flex justify-between items-end">
              <span className="font-bold text-[7pt]">RANGE:</span>
              <span className="truncate max-w-[25mm] text-right font-bold text-[8pt]">{range}</span>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
