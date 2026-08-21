import fs from 'fs';
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

const regex = /let isAdminValid = false;[\s\S]*?if \(\!isAdminValid\) {\n      alert\(\n        "Senha incorreta! Apenas administradores autorizados possuem permissão para limpar o banco de dados\.",\n      \);\n      return;\n    }/;

const newCode = `
    const res = await fetch('/api/auth/verify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser?.username, password: typedPassword })
    });
    const data = await res.json();
    
    if (!data.valid) {
      alert("Senha incorreta! Apenas administradores autorizados possuem permissão para limpar o banco de dados.");
      return;
    }
`;

code = code.replace(regex, newCode.trim());
fs.writeFileSync('src/components/InternalPortal.tsx', code);
console.log("InternalPortal updated");
