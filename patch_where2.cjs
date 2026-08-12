const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

code = code.replace("import { where, initializeApp", "import { initializeApp");
code = code.replace("import {\\n  getFirestore,", "import {\\n  where,\\n  getFirestore,");
fs.writeFileSync('src/lib/firebase.ts', code);
