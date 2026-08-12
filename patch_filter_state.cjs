const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target = `  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [activePayslipTab, setActivePayslipTab] = useState<
    "meus" | "gerenciar"
  >("meus");`;

const replace = `  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [activePayslipTab, setActivePayslipTab] = useState<
    "meus" | "gerenciar"
  >("meus");
  const [payslipMonthFilter, setPayslipMonthFilter] = useState<string>("all");`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/InternalPortal.tsx', code);
