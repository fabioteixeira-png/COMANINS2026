const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

// 1. Change newDocFile state to newDocFiles array
code = code.replace(
  'const [newDocFile, setNewDocFile] = useState<File | null>(null);',
  'const [newDocFiles, setNewDocFiles] = useState<File[]>([]);'
);

// 2. Change the label
code = code.replace(
  '{newDocFile ? newDocFile.name : \'Selecionar arquivo...\'}',
  '{newDocFiles.length > 0 ? `${newDocFiles.length} arquivo(s) selecionado(s)` : \'Selecionar arquivo(s)...\/\'}'
);

// 3. Change the input to multiple
code = code.replace(
  'accept=".pdf,image/*,.doc,.docx"\n                                className="hidden"\n                                onChange={(e) => {\n                                  const file = e.target.files?.[0];\n                                  if (file) {\n                                    if (file.size > 800 * 1024) {\n                                      alert(\'⚠️ ARQUIVO MUITO GRANDE!\\n\\nO arquivo deve ter no máximo 800KB devido às limitações do sistema.\\nPor favor, comprima o arquivo e tente novamente.\');\n                                      return;\n                                    }\n                                    setNewDocFile(file);\n                                    if (!newDocName) {\n                                      setNewDocName(file.name.replace(/\\.[^/.]+$/, \'\'));\n                                    }\n                                  }\n                                }}',
  `accept=".pdf,image/*,.doc,.docx"
                                className="hidden"
                                multiple
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  if (files.length > 0) {
                                    const validFiles = files.filter(f => {
                                      if (f.size > 1000 * 1024) {
                                        alert('⚠️ ARQUIVO MUITO GRANDE!\\n\\nO arquivo ' + f.name + ' ultrapassa 1MB e será ignorado.');
                                        return false;
                                      }
                                      return true;
                                    });
                                    setNewDocFiles([...newDocFiles, ...validFiles]);
                                    if (!newDocName && validFiles.length > 0) {
                                      setNewDocName(validFiles[0].name.replace(/\\.[^/.]+$/, ''));
                                    }
                                  }
                                }}`
);

// 4. Change the submit logic
const targetSubmit = `                              if (!newDocFile) {
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
                              }`;

const replaceSubmit = `                              if (newDocFiles.length === 0) {
                                alert('Por favor, selecione pelo menos um arquivo.');
                                return;
                              }
                              
                              try {
                                const savedDocs = [];
                                for (let i = 0; i < newDocFiles.length; i++) {
                                  const f = newDocFiles[i];
                                  let fileUrl = "";
                                  if (f.type.startsWith('image/')) {
                                    fileUrl = await compressImageToWebResolution(f, 1200, 1200, 0.7);
                                  } else {
                                    fileUrl = await new Promise((resolve) => {
                                      const reader = new FileReader();
                                      reader.onloadend = () => resolve(reader.result as string);
                                      reader.readAsDataURL(f);
                                    });
                                  }

                                  const docName = newDocFiles.length > 1 ? \`\${newDocType} - \${newDocName.trim()} (\${i+1})\` : \`\${newDocType} - \${newDocName.trim()}\`;
                                  const newDoc = {
                                    userId: selectedUser.id,
                                    name: docName,
                                    type: newDocType,
                                    url: fileUrl,
                                    date: new Date().toLocaleDateString('pt-BR')
                                  };
                                  
                                  const savedDoc = await addEmployeeDocument(newDoc);
                                  savedDocs.push(savedDoc);
                                }
                                
                                setUserDocuments([...userDocuments, ...savedDocs]);
                                setNewDocName('');
                                setNewDocFiles([]);
                                alert('Documentos anexados com sucesso!');
                              } catch (err) {
                                alert("Erro ao salvar documento: " + err);
                              }`;

code = code.replace(targetSubmit, replaceSubmit);

fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
