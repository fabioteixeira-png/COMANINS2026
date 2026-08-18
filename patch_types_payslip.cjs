const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf-8');

content = content.replace('  visualizedAt?: string;', '  visualizedAt?: string;\n  emailSent7Days?: boolean;\n  emailSent10Days?: boolean;');

fs.writeFileSync('src/types.ts', content);
