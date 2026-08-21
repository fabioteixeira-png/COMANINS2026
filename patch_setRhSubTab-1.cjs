const fs = require('fs');

let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

const targetStr = `              setActiveRhTab={(tab) => {
                setRhSubTab(tab);
                setActiveTab("colaboradores");
              }}`;

const newStr = `              setActiveRhTab={(tab) => {
                if (currentUser && !isUserAdmin) {
                  const hasPendingPayslip = payslips.some(p => 
                    p.employeeId === currentUser.id && 
                    !p.visualized && 
                    Math.floor((Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)) >= 11
                  );
                  if (hasPendingPayslip && (tab !== "contra_cheques" || activePayslipTab !== "meus")) {
                    alert("Acesso Bloqueado: Você possui documentação pessoal aguardando visualização há mais de 11 dias. Por favor, visualize os documentos pendentes para liberar o portal.");
                    setRhSubTab("contra_cheques");
                    setActivePayslipTab("meus");
                    return;
                  }
                }
                setRhSubTab(tab);
                setActiveTab("colaboradores");
              }}`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Patched setRhSubTab");
