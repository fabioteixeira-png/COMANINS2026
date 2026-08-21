import fs from 'fs';
let code = fs.readFileSync('src/components/LoginScreen.tsx', 'utf-8');

code = code.replace(
  `          const data = await res.json();
          if (data.valid) {
            const userDoc = internalUsers.find(u => u.username.toLowerCase() === cleanUser);`,
  `          const data = await res.json();
          if (res.ok && data.valid) {
            let userDoc = internalUsers.find(u => u.username.toLowerCase() === cleanUser);`
);

code = code.replace(
  `          } else {
            setErrorMsg('Usuário ou senha interna incorretos. Por favor, verifique suas credenciais.');
          }`,
  `          } else if (res.ok && !data.valid) {
            setErrorMsg('Usuário ou senha interna incorretos. Por favor, verifique suas credenciais.');
          } else {
            setErrorMsg('Não foi possível validar sua conta antiga para migração. Tente novamente ou contate o administrador.');
          }`
);

// Do the same for Client login
code = code.replace(
  `          const data = await res.json();
          if (data.valid) {
            const clientDoc = clients.find(c => c.cnpj?.replace(/\\D/g, '') === cleanCnpj);`,
  `          const data = await res.json();
          if (res.ok && data.valid) {
            let clientDoc = clients.find(c => c.cnpj?.replace(/\\D/g, '') === cleanCnpj);`
);

code = code.replace(
  `          } else {
            setErrorMsg('CNPJ ou senha incorretos. Por favor, verifique suas credenciais.');
          }`,
  `          } else if (res.ok && !data.valid) {
            setErrorMsg('CNPJ ou senha incorretos. Por favor, verifique suas credenciais.');
          } else {
            setErrorMsg('Não foi possível validar sua conta antiga para migração. Tente novamente ou contate o administrador.');
          }`
);

fs.writeFileSync('src/components/LoginScreen.tsx', code);
