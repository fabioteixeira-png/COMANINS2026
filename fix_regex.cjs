const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

content = content.replace(/                    <\/div>map\(\(opt, i\) => \([\s\S]*?<\/div>/, '                    </div>');

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Success");
