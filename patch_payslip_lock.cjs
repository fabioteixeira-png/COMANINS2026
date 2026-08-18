const fs = require('fs');

let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

const targetStr = `  useEffect(() => {
    if (!currentUser || isUserAdmin) return;
    
    if (checkIsAfterHours() && !afterHoursBypass) {
      const isAllowed = activeTab === "colaboradores" && rhSubTab === "contra_cheques";
      
      if (!isAllowed) {
        setAfterHoursTargetTab(activeTab);
        setAfterHoursTargetSubTab(rhSubTab);
        
        setRawActiveTab("colaboradores");
        setRhSubTab("contra_cheques");
        setActivePayslipTab("meus");
        setShowAfterHoursModal(true);
      }
    }
  }, [activeTab, rhSubTab, currentUser, isUserAdmin, afterHoursBypass]);`;

const newStr = `  useEffect(() => {
    if (!currentUser || isUserAdmin) return;
    
    // Check pending 11 days payslips first
    const hasPendingPayslip = payslips.some(p => 
      p.employeeId === currentUser.id && 
      !p.visualized && 
      Math.floor((Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24)) >= 11
    );

    if (hasPendingPayslip) {
       const isAllowed = activeTab === "colaboradores" && rhSubTab === "contra_cheques" && activePayslipTab === "meus";
       if (!isAllowed) {
         setRawActiveTab("colaboradores");
         setRhSubTab("contra_cheques");
         setActivePayslipTab("meus");
       }
       return; // Stop checking after hours if they are locked by payslips
    }

    if (checkIsAfterHours() && !afterHoursBypass) {
      const isAllowed = activeTab === "colaboradores" && rhSubTab === "contra_cheques";
      
      if (!isAllowed) {
        setAfterHoursTargetTab(activeTab);
        setAfterHoursTargetSubTab(rhSubTab);
        
        setRawActiveTab("colaboradores");
        setRhSubTab("contra_cheques");
        setActivePayslipTab("meus");
        setShowAfterHoursModal(true);
      }
    }
  }, [activeTab, rhSubTab, activePayslipTab, payslips, currentUser, isUserAdmin, afterHoursBypass]);

  // Background check for email notifications
  useEffect(() => {
    if (!payslips.length) return;
    
    payslips.forEach(async (p) => {
      if (p.visualized) return;
      
      const diffTime = Date.now() - new Date(p.createdAt).getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 10 && !p.emailSent10Days) {
         // simulate send email to fabio
         console.log(\`[EMAIL ENVIADO para fabio.teixeira@comanins.com.br]: O colaborador \${p.employeeName} não visualizou a documentação pessoal após 10 dias.\`);
         try {
           await updatePayslipDoc(p.id, { emailSent10Days: true, emailSent7Days: true });
         } catch(e) {}
      } else if (diffDays >= 7 && !p.emailSent7Days) {
         // simulate send email to employee
         console.log(\`[EMAIL ENVIADO para \${p.employeeName}]: Sua "Documentação Pessoal" está aguardando visualização.\`);
         try {
           await updatePayslipDoc(p.id, { emailSent7Days: true });
         } catch (e) {}
      }
    });
  }, [payslips]);
`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Patched locking logic and email dispatch");
