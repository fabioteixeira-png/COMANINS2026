const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `"unidade": "String - Unidade geral"`;
const replacement = `"cliente": "String - Nome do cliente",
            "unidade": "String - Unidade geral"`;

if (code.includes(target) && !code.includes('"cliente"')) {
  code = code.replace(target, replacement);
  fs.writeFileSync('server.ts', code);
  console.log('server.ts patched');
}
