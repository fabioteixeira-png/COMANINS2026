const fs = require('fs');
let content = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf-8');

const targetStr = `                                        onClick={(e) => {
                                          e.preventDefault();
                                          window.open(rec.certificateUrl, '_blank');
                                        }}`;

const newStr = `                                        onClick={(e) => {
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
                                              alert("Erro ao abrir certificado.");
                                            }
                                          } else {
                                            window.open(rec.certificateUrl, "_blank");
                                          }
                                        }}`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/components/EmployeeManagement.tsx', content);
console.log("Patched docs view 2 onClick");
