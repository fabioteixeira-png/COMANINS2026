const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace('"unidade": "String - Unidade (local)"', '"cliente": "String - Cliente",\n  "unidade": "String - Unidade (local)"');
fs.writeFileSync('server.ts', code);
console.log('patched server.ts');
