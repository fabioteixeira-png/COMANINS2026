const fs = require('fs');

function processFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\{isUserAdmin && \(\s*\{isUserAdmin && \(\s*(<button[\s\S]*?<\/button>)\s*\)\}\s*\)\}/g, '{isUserAdmin && (\n$1\n)}');
  content = content.replace(/\{isUserAdmin && \(\{isUserAdmin && \((<button[\s\S]*?<\/button>)\)\}\)/g, '{isUserAdmin && ($1)}');
  fs.writeFileSync(file, content);
}

processFile('src/components/InternalPortal.tsx');
processFile('src/components/EmployeeManagement.tsx');
console.log("Success");
