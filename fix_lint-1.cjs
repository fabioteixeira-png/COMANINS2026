const fs = require('fs');

// Fix FinanceContratos
let code1 = fs.readFileSync('src/components/finance/FinanceContratos.tsx', 'utf8');
code1 = code1.replace(
  "requestAdminDelete('finance_contract', contract.id, \`Contrato: \${contract.title}\`);",
  "requestAdminDelete('finance_contract', contract.id, \`Contrato: \${contract.contractNumber} - \${contract.clientName}\`);"
);
fs.writeFileSync('src/components/finance/FinanceContratos.tsx', code1);

// Fix FinanceMedicoes
let code2 = fs.readFileSync('src/components/finance/FinanceMedicoes.tsx', 'utf8');
code2 = code2.replace(
  "requestAdminDelete('finance_measurement', med.id, \`Medição: \${med.title}\`);",
  "requestAdminDelete('finance_measurement', med.id, \`Medição: \${med.contractNumber} (\${med.period})\`);"
);
fs.writeFileSync('src/components/finance/FinanceMedicoes.tsx', code2);
