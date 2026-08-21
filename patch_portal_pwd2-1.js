import fs from 'fs';
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

const regex1 = /let isAdminValid =[\s\S]*?if \(\!isAdminValid\) {\n      setBackupRestoreError\(\n        "Senha do Administrador incorreta\. Ação não autorizada\.",\n      \);\n      return;\n    }/;

const newCode1 = `
    const res = await fetch('/api/auth/verify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser?.username, password: backupRestorePassword })
    });
    const data = await res.json();
    if (!data.valid) {
      setBackupRestoreError("Senha do Administrador incorreta. Ação não autorizada.");
      return;
    }
`;

code = code.replace(regex1, newCode1.trim());
fs.writeFileSync('src/components/InternalPortal.tsx', code);
console.log("InternalPortal backup pwd updated");
