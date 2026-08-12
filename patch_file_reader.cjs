const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

const target = `          fileDataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(newNrCertificateFile);
          });`;

const replacement = `          fileDataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = (e) => reject(new Error("Erro ao ler o arquivo."));
            reader.readAsDataURL(newNrCertificateFile);
          });`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
