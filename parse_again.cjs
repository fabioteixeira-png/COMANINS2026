const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

// The file has syntax errors now since around 1865. Let's see what it is there.
const lines = content.split('\n');
console.log(lines.slice(1855, 1875).join('\n'));
