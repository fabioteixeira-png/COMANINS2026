const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

code = code.replace('| "finance_category",', '| "finance_category"\n      | "intake_devolution",');
fs.writeFileSync('src/components/InternalPortal.tsx', code);
