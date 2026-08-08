const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

// I saw an error at 2051: TS1005: ')' expected.
// Let's print out what is around there.
const lines = content.split('\n');
console.log("Around 2051:");
console.log(lines.slice(2045, 2055).join('\n'));
