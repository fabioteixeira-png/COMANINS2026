const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

const target = `                              if (newDocFiles.length === 0) {
                                alert('Por favor, selecione pelo menos um arquivo.');
                                return;
                              }`;

const replace = `                              if (newDocFiles.length === 0) {
                                alert('Por favor, selecione pelo menos um arquivo.');
                                return;
                              }
                              const empId = selectedUser?.id || formData.id || formData.username;
                              if (!empId) {
                                alert('Por favor, informe a Matrícula ou Nome de Usuário primeiro (aba 1 ou 7) ou salve o cadastro antes de anexar documentos.');
                                return;
                              }`;

code = code.replace(target, replace);

const target2 = `const newDoc = {
                                    userId: selectedUser.id,`;

const replace2 = `const newDoc = {
                                    userId: empId,`;

code = code.replace(target2, replace2);

fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
