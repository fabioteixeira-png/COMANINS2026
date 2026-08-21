const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');
code = code.replace("orderBy('date', 'desc'), limit(25)", "");
code = code.replace("const q = query(collection(db, 'savedIntakes'), );", "const q = query(collection(db, 'savedIntakes'));");
fs.writeFileSync('src/lib/firebase.ts', code);
