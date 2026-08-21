const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

// 1. Add types to deleteTarget and requestAdminDelete
const typeReplacements = [
  '| "rnc"',
  '| "rnc"\n      | "finance_transaction"\n      | "finance_contract"\n      | "finance_measurement"\n      | "finance_bank"\n      | "finance_category"'
];
code = code.split(typeReplacements[0]).join(typeReplacements[1]);

fs.writeFileSync('src/components/InternalPortal.tsx', code);
