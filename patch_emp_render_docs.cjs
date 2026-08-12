const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

const targetStr = `                      {/* Lista de Documentos Anexados */}
                      <div className="space-y-2">
                        {(formData.attachedDocs || []).length === 0 ? (
                          <p className="text-slate-400 italic text-[11px] text-center py-4 border border-dashed border-slate-200 rounded-xl bg-white">
                            Nenhum documento anexado ainda a este colaborador.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(formData.attachedDocs || []).map((docItem, index) => (
                              <div
                                key={docItem.id || index}
                                className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:border-royal-blue/40 transition-colors shadow-sm"
                              >
                                <div className="flex items-center space-x-2.5 overflow-hidden pr-2">
                                  <div className="p-2 bg-blue-50 text-royal-blue rounded-lg border border-blue-100 shrink-0">
                                    <FileText className="h-4 w-4" />
                                  </div>
                                  <div className="overflow-hidden">
                                    <h6 className="font-bold text-slate-800 truncate text-xs">{docItem.name}</h6>
                                    <p className="text-[10px] text-slate-500 font-mono">Anexado em: {docItem.date || 'Hoje'}</p>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1 shrink-0">
                                  {docItem.url && (
                                    <a
                                      href={docItem.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 text-royal-blue hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Visualizar / Baixar Documento"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData({
                                        ...formData,
                                        attachedDocs: (formData.attachedDocs || []).filter((_, i) => i !== index)
                                      });
                                    }}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Excluir Anexo"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>`;

const replaceStr = `                      {/* Lista de Documentos Anexados */}
                      <div className="space-y-2">
                        {isLoadingDocs ? (
                          <div className="flex justify-center p-4">
                             <span className="text-slate-400 text-xs">Carregando documentos...</span>
                          </div>
                        ) : userDocuments.length === 0 ? (
                          <p className="text-slate-400 italic text-[11px] text-center py-4 border border-dashed border-slate-200 rounded-xl bg-white">
                            Nenhum documento anexado ainda a este colaborador.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {userDocuments.map((docItem, index) => (
                              <div
                                key={docItem.id || index}
                                className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:border-royal-blue/40 transition-colors shadow-sm"
                              >
                                <div className="flex items-center space-x-2.5 overflow-hidden pr-2">
                                  <div className="p-2 bg-blue-50 text-royal-blue rounded-lg border border-blue-100 shrink-0">
                                    <FileText className="h-4 w-4" />
                                  </div>
                                  <div className="overflow-hidden">
                                    <h6 className="font-bold text-slate-800 truncate text-xs">{docItem.name}</h6>
                                    <p className="text-[10px] text-slate-500 font-mono">Anexado em: {docItem.date || 'Hoje'}</p>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1 shrink-0">
                                  {docItem.url && (
                                    <a
                                      href={docItem.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 text-royal-blue hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Visualizar / Baixar Documento"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (confirm('Deseja realmente excluir este anexo definitivamente?')) {
                                        try {
                                          await deleteEmployeeDocument(docItem.id);
                                          setUserDocuments(userDocuments.filter(d => d.id !== docItem.id));
                                        } catch (err) {
                                          alert("Erro ao excluir: " + err);
                                        }
                                      }
                                    }}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Excluir Anexo"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
