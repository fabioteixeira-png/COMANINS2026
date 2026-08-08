const fs = require('fs');

function addHidden(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace: <button ... onClick={() => requestAdminDelete ... >
  content = content.replace(/(<button\s+[^>]*?onClick=\{[^\}]*?(?:requestAdminDelete|handleDeleteBirthday|handleDeletePayslip|handleDeletePhoto|handleDeleteIntake|onDeleteInternalUser|handleDeletePhoto)[^\}]*\}[^>]*?)(\/?>)/g, (match, p1, p2) => {
    if (match.includes('hidden={!isUserAdmin}')) return match;
    return p1 + ' hidden={!isUserAdmin}' + p2;
  });

  fs.writeFileSync(file, content);
}

addHidden('src/components/InternalPortal.tsx');
addHidden('src/components/EmployeeManagement.tsx');
console.log("Added hidden");
