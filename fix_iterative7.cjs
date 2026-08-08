const fs = require('fs');
let file = 'src/components/InternalPortal.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

lines.splice(12949, 1);

fs.writeFileSync(file, lines.join('\n'));
