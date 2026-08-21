import fs from 'fs';
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

const regex2 = /const adminUser = internalUsers\.find\(u => \(u\.role === "Administrador" \|\| u\.role === "admin" \|\| u\.role === "master" \|\| u\.permissionLevel === "Administrador"\) && u\.password === afterHoursPassword\);\s+if \(\!adminUser\) {\n                  alert\("Senha de administrador incorreta\."\);\n                  return;\n                }/;

const newCode2 = `
                const res = await fetch('/api/auth/verify-admin', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ username: currentUser?.username, password: afterHoursPassword })
                });
                const data = await res.json();
                if (!data.valid) {
                  alert("Senha de administrador incorreta.");
                  return;
                }
                const adminUser = { name: "Administrador Autorizado" };
`;

code = code.replace(regex2, newCode2.trim());
fs.writeFileSync('src/components/InternalPortal.tsx', code);
console.log("InternalPortal afterHours pwd updated");
