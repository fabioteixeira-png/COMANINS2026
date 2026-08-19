const fs = require('fs');
let content = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf-8');

const targetStr = `                                        onClick={() => {
                                          window.open(docItem.url, '_blank');
                                        }}
                                        className="p-1.5 text-royal-blue hover:bg-blue-50 rounded-lg transition-colors"`;

const newStr = `                                        onClick={(e) => {
                                          e.preventDefault();
                                          if (docItem.url?.startsWith("data:")) {
                                            try {
                                              const byteString = atob(docItem.url.split(",")[1]);
                                              const mimeString = docItem.url.split(",")[0].split(":")[1].split(";")[0];
                                              const ab = new ArrayBuffer(byteString.length);
                                              const ia = new Uint8Array(ab);
                                              for (let i = 0; i < byteString.length; i++) {
                                                ia[i] = byteString.charCodeAt(i);
                                              }
                                              const blob = new Blob([ab], { type: mimeString });
                                              const blobUrl = URL.createObjectURL(blob);
                                              window.open(blobUrl, "_blank");
                                            } catch (err) {
                                              console.error("Erro ao abrir documento", err);
                                              alert("Erro ao abrir o documento.");
                                            }
                                          } else {
                                            window.open(docItem.url, "_blank");
                                          }
                                        }}
                                        className="p-1.5 text-royal-blue hover:bg-blue-50 rounded-lg transition-colors"`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/components/EmployeeManagement.tsx', content);
console.log("Patched docs view onClick");
