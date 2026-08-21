import fs from 'fs';
let code = fs.readFileSync('src/components/LoginScreen.tsx', 'utf-8');

code = code.replace(
  `          const data = await res.json();
          if (res.ok && data.valid) {
            let userDoc = internalUsers.find(u => u.username.toLowerCase() === cleanUser);
            if (userDoc) {`,
  `          const data = await res.json();
          if (res.ok && data.valid) {
            let userDoc = data.user;
            if (userDoc) {`
);

code = code.replace(
  `          const data = await res.json();
          if (res.ok && data.valid) {
            let clientDoc = clients.find(c => c.cnpj?.replace(/\\D/g, '') === cleanCnpj);
            if (clientDoc) {`,
  `          const data = await res.json();
          if (res.ok && data.valid) {
            let clientDoc = data.user;
            if (clientDoc) {`
);

fs.writeFileSync('src/components/LoginScreen.tsx', code);
