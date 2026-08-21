import fs from 'fs';
let code = fs.readFileSync('src/components/LoginScreen.tsx', 'utf-8');

// For internal login
code = code.replace(
  `          const res = await fetch('/api/auth/legacy-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: cleanUser, password: cleanPass, type: 'internal' })
          });
          const data = await res.json();
          if (res.ok && data.valid) {`,
  `          const res = await fetch('/api/auth/legacy-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: cleanUser, password: cleanPass, type: 'internal' })
          });
          
          if (!res.ok) {
            setErrorMsg('Não foi possível conectar ao servidor para validar a credencial antiga. Tente novamente ou contate o administrador.');
            return;
          }
          
          const data = await res.json();
          if (res.ok && data.valid) {`
);

// For client login
code = code.replace(
  `          const res = await fetch('/api/auth/legacy-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cnpj: cleanCnpj, password: cleanPass, type: 'client' })
          });
          const data = await res.json();
          if (res.ok && data.valid) {`,
  `          const res = await fetch('/api/auth/legacy-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cnpj: cleanCnpj, password: cleanPass, type: 'client' })
          });
          
          if (!res.ok) {
            setErrorMsg('Não foi possível conectar ao servidor para validar a credencial antiga. Tente novamente ou contate o administrador.');
            return;
          }
          
          const data = await res.json();
          if (res.ok && data.valid) {`
);

fs.writeFileSync('src/components/LoginScreen.tsx', code);
