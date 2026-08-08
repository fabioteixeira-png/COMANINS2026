const fs = require('fs');

function processFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  const trash2Regex = /<button[^>]*?>[^<]*(?:<span[^>]*?>.*?<\/span>[^<]*)?<Trash2[\s\S]*?<\/button>|<button[^>]*?onClick=\{[^\}]*\}[^>]*?>[\s\S]*?<Trash2[\s\S]*?<\/button>/g;
  
  let changed = 0;
  content = content.replace(trash2Regex, (match) => {
      if (match.includes('isUserAdmin &&')) return match; 
      if (match.includes('Confirmar Exclusão')) return match; // skip modal confirmation, modal should be hidden anyway
      changed++;
      return `{isUserAdmin && (\n${match}\n)}`;
  });
  
  fs.writeFileSync(file, content);
  console.log(file, "Success, replaced", changed);
}

processFile('src/components/InternalPortal.tsx');
processFile('src/components/EmployeeManagement.tsx');
