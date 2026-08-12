const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  "const u = { id: doc.id, ...doc.data() };",
  "const u = { id: doc.id, ...doc.data() } as any;"
);
fs.writeFileSync('server.ts', code);
