const fs = require('fs');

function fix(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace `{isUserAdmin && (\n<button... \n)}` with `<>{isUserAdmin && (\n<button... \n)}</>`
  // Be careful with the closing `)}`
  
  content = content.replace(/\{isUserAdmin && \([\s\S]*?<\/button>\s*\)\}/g, (match) => {
    // Check if it's already wrapped in <>
    // Actually, easier to just strip the `{isUserAdmin && (` and replace with `isUserAdmin ? ... : null`?
    // Let's just strip the curly braces and wrap in <>
    return '<>' + match + '</>';
  });

  // What about `{editingIntakeId ? (isUserAdmin ? ... : <div/>) : <div />}` which I already replaced?
  
  fs.writeFileSync(file, content);
}

fix('src/components/InternalPortal.tsx');
fix('src/components/EmployeeManagement.tsx');
console.log("Done");
