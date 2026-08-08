const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

const target3 = `          {/* TAB: COLABORADORES & RECURSOS HUMANOS */}
          {activeTab === 'colaboradores' && rhSubTab !== 'contra_cheques' && (
            <EmployeeManagement`;

const replacement3 = `          {/* TAB: COLABORADORES & RECURSOS HUMANOS */}
          {(isUserAdmin || currentUser?.role === 'Recursos Humanos (RH)' || currentUser?.role === 'Financeiro') && activeTab === 'colaboradores' && rhSubTab !== 'contra_cheques' && (
            <EmployeeManagement`;

if (code.includes(target3)) {
  code = code.replace(target3, replacement3);
  fs.writeFileSync('src/components/InternalPortal.tsx', code);
  console.log("Fixed target3");
} else {
  console.log("Target 3 not found");
}
