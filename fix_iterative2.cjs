const fs = require('fs');
let file = 'src/components/InternalPortal.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// Remove line 3554 (which is index 3553)
lines.splice(3553, 1);

fs.writeFileSync(file, lines.join('\n'));
