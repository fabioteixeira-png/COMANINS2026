import React from 'react';
import { X, Printer } from 'lucide-react';

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
  
  // Format range: from rangeMin to rangeMax unit
  const rangeMin = instrument?.rangeMin !== undefined && instrument?.rangeMin !== null ? instrument.rangeMin : "";
  const rangeMax = instrument?.rangeMax !== undefined && instrument?.rangeMax !== null ? instrument.rangeMax : "";
  const unit = instrument?.unit || "";
  const range = (rangeMin !== "" && rangeMax !== "") ? `${rangeMin} a ${rangeMax} ${unit}`.trim() : "N/A";
  
  const dataRetorno = instrument?.dataDeRetorno || "N/A";

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 overflow-y-auto flex flex-col items-center p-0 sm:p-6 print:static print:block print:overflow-visible print:p-0 print:bg-white print:text-black print:backdrop-blur-none animate-fadeIn">
      {/* Top Bar - Header (HIDDEN on print) */}
      <div className="w-full max-w-[400px] bg-slate-800 text-white px-4 py-3 rounded-t-2xl sm:rounded-t-2xl shadow-xl flex items-center justify-between border-b border-slate-700 print:hidden sticky top-0 z-30 mt-10">
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
            title="Fechar Visualizador"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Printable Area */}
      {/* 40mm = 151.18px at 96 DPI, let's use actual mm for print and fixed pixels for preview */}
      <style>{`
        @media print {
          @page {
            size: 40mm 40mm;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0;
            padding: 0;
            background: white !important;
          }
        }
      `}</style>
      
      <div className="bg-white w-[40mm] h-[40mm] shadow-2xl relative print:shadow-none print:border-none print:m-0 print:rounded-none flex items-center justify-center p-1 mx-auto mt-4 sm:mt-0 border border-slate-200 box-border overflow-hidden">
        {/* Label Content */}
        <div className="w-full h-full border border-black p-1 flex flex-col justify-between" style={{ fontFamily: 'Arial, sans-serif' }}>
          
          <div className="text-center border-b border-black pb-0.5 mb-0.5">
            <h1 className="text-[7px] font-black uppercase leading-tight">ENTRADA DE INSTRUMENTO</h1>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-1 text-[6.5px] leading-none">
            <div className="flex justify-between">
              <span className="font-bold">ENTRADA:</span>
              <span className="font-mono">{numEntrada}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-bold">CERTIFICADO:</span>
              <span className="font-mono">{numCertificado}</span>
            </div>
            
            <div className="flex flex-col">
              <span className="font-bold">CLIENTE:</span>
              <span className="truncate w-full leading-tight uppercase" style={{ fontSize: '5.5px' }}>{cliente}</span>
            </div>

            <div className="flex justify-between">
              <span className="font-bold">RANGE:</span>
              <span className="truncate max-w-[20mm] text-right font-mono" style={{ fontSize: '5.5px' }}>{range}</span>
            </div>

            <div className="flex justify-between">
              <span className="font-bold">RETORNO:</span>
              <span className="font-mono">{dataRetorno}</span>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
