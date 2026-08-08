const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

content = content.replace(/\\n/g, "\n");
fs.writeFileSync('src/components/InternalPortal.tsx', content);
