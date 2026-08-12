const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target = `                            {/* Entregar Button (Disponível após a emissão do certificado, ou para instrumentos RNC prontos para retirada) */}
                            {((isCertEmitted && !isRncIssued) ||
                              (isRncIssued &&
                                (inst.status === "Disponível para Retirada" ||
                                  inst.status === "Não Conforme"))) &&
                              inst.status !== "Entregue" && (
                                <button
                                  onClick={async () => {
                                    if (onUpdateInstrumentStatus) {
                                      await onUpdateInstrumentStatus(
                                        inst.id,
                                        "Entregue",
                                      );
                                    }
                                  }}
                                  className="px-2 py-1 font-semibold rounded text-[10px] whitespace-nowrap shadow-xs flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 cursor-pointer transition-colors"
                                  title="Alterar o status deste instrumento para Entregue"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Entregar</span>
                                </button>
                              )}`;

code = code.replace(target, '');
fs.writeFileSync('src/components/InternalPortal.tsx', code);
