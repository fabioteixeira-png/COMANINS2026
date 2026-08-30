const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');
code = code.replace(/monthlyPrice: number;/g, 'monthlyPrice: number;\n  renewalPrice?: number;');
fs.writeFileSync('src/types.ts', code);
