const fs = require('fs');
let file = 'src/components/InternalPortal.tsx';
let content = fs.readFileSync(file, 'utf8');

const issues = [
  /<button[\s\S]*?onClick=\{\(e\) => \{\s*e.stopPropagation\(\);\s*handleDeleteIntake\([\s\S]*?<\/button>\)\}/g,
  /<button[\s\S]*?onClick=\{\(\) => handleDeleteBirthday\([\s\S]*?<\/button>\)\}/g,
  /<button[\s\S]*?onClick=\{\(e\) => \{\s*e.stopPropagation\(\);\s*handleDeleteBirthday\([\s\S]*?<\/button>\)\}/g,
];

content = content.replace(/<\/button>\)\}/g, '</button>');

fs.writeFileSync(file, content);
console.log("Fixed remaining");
