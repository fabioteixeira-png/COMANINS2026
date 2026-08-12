const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

const targetStr = `                          <button
                            type="button"
                            onClick={() => {
                              if (!newDocName.trim()) {
                                alert('Por favor, informe uma descrição/nome para o documento.');
                                return;
                              }
                              if (!newDocFile) {
                                alert('Por favor, selecione um arquivo.');
                                return;
                              }
                              if (newDocFile.size > 800 * 1024) {
                                alert('⚠️ ARQUIVO MUITO GRANDE!\\n\\nO arquivo selecionado ultrapassa o limite de 800KB e não será salvo. Por favor, escolha um arquivo menor.');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const fileUrl = reader.result as string;
                                const newDoc = {
                                  id: \`doc_\${Date.now()}\`,
                                  name: \`\${newDocType} - \${newDocName.trim()}\`,
                                  type: newDocType,
                                  url: fileUrl,
                                  date: new Date().toLocaleDateString('pt-BR')
                                };
                                setFormData({
                                  ...formData,
                                  attachedDocs: [...(formData.attachedDocs || []), newDoc]
                                });
                                setNewDocName('');
                                setNewDocFile(null);
                              };
                              reader.readAsDataURL(newDocFile);
                            }}
                            className="bg-royal-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm"
                          >`;

const replaceStr = `                          <button
                            type="button"
                            onClick={async () => {
                              if (!newDocName.trim()) {
                                alert('Por favor, informe uma descrição/nome para o documento.');
                                return;
                              }
                              if (!newDocFile) {
                                alert('Por favor, selecione um arquivo.');
                                return;
                              }
                              
                              let fileUrl = "";
                              
                              if (newDocFile.type.startsWith('image/')) {
                                // Comprime a imagem automaticamente
                                fileUrl = await compressImageToWebResolution(newDocFile, 1200, 1200, 0.7);
                              } else {
                                // Para PDFs ou docs, limitamos o tamanho
                                if (newDocFile.size > 800 * 1024) {
                                  alert('⚠️ ARQUIVO MUITO GRANDE!\\n\\nO arquivo selecionado ultrapassa o limite de 800KB. Por favor, escolha um arquivo menor.');
                                  return;
                                }
                                fileUrl = await new Promise((resolve) => {
                                  const reader = new FileReader();
                                  reader.onloadend = () => resolve(reader.result as string);
                                  reader.readAsDataURL(newDocFile);
                                });
                              }
                              
                              const existingDocs = formData.attachedDocs || [];
                              const existingSize = existingDocs.reduce((acc, doc) => acc + (doc.url ? doc.url.length : 0), 0);
                              
                              // Aproximadamente 800,000 caracteres base64 = ~800KB 
                              if (existingSize + fileUrl.length > 800000) {
                                alert('⚠️ LIMITE DE ARMAZENAMENTO EXCEDIDO!\\n\\nO limite total para todos os anexos deste colaborador no banco de dados é de aproximadamente 800KB.\\nAdicionar este arquivo ultrapassaria o limite total.\\nPor favor, exclua alguns anexos antigos antes de enviar novos.');
                                return;
                              }

                              const newDoc = {
                                id: \`doc_\${Date.now()}\`,
                                name: \`\${newDocType} - \${newDocName.trim()}\`,
                                type: newDocType,
                                url: fileUrl,
                                date: new Date().toLocaleDateString('pt-BR')
                              };
                              setFormData({
                                ...formData,
                                attachedDocs: [...existingDocs, newDoc]
                              });
                              setNewDocName('');
                              setNewDocFile(null);
                            }}
                            className="bg-royal-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm"
                          >`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
