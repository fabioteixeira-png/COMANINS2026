const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target = `  const [activeTab, setRawActiveTab] = useState<any>("dashboard");
  const [accessAuditLogs, setAccessAuditLogs] = useState<AccessAuditLog[]>([]);
  const [showAfterHoursModal, setShowAfterHoursModal] = useState(false);
  const [afterHoursTargetTab, setAfterHoursTargetTab] = useState("");
  const [afterHoursTargetSubTab, setAfterHoursTargetSubTab] = useState("");
  const [afterHoursPassword, setAfterHoursPassword] = useState("");
  const [afterHoursJustification, setAfterHoursJustification] = useState("");
  const [afterHoursBypass, setAfterHoursBypass] = useState(false);

  const checkIsAfterHours = () => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    return (h > 17 || (h === 17 && m >= 30)) || (h < 7);
  };



  const setActiveTab = (t: any) => {
    setRawActiveTab(t);
  };

  const [rhSubTab, setRhSubTab] = useState<
    | "cadastro"
    | "alertas"
    | "aniversarios"
    | "treinamentos"
    | "exames"
    | "contra_cheques"
  >("cadastro");
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [activePayslipTab, setActivePayslipTab] = useState<
    "meus" | "gerenciar"
  >("meus");

  useEffect(() => {
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

const replacement = `  const checkIsAfterHours = () => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    return (h > 17 || (h === 17 && m >= 30)) || (h < 7);
  };

  const initIsRestricted = 
    checkIsAfterHours() &&
    !(
      currentUser?.permissionLevel === "Administrador" ||
      (!currentUser?.permissionLevel &&
        (currentUser?.role === "Administrador" ||
          currentUser?.role === "Admin" ||
          currentUser?.role === "admin" ||
          currentUser?.role === "master" ||
          currentUser?.role === "Diretor"))
    );

  const [activeTab, setRawActiveTab] = useState<any>(initIsRestricted ? "colaboradores" : "dashboard");
  const [accessAuditLogs, setAccessAuditLogs] = useState<AccessAuditLog[]>([]);
  const [showAfterHoursModal, setShowAfterHoursModal] = useState(false);
  const [afterHoursTargetTab, setAfterHoursTargetTab] = useState("");
  const [afterHoursTargetSubTab, setAfterHoursTargetSubTab] = useState("");
  const [afterHoursPassword, setAfterHoursPassword] = useState("");
  const [afterHoursJustification, setAfterHoursJustification] = useState("");
  const [afterHoursBypass, setAfterHoursBypass] = useState(false);

  const setActiveTab = (t: any) => {
    setRawActiveTab(t);
  };

  const [rhSubTab, setRhSubTab] = useState<
    | "cadastro"
    | "alertas"
    | "aniversarios"
    | "treinamentos"
    | "exames"
    | "contra_cheques"
  >(initIsRestricted ? "contra_cheques" : "cadastro");
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [activePayslipTab, setActivePayslipTab] = useState<
    "meus" | "gerenciar"
  >("meus");

  useEffect(() => {
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

code = code.replace(target, replacement);
fs.writeFileSync('src/components/InternalPortal.tsx', code);
