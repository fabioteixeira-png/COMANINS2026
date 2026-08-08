const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const auditSection = `
              </div>
            </div>
            
            {/* NOVO BLOCO: AUDITORIA DE ACESSO */}
            <div className="space-y-6 mt-10 print:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
                    <ShieldAlert className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-extrabold text-slate-950 flex items-center gap-2">
                      <span>Auditoria de Acesso ao Sistema</span>
                      <span className="text-xs bg-rose-100 text-rose-800 font-bold px-2.5 py-0.5 rounded-full border border-rose-200">
                        Acessos Restritos (Fora do Horário)
                      </span>
                    </h2>
                    <p className="text-sm text-slate-600">
                      Registro de acessos realizados após o horário comercial por colaboradores com perfil padrão/limitado e autorização de um Administrador.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden print:shadow-none print:border-slate-300">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-sm text-slate-900 uppercase font-mono tracking-wider flex items-center space-x-2">
                      <ShieldCheck className="h-4 w-4 text-rose-600" />
                      <span>Registros de Acesso Restrito</span>
                    </h3>
                    <span className="text-xs font-semibold text-slate-500">
                      {accessAuditLogs.length} acesso(s) rastreado(s)
                    </span>
                  </div>
                </div>
                
                {accessAuditLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Clock className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-medium">Nenhum registro de acesso restrito encontrado.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Data e Hora</th>
                          <th className="p-3.5">Usuário (Solicitante)</th>
                          <th className="p-3.5">Ação</th>
                          <th className="p-3.5">Detalhes / Justificativa</th>
                          <th className="p-3.5">Autorizado Por</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {accessAuditLogs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3.5 whitespace-nowrap font-mono text-xs">{new Date(log.date).toLocaleString()}</td>
                            <td className="p-3.5 font-bold text-slate-900">{log.user}</td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                {log.action}
                              </span>
                            </td>
                            <td className="p-3.5">{log.details}</td>
                            <td className="p-3.5 font-bold text-emerald-700">{log.authorizedBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
`;

content = content.replace('            </div>\n          ))}\n        {activeTab === "certificados" && (', auditSection + '          ))}\n        {activeTab === "certificados" && (');
fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Auditoria patched");
