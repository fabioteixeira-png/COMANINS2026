const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const useEffectBlock = `  useEffect(() => {
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

content = content.replace(useEffectBlock, '');

const insertTarget = `  const [activePayslipTab, setActivePayslipTab] = useState<
    "meus" | "gerenciar"
  >("meus");`;

content = content.replace(insertTarget, insertTarget + '\n\n' + useEffectBlock);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
