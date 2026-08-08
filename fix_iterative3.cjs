const fs = require('fs');
let file = 'src/components/InternalPortal.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// Remove line 10164 (which is index 10163)
lines.splice(10163, 1);
// Insert it after 10170 (which is now 10169, wait, if I remove one line, it becomes 10169, but after the </button> it's index 10168)
lines.splice(10169, 0, '                                  )}');

fs.writeFileSync(file, lines.join('\n'));
