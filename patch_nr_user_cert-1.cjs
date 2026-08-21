const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

const target = `                                  <td className="p-1.5 text-center">
                                    {rec.certificateUrl ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          window.open(rec.certificateUrl, '_blank');
                                        }}
                                        className="bg-royal-blue/10 hover:bg-royal-blue/20 text-royal-blue px-2 py-0.5 rounded font-bold text-[9px] inline-flex items-center gap-1 print:hidden"
                                      >
                                        <FileText className="w-3 h-3" />
                                        <span>Ver</span>
                                      </button>
                                    ) : (
                                      <span className="text-slate-400 text-[9px]">-</span>
                                    )}
                                  </td>`;

const replacement = `                                  <td className="p-1.5 text-center">
                                    {rec.certificateUrl ? (
                                      <div className="flex items-center justify-center space-x-1 print:hidden">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            if (rec.certificateUrl?.startsWith("data:")) {
                                              try {
                                                const byteString = atob(rec.certificateUrl.split(",")[1]);
                                                const mimeString = rec.certificateUrl.split(",")[0].split(":")[1].split(";")[0];
                                                const ab = new ArrayBuffer(byteString.length);
                                                const ia = new Uint8Array(ab);
                                                for (let i = 0; i < byteString.length; i++) {
                                                  ia[i] = byteString.charCodeAt(i);
                                                }
                                                const blob = new Blob([ab], { type: mimeString });
                                                const blobUrl = URL.createObjectURL(blob);
                                                window.open(blobUrl, "_blank");
                                              } catch (err) {
                                                console.error("Erro ao abrir certificado", err);
                                                alert("Erro ao abrir o certificado.");
                                              }
                                            } else {
                                              window.open(rec.certificateUrl, "_blank");
                                            }
                                          }}
                                          className="bg-royal-blue/10 hover:bg-royal-blue/20 text-royal-blue px-2 py-0.5 rounded font-bold text-[9px] inline-flex items-center gap-1 cursor-pointer"
                                        >
                                          <FileText className="w-3 h-3" />
                                          <span>Ver</span>
                                        </button>
                                        <a
                                          href={rec.certificateUrl}
                                          download={\`Certificado_\${(name || '').replace(/\\s+/g, '_')}\`}
                                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded font-bold text-[9px] inline-flex items-center gap-1 cursor-pointer"
                                          title="Baixar PDF"
                                        >
                                          <Download className="w-3 h-3" />
                                          <span>Baixar</span>
                                        </a>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 text-[9px]">-</span>
                                    )}
                                  </td>`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
