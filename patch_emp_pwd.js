import fs from 'fs';
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf-8');

const regex = /let isAdminValid = false;[\s\S]*?if \(\!isAdminValid\) {\n      alert\("Senha incorreta\."\);\n      return;\n    }/;

const newCode = `
    const res = await fetch('/api/auth/verify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser?.username, password: pwd.trim() })
    });
    const data = await res.json();
    if (!data.valid) {
      alert("Senha incorreta.");
      return;
    }
`;

code = code.replace(regex, newCode.trim());
fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
console.log("EmployeeManagement updated");
