const fs = require('fs');

let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

const targetStr = `                  <button
                    onClick={() => setRhSubTab("cadastro")}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-sm cursor-pointer"
                  >`;

const newStr = `                  <button
                    onClick={() => {
                      if (currentUser && !isUserAdmin) {
                        const hasPendingPayslip = payslips.some(p => 
                          p.employeeId === currentUser.id && 
                          !p.visualized && 
                          Math.floor((Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)) >= 11
                        );
                        if (hasPendingPayslip) {
                          alert("Acesso Bloqueado: Você possui documentação pessoal aguardando visualização há mais de 11 dias. Por favor, visualize os documentos pendentes para liberar o portal.");
                          return;
                        }
                      }
                      setRhSubTab("cadastro");
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-sm cursor-pointer"
                  >`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Patched Voltar button");
