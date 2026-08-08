const fs = require('fs');
const file = 'src/components/EmployeeManagement.tsx';
let content = fs.readFileSync(file, 'utf8');

// First add isUserAdmin computation
const isUserAdminStr = `  const isUserAdmin = currentUser?.permissionLevel === 'Administrador' || (!currentUser?.permissionLevel && (currentUser?.role === 'Administrador' || currentUser?.role === 'Admin' || currentUser?.role === 'admin' || currentUser?.role === 'master' || currentUser?.role === 'Diretor'));\n`;
if (!content.includes('const isUserAdmin =')) {
  content = content.replace(
    /const EmployeeManagement: React.FC<EmployeeManagementProps> = \(([\s\S]*?)\) => \{/,
    (match) => `${match}\n${isUserAdminStr}`
  );
}

const regexes = [
  /<button[^>]*?onClick=\{\(\) => \{(?:[^}]*?)requestAdminDelete\('user'[\s\S]*?<\/button>/g,
  /<button[^>]*?onClick=\{\(\) => \{(?:[^}]*?)requestAdminDelete\('medical_exam'[\s\S]*?<\/button>/g,
  /<button[^>]*?onClick=\{\(\) => \{(?:[^}]*?)requestAdminDelete\('exam_attachment'[\s\S]*?<\/button>/g,
];

let changed = 0;
for (const reg of regexes) {
  content = content.replace(reg, (match) => {
    changed++;
    return `{isUserAdmin && (\n${match}\n)}`;
  });
}

// Since EmployeeManagement might not use requestAdminDelete everywhere, let's just search for Trash2
const trash2Regex = /<button[^>]*?onClick=\{[^\}]*\}[^>]*?>\s*<Trash2[\s\S]*?<\/button>/g;
content = content.replace(trash2Regex, (match) => {
    // Check if it's already wrapped by manually checking the surrounding code (simplistic check)
    // Actually just wrap it. Wait, some buttons are conditionally wrapped?
    if (match.includes('isUserAdmin &&')) return match; 
    changed++;
    return `{isUserAdmin && (\n${match}\n)}`;
});

fs.writeFileSync(file, content);
console.log("Success, replaced", changed);
