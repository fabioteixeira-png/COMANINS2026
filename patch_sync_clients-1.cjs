const fs = require('fs');

let content = fs.readFileSync('src/lib/firebase.ts', 'utf-8');

content = content.replace(
  "const q = query(collection(db, 'clients'), limit(25));",
  "const q = query(collection(db, 'clients'));"
);

fs.writeFileSync('src/lib/firebase.ts', content);
console.log("Patched syncClients limits.");
