const fs = require('fs');
let file = 'src/components/InternalPortal.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const inserts = {
  3538: '          )}', // Line 3538 has </button>, so insert after it
  3552: '                  )}',
  10162: '                                  )}', // Wait, line 10140 error might be because I missed the )}.
  12938: '                )}', 
};

for (const [lineNumStr, insertStr] of Object.entries(inserts)) {
  const i = parseInt(lineNumStr) - 1; // 0-indexed
  lines[i] = lines[i] + '\n' + insertStr;
}

fs.writeFileSync(file, lines.join('\n'));
console.log("Fixed final lines");
