const fs = require('fs');

let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

const targetStr = `  const setActiveTab = (t: any) => {
    setRawActiveTab(t);
    setIsMobileMenuOpen(false);
  };`;

const newStr = `  const setActiveTab = (t: any) => {
    if (currentUser && !isUserAdmin) {
      const hasPendingPayslip = payslips.some(p => 
        p.employeeId === currentUser.id && 
        !p.visualized && 
        Math.floor((Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)) >= 11
      );
      if (hasPendingPayslip && (t !== "colaboradores" || rhSubTab !== "contra_cheques" || activePayslipTab !== "meus")) {
        alert("Acesso Bloqueado: Você possui documentação pessoal aguardando visualização há mais de 11 dias. Por favor, visualize os documentos pendentes para liberar o portal.");
        setRawActiveTab("colaboradores");
        setRhSubTab("contra_cheques");
        setActivePayslipTab("meus");
        setIsMobileMenuOpen(false);
        return;
      }
    }
    
    setRawActiveTab(t);
    setIsMobileMenuOpen(false);
  };`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Patched setActiveTab");
