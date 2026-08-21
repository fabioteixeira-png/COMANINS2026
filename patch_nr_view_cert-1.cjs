const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

const target = `<a
                                              href={rec.certificateUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="p-1 text-royal-blue hover:bg-blue-50 rounded transition-colors"
                                              title="Ver Certificado"
                                            >
                                              <Eye className="h-4 w-4" />
                                            </a>`;

const replacement = `<button
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
                                              className="p-1 text-royal-blue hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                              title="Ver Certificado"
                                            >
                                              <Eye className="h-4 w-4" />
                                            </button>`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
