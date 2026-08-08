const fs = require('fs');
let file = 'src/components/InternalPortal.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// Remove line 12940 (index 12939)
lines.splice(12939, 1);
// Insert it at index 12938
lines.splice(12938, 0, '                )}');

fs.writeFileSync(file, lines.join('\n'));
