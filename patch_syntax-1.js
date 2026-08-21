import fs from 'fs';
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

code = code.replace(/if \(\s*\!window\.confirm\(\s*if \(\s*\!window\.confirm\(/g, "if (!window.confirm(");
fs.writeFileSync('src/components/InternalPortal.tsx', code);
