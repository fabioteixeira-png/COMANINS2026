const fs = require('fs');
let code = fs.readFileSync('src/components/ClientPortal.tsx', 'utf8');

code = code.replace(/client\.companyName/g, 'client.name');

fs.writeFileSync('src/components/ClientPortal.tsx', code);
