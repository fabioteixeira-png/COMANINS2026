const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const modalJSX = `
      {/* MODAL: FOTO DE DEVOLUÇÃO (ENTREGAR) */}
      {showDevolutionModal && selectedIntakeForDevolution && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in print:hidden">
          <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-8 space-y-0 text-slate-900">
            <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-600/20 rounded-xl border border-indigo-500/30 text-indigo-400">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Devolução da Entrada #{selectedIntakeForDevolution.numEntrada}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {clients.find(
                      (c) => c.id === selectedIntakeForDevolution.clientId,
                    )?.name || "Cliente"}{" "}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDevolutionModal(false);
                  setSelectedIntakeForDevolution(null);
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-3 text-sm text-blue-800 leading-relaxed">
                <ShieldCheck className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p>
                    Anexe a foto do documento ou protocolo de devolução assinado pelo cliente.
                    <strong> Isso marcará todos os instrumentos desta guia como Entregue.</strong>
                  </p>
                </div>
              </div>

              {!selectedIntakeForDevolution.photoDevolution ? (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                  <Camera className="h-10 w-10 text-slate-400 mb-3" />
                  <p className="text-sm font-semibold text-slate-700 mb-1">
                    Anexar Foto de Devolução
                  </p>
                  <p className="text-xs text-slate-500 mb-4 max-w-xs">
                    Tire uma foto ou selecione do seu dispositivo.
                  </p>
                  <label className="px-4 py-2 bg-royal-blue hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer shadow-sm transition-colors text-sm flex items-center space-x-2">
                    {isUploadingDevolution ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    <span>
                      {isUploadingDevolution
                        ? "Processando..."
                        : "Selecionar Foto"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleUploadDevolutionPhoto}
                      className="hidden"
                      disabled={isUploadingDevolution}
                    />
                  </label>
                </div>
              ) : (
                <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center h-64">
                  <img
                    src={selectedIntakeForDevolution.photoDevolution}
                    alt="Devolução"
                    className="max-h-full max-w-full object-contain"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                    <a
                      href={selectedIntakeForDevolution.photoDevolution}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white text-slate-900 rounded-lg font-bold text-xs flex items-center space-x-1 hover:bg-slate-100 shadow"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Ampliar</span>
                    </a>
                    <button
                      onClick={handleDeleteDevolutionPhoto}
                      className="p-2 bg-rose-500 text-white rounded-lg font-bold text-xs flex items-center space-x-1 hover:bg-rose-600 shadow"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
`;

const target = `{/* MODAL: FOTOS DA ENTRADA DE MATERIAL */}`;
code = code.replace(target, modalJSX + "\\n      " + target);

fs.writeFileSync('src/components/InternalPortal.tsx', code);
