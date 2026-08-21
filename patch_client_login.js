import fs from 'fs';
let code = fs.readFileSync('src/components/LoginScreen.tsx', 'utf-8');

code = code.replace(
  `          } else {
            setErrorMsg('CNPJ ou senha incorretos.');
          }`,
  `          } else if (res.ok && !data.valid) {
            setErrorMsg('CNPJ ou senha incorretos.');
          } else {
            setErrorMsg('Não foi possível validar sua conta antiga para migração. Tente novamente ou contate o administrador.');
          }`
);

fs.writeFileSync('src/components/LoginScreen.tsx', code);
