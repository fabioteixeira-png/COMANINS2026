const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

const target2 = `              {/* GERENCIAR CONTRA-CHEQUES (RH / Admin) */}
              {!isLimitedRole && activePayslipTab === 'gerenciar' && (
                <div className="space-y-6">`;

const replacement2 = `              {/* GERENCIAR CONTRA-CHEQUES (RH / Admin) */}
              {(isUserAdmin || currentUser?.role === 'Recursos Humanos (RH)' || currentUser?.role === 'Financeiro') && activePayslipTab === 'gerenciar' && (
                <div className="space-y-6">`;

if (code.includes(target2)) {
  code = code.replace(target2, replacement2);
  fs.writeFileSync('src/components/InternalPortal.tsx', code);
  console.log("Fixed target2");
} else {
  console.log("Target 2 not found");
}
