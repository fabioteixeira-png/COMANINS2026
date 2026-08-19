const fs = require('fs');
let content = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf-8');

const targetStr = `                                    <button
                                      type="button"
                                      onClick={() => {
                                        window.open(docItem.url, '_blank');
                                      }}
                                      className="p-1.5 text-royal-blue hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Visualizar Documento"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = docItem.url;
                                        link.download = docItem.name || 'documento';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }}
                                      className="p-1.5 text-royal-blue hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Baixar Documento"
                                    >
                                      <Download className="h-4 w-4" />
                                    </button>`;

const newStr = `                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          window.open(docItem.url, '_blank');
                                        }}
                                        className="p-1.5 text-royal-blue hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Visualizar Documento"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const link = document.createElement('a');
                                          link.href = docItem.url;
                                          link.download = docItem.name || 'documento';
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                        }}
                                        className="p-1.5 text-royal-blue hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Baixar Documento"
                                      >
                                        <Download className="h-4 w-4" />
                                      </button>
                                    </>`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/components/EmployeeManagement.tsx', content);
console.log("Patched EmployeeManagement.tsx docs fragment");
