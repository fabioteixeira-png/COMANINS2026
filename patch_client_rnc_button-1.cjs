const fs = require('fs');
let code = fs.readFileSync('src/components/ClientPortal.tsx', 'utf8');

const target1 = `                {filteredInstruments.map(inst => {
                  const dStatus = displayStatuses.get(inst.id) || inst.status;
                  const hasCertificate = dStatus === 'Calibrado' || dStatus === 'Entregue' || dStatus === 'Disponível para Retirada';`;

const replace1 = `                {filteredInstruments.map(inst => {
                  const dStatus = displayStatuses.get(inst.id) || inst.status;
                  const hasCertificate = dStatus === 'Calibrado' || dStatus === 'Entregue' || dStatus === 'Disponível para Retirada';
                  const isRnc = dStatus === 'RNC' || inst.status === 'RNC' || inst.hasRnc;`;

code = code.replace(target1, replace1);

const target2 = `                      <td className="p-4 text-center">
                        {hasCertificate ? (
                          <button
                            onClick={() => handleOpenCertificate(inst)}
                            className="inline-flex items-center justify-center px-3 py-1.5 bg-royal-blue hover:bg-royal-light text-white rounded font-bold text-[11px] transition-all shadow-sm hover:shadow"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Ver Certificado
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic font-mono font-medium">Aguardando Ensaio</span>
                        )}
                      </td>`;

const replace2 = `                      <td className="p-4 text-center">
                        {isRnc ? (
                          <button
                            onClick={() => {
                              const report = rncReports.find(r => r.instrumentId === inst.id);
                              if (report) {
                                setSelectedRncReport(report);
                                setSelectedInstrument(inst);
                                setShowRncViewModal(true);
                              } else {
                                alert("Relatório de RNC não encontrado para este instrumento.");
                              }
                            }}
                            className="inline-flex items-center justify-center px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[11px] transition-all shadow-sm hover:shadow"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Visualizar Relatório de RNC
                          </button>
                        ) : hasCertificate ? (
                          <button
                            onClick={() => handleOpenCertificate(inst)}
                            className="inline-flex items-center justify-center px-3 py-1.5 bg-royal-blue hover:bg-royal-light text-white rounded font-bold text-[11px] transition-all shadow-sm hover:shadow"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Ver Certificado
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic font-mono font-medium">Aguardando Ensaio</span>
                        )}
                      </td>`;

code = code.replace(target2, replace2);
fs.writeFileSync('src/components/ClientPortal.tsx', code);
