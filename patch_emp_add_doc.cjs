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
                            }}`;

const replaceStr = `                          <button
                            type="button"
                            onClick={async () => {
                              if (!selectedUser) {
                                alert('Você precisa salvar o colaborador antes de anexar documentos. Crie o cadastro primeiro e depois edite para adicionar os arquivos.');
                                return;
                              }

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
                                fileUrl = await compressImageToWebResolution(newDocFile, 1200, 1200, 0.7);
                              } else {
                                if (newDocFile.size > 1000 * 1024) {
                                  alert('⚠️ ARQUIVO MUITO GRANDE!\\n\\nO arquivo selecionado ultrapassa o limite de 1MB por documento. Por favor, escolha um arquivo menor.');
                                  return;
                                }
                                fileUrl = await new Promise((resolve) => {
                                  const reader = new FileReader();
                                  reader.onloadend = () => resolve(reader.result as string);
                                  reader.readAsDataURL(newDocFile);
                                });
                              }

                              try {
                                const newDoc = {
                                  userId: selectedUser.id,
                                  name: \`\${newDocType} - \${newDocName.trim()}\`,
                                  type: newDocType,
                                  url: fileUrl,
                                  date: new Date().toLocaleDateString('pt-BR')
                                };
                                
                                const savedDoc = await addEmployeeDocument(newDoc);
                                setUserDocuments([...userDocuments, savedDoc]);
                                
                                setNewDocName('');
                                setNewDocFile(null);
                              } catch (err) {
                                alert("Erro ao salvar documento: " + err);
                              }
                            }}`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
