const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceManagement.tsx', 'utf8');

code = code.replace(
  'export default function FinanceManagement() {',
  `interface FinanceManagementProps {
  requestAdminDelete?: (type: string, id: string, name: string) => void;
}
export default function FinanceManagement({ requestAdminDelete }: FinanceManagementProps) {`
);

// Pass requestAdminDelete to children
code = code.replace(
  '<ContasReceber />',
  '<ContasReceber requestAdminDelete={requestAdminDelete} />'
);
code = code.replace(
  '<ContasPagar />',
  '<ContasPagar requestAdminDelete={requestAdminDelete} />'
);
code = code.replace(
  '<FinanceContratos />',
  '<FinanceContratos requestAdminDelete={requestAdminDelete} />'
);
// FinanceMedicoes is likely passed as child or rendered. Let's find it.
code = code.replace(
  '<FinanceMedicoes />',
  '<FinanceMedicoes requestAdminDelete={requestAdminDelete} />'
);
// CadastrosFinanceiros
code = code.replace(
  '<CadastrosFinanceiros />',
  '<CadastrosFinanceiros requestAdminDelete={requestAdminDelete} />'
);

fs.writeFileSync('src/components/FinanceManagement.tsx', code);
