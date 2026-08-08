const fs = require('fs');

function revert(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/<>\s*\{isUserAdmin && \(\s*(<button[\s\S]*?<\/button>)\s*\)\}\s*<\/>/g, '$1');
  content = content.replace(/\{isUserAdmin && \(\s*(<button[\s\S]*?<\/button>)\s*\)\}/g, '$1');
  fs.writeFileSync(file, content);
}

revert('src/components/InternalPortal.tsx');
revert('src/components/EmployeeManagement.tsx');
console.log("Reverted");
