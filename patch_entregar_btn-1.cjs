const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target = `                        <button
                          onClick={() => setSelectedIntakeToPrint(intake)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
                          title="Imprimir Guia de Entrada A4"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Imprimir Entrada</span>
                        </button>`;

const replacement = target + `

                        {(statusInfo.label === "Disponível para Retirada" || statusInfo.label === "Entregue") && (
                          <button
                            onClick={() => handleOpenDevolutionModal(intake)}
                            className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
                            title={statusInfo.label === "Entregue" ? "Ver Protocolo de Devolução" : "Entregar / Anexar Protocolo"}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>{statusInfo.label === "Entregue" ? "Ver Devolução" : "Entregar"}</span>
                          </button>
                        )}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/InternalPortal.tsx', code);
