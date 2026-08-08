const fs = require('fs');
let file = 'src/components/InternalPortal.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// Remove line 3539 (which is index 3538)
lines.splice(3538, 1);
// Insert it after 3539 (which is now 3538)
lines.splice(3539, 0, '          )}');

fs.writeFileSync(file, lines.join('\n'));
