const fs = require('fs');
let file = 'src/components/InternalPortal.tsx';
let content = fs.readFileSync(file, 'utf8');

// fix {editingIntakeId ? ( {isUserAdmin && ( <button ... /> )} ) : <div />}
content = content.replace(/\{editingIntakeId \? \(\s*\{isUserAdmin && \((<button[\s\S]*?<\/button>)\)\}\s*\) : <div \/>\}/g, 
  '{editingIntakeId ? (isUserAdmin ? $1 : <div/>) : <div />}');

fs.writeFileSync(file, content);
console.log("Fixed syntax");
