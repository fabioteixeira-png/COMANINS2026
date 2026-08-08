const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

content = content.replace(/map\(\(opt, i\) => \([\s\S]*?<\/div>\s*<\/div>/, '');

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Success");
