const fs = require('fs');
const file = 'src/components/InternalPortal.tsx';
let content = fs.readFileSync(file, 'utf8');

const regexes = [
  /<button[^>]*?onClick=\{\(\) => requestAdminDelete\('client'[\s\S]*?<\/button>/g,
  /<button[^>]*?onClick=\{\(\) => requestAdminDelete\('instrument'[\s\S]*?<\/button>/g,
  /<button[^>]*?onClick=\{\(\) => handleDeleteIntake[\s\S]*?<\/button>/g,
  /<button[^>]*?onClick=\{\(\) => requestAdminDelete\('audit_log'[\s\S]*?<\/button>/g,
  /<button[^>]*?onClick=\{\(\) => requestAdminDelete\('report'[\s\S]*?<\/button>/g,
  /<button[^>]*?onClick=\{\(\) => requestAdminDelete\('standard'[\s\S]*?<\/button>/g,
  /<button[^>]*?onClick=\{\(\) => handleDeleteBirthday[\s\S]*?<\/button>/g,
  /<button[^>]*?onClick=\{\(\) => handleDeletePayslip[\s\S]*?<\/button>/g,
  /<button[^>]*?onClick=\{\(\) => handleDeletePhoto[\s\S]*?<\/button>/g,
  /<button[^>]*?onClick=\{\(\) => requestAdminDelete\('training'[\s\S]*?<\/button>/g,
  /<button[^>]*?onClick=\{\(\) => requestAdminDelete\('employee_training'[\s\S]*?<\/button>/g,
  /<button[^>]*?onClick=\{\(\) => requestAdminDelete\('inventory'[\s\S]*?<\/button>/g,
];

let changed = 0;
for (const reg of regexes) {
  content = content.replace(reg, (match) => {
    changed++;
    return `{isUserAdmin && (\n${match}\n)}`;
  });
}

fs.writeFileSync(file, content);
console.log("Success, replaced", changed);
