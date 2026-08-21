const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

const targetStr = `const recipients = "comercial@comanins.com.br, fabio.teixeira@comanins.com.br, manutencao@comanins.com.br";`;
const newStr = `const recipients = "isidro.teixeira@comanins.com.br, comercial@comanins.com.br, manutencao@comanins.com.br, fabio.teixeira@comanins.com.br";`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('server.ts', content);
console.log("Patched server.ts recipients");
