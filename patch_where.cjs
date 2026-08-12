const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

code = code.replace("import {", "import { where,");
fs.writeFileSync('src/lib/firebase.ts', code);
