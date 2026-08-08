const fs = require('fs');
let file = 'src/components/InternalPortal.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// Remove line 10176 (index 10175)
lines.splice(10175, 1);

fs.writeFileSync(file, lines.join('\n'));
