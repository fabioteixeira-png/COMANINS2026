const fs = require('fs');
let file = 'src/components/InternalPortal.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// Remove line 10170 (which is index 10169)
lines.splice(10169, 1);
// Insert it after 10168 (which is now index 10168, so we insert at 10168, wait...
// index 10167 is 10168 (</button>)
lines.splice(10168, 0, '                                  )}');

fs.writeFileSync(file, lines.join('\n'));
