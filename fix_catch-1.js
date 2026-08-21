import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  'console.error("com o JSON da conta de serviço (Service Account) do Firebase.\\\\n\\\\n");',
  'console.error("com os valores da conta de serviço (Service Account) do Firebase.\\\\n\\\\n");'
);

fs.writeFileSync('server.ts', code);
