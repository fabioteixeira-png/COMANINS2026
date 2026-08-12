const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

const targetStr = `              {/* Section 7: Documentos e Anexos Diversos */}
              <div className="border border-slate-300 rounded-xl p-4 space-y-2 bg-slate-50/50">
                <h4 className="font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 text-xs text-royal-blue flex items-center justify-between">
                  <span>7. DOCUMENTOS E ANEXOS DIVERSOS DO COLABORADOR</span>
                  <span className="font-normal normal-case text-[10px] text-slate-500">
                    {(selectedUser.attachedDocs || []).length} anexo(s)
                  </span>
                </h4>
                {(selectedUser.attachedDocs || []).length === 0 ? (
                  <p className="text-slate-500 italic text-[11px]">Nenhum documento anexado a este colaborador.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {(selectedUser.attachedDocs || []).map((docItem, index) => (
                      <div key={docItem.id || index} className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-[11px]">
                        <div className="flex items-center space-x-2 truncate pr-2">
                          <FileText className="h-4 w-4 text-royal-blue shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">{docItem.name}</span>
                        </div>
                        {docItem.url && (
                          <a
                            href={docItem.url}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-blue-50 hover:bg-blue-100 text-royal-blue px-2 py-1 rounded text-[10px] font-bold flex items-center space-x-1 shrink-0 print:hidden"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Abrir</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}`;

const replaceStr = `              {/* Section 7: Documentos e Anexos Diversos */}
              <div className="border border-slate-300 rounded-xl p-4 space-y-2 bg-slate-50/50">
                <h4 className="font-bold text-slate-900 uppercase border-b border-slate-300 pb-1 text-xs text-royal-blue flex items-center justify-between">
                  <span>7. DOCUMENTOS E ANEXOS DIVERSOS DO COLABORADOR</span>
                  <span className="font-normal normal-case text-[10px] text-slate-500">
                    {userDocuments.length} anexo(s)
                  </span>
                </h4>
                {isLoadingDocs ? (
                  <span className="text-slate-500 italic text-[11px]">Carregando documentos...</span>
                ) : userDocuments.length === 0 ? (
                  <p className="text-slate-500 italic text-[11px]">Nenhum documento anexado a este colaborador.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {userDocuments.map((docItem, index) => (
                      <div key={docItem.id || index} className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-[11px]">
                        <div className="flex items-center space-x-2 truncate pr-2">
                          <FileText className="h-4 w-4 text-royal-blue shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">{docItem.name}</span>
                        </div>
                        {docItem.url && (
                          <a
                            href={docItem.url}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-blue-50 hover:bg-blue-100 text-royal-blue px-2 py-1 rounded text-[10px] font-bold flex items-center space-x-1 shrink-0 print:hidden"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Abrir</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
