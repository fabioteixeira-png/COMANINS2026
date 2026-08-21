const fs = require('fs');
let code = fs.readFileSync('src/components/ClientPortal.tsx', 'utf8');

const modalTarget = `      {/* RENDER EXTREMELY HIGH QUALITY CALIBRATION REPORT OVERLAY (MODAL) */}
      {selectedReport && selectedInstrument && (`;

const modalReplacement = `      {/* RNC Modal */}
      {showRncViewModal && selectedRncReport && selectedInstrument && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-6 text-slate-900 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:m-0 print:w-full">
            {/* Header Modal Bar */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0 print:hidden">
              <div className="flex items-center space-x-3">
                <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0" />
                <h3 className="font-display font-extrabold text-sm text-white">
                  Relatório de Não Conformidade (RNC) - {selectedRncReport.rncNumber}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <Printer className="h-4 w-4" />
                  <span>Imprimir RNC</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRncViewModal(false);
                    setSelectedRncReport(null);
                    setSelectedInstrument(null);
                  }}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-8 overflow-y-auto space-y-6 text-slate-900 font-sans text-xs bg-white print:p-0 print:overflow-visible">
              {/* Document Header */}
              <div className="border-b-2 border-rose-600 pb-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {customLogo ? (
                    <img
                      src={customLogo}
                      alt="COMANINS Logo"
                      className="h-12 object-contain"
                    />
                  ) : (
                    <ComaninsLogo className="h-12 w-auto" />
                  )}
                  <div>
                    <h1 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">
                      COMANINS - SERVIÇOS DE METROLOGIA E MANUTENÇÃO
                    </h1>
                    <p className="text-[10px] text-slate-600">
                      Laboratório de Calibração Industrial & Ensaios Metrológicos
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-rose-100 text-rose-900 font-mono font-extrabold text-sm rounded border border-rose-300">
                    {selectedRncReport.rncNumber}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    Data de Emissão:{" "}
                    {selectedRncReport.date
                      ? selectedRncReport.date.split("-").reverse().join("/")
                      : new Date().toLocaleDateString("pt-BR")}
                  </div>
                </div>
              </div>

              {/* Document Title Banner */}
              <div className="bg-rose-50 border-l-4 border-rose-600 p-3 rounded-r-lg">
                <h2 className="text-sm font-extrabold text-rose-900 uppercase tracking-wide flex items-center space-x-2">
                  <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>RELATÓRIO DE NÃO CONFORMIDADE METROLÓGICA (RNC)</span>
                </h2>
                <p className="text-[11px] text-rose-800 mt-0.5 font-medium">
                  Status: <span className="font-extrabold underline uppercase">NÃO CONFORME / REPROVADO PARA USO</span>
                </p>
              </div>

              {/* Instrument Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1 border border-slate-200 rounded p-3">
                  <h3 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">
                    Dados do Equipamento
                  </h3>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="grid grid-cols-3">
                      <span className="font-semibold text-slate-500">Descrição:</span>
                      <span className="col-span-2 text-slate-800">{selectedInstrument.description}</span>
                    </div>
                    <div className="grid grid-cols-3">
                      <span className="font-semibold text-slate-500">Fabricante:</span>
                      <span className="col-span-2 text-slate-800">{selectedInstrument.brand}</span>
                    </div>
                    <div className="grid grid-cols-3">
                      <span className="font-semibold text-slate-500">Modelo:</span>
                      <span className="col-span-2 text-slate-800">{selectedInstrument.model}</span>
                    </div>
                    <div className="grid grid-cols-3">
                      <span className="font-semibold text-slate-500">Nº de Série:</span>
                      <span className="col-span-2 text-slate-800">{selectedInstrument.serialNumber || "-"}</span>
                    </div>
                  </div>
                </div>
                <div className="col-span-2 md:col-span-1 border border-slate-200 rounded p-3">
                  <h3 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">
                    Identificação & Controle
                  </h3>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="grid grid-cols-3">
                      <span className="font-semibold text-slate-500">TAG do Cliente:</span>
                      <span className="col-span-2 font-mono text-slate-800 font-bold">{selectedInstrument.tag}</span>
                    </div>
                    <div className="grid grid-cols-3">
                      <span className="font-semibold text-slate-500">Certificado Nº:</span>
                      <span className="col-span-2 font-mono text-slate-800">{selectedInstrument.certificateNumber}</span>
                    </div>
                    <div className="grid grid-cols-3">
                      <span className="font-semibold text-slate-500">Cliente:</span>
                      <span className="col-span-2 text-slate-800 line-clamp-1">{client.companyName}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RNC Details */}
              <div className="border-l-4 border-rose-500 pl-4 py-1">
                <h3 className="font-bold text-slate-900 mb-2 uppercase text-[11px] tracking-wider">
                  Descrição do Defeito / Motivo da Reprovação
                </h3>
                <div className="text-slate-800 font-mono text-sm leading-relaxed p-3 bg-slate-50 border border-slate-200 rounded-md whitespace-pre-wrap">
                  {selectedRncReport.reason}
                </div>
              </div>

              <div className="border-l-4 border-amber-500 pl-4 py-1">
                <h3 className="font-bold text-slate-900 mb-2 uppercase text-[11px] tracking-wider">
                  Análise Técnica e Impacto
                </h3>
                <div className="text-slate-800 font-sans text-[11px] leading-relaxed p-3 bg-amber-50/50 border border-amber-100 rounded-md whitespace-pre-wrap">
                  {selectedRncReport.aiAnalysis || "O instrumento não atende aos requisitos metrológicos e normativos devido à anomalia reportada acima, impossibilitando sua calibração ou uso contínuo com exatidão."}
                </div>
              </div>

              <div className="pt-8">
                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div className="text-center border-t border-slate-300 pt-2">
                    <div className="font-bold text-slate-800 mb-0.5">
                      {selectedRncReport.technicianName}
                    </div>
                    <div className="text-slate-500 text-[9px]">
                      Técnico Metrologista / Responsável
                    </div>
                    <div className="text-slate-400 text-[9px]">
                      COMANINS Metrologia
                    </div>
                  </div>
                  <div className="text-center border-t border-slate-300 pt-2">
                    <div className="font-bold text-slate-800 mb-0.5">
                      Ciente / Responsável
                    </div>
                    <div className="text-slate-500 text-[9px]">
                      Aprovação do Cliente
                    </div>
                    <div className="text-slate-400 text-[9px]">
                      {client.companyName}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER EXTREMELY HIGH QUALITY CALIBRATION REPORT OVERLAY (MODAL) */}
      {selectedReport && selectedInstrument && (`;

code = code.replace(modalTarget, modalReplacement);

fs.writeFileSync('src/components/ClientPortal.tsx', code);
