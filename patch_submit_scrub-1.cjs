const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

const target1 = `      // Force scrub the legacy bloated field to prevent 1MB limit errors
      updatePayload.attachedDocs = null;
      
      onUpdateInternalUser(selectedUser.id, updatePayload);`;

const replace1 = `      // Force scrub legacy bloated fields to prevent 1MB limit errors
      updatePayload.attachedDocs = null;
      updatePayload.asoContracts = null;
      updatePayload.employeeTrainings = null;
      
      onUpdateInternalUser(selectedUser.id, updatePayload);`;

const target2 = `      createPayload.attachedDocs = null;
      onAddInternalUser(createPayload);`;

const replace2 = `      createPayload.attachedDocs = null;
      createPayload.asoContracts = null;
      createPayload.employeeTrainings = null;
      onAddInternalUser(createPayload);`;

code = code.replace(target1, replace1).replace(target2, replace2);
fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
