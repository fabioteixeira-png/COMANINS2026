const fs = require('fs');
let content = fs.readFileSync('src/components/InternalCommunication.tsx', 'utf-8');

const oldEmails = '"financeiro@comanins.com.br"';
const newEmails = '"financeiro@comanins.com.br, fabio.teixeira@comanins.com.br, isidro.teixeira@comanins.com.br, solange.teixeira@comanins.com.br, manutencao@comanins.com.br"';

content = content.replace(
  /to: "financeiro@comanins.com.br"/g,
  `to: ${newEmails}`
);

const oldText = 'Os chamados de comunicação interna são encaminhados para <strong>financeiro@comanins.com.br</strong>.';
const newText = 'Os chamados de comunicação interna são encaminhados para <strong>financeiro, fabio, isidro, solange e manutenção (@comanins.com.br)</strong>.';

content = content.replace(oldText, newText);

fs.writeFileSync('src/components/InternalCommunication.tsx', content);
console.log("Patched InternalCommunication.tsx");
