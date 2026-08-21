const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const target = `    const q = query(collection(db, "internal_tickets"), limit(25));`;
const replace = `    const q = query(collection(db, "internal_tickets"));`;

code = code.replace(target, replace);
fs.writeFileSync('src/lib/firebase.ts', code);
