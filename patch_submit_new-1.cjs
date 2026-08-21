const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

const target = `      // Create new
      onAddInternalUser({
        ...(formData as PortalUser),
        name: formData.name || '',`;

const replace = `      // Create new
      const createPayload: any = {
        ...(formData as PortalUser),
        name: formData.name || '',`;

code = code.replace(target, replace);

const target2 = `        mustChangePassword: true,
        auditLogs: logs
      });`;

const replace2 = `        mustChangePassword: true,
        auditLogs: logs
      };
      createPayload.attachedDocs = null;
      onAddInternalUser(createPayload);`;

code = code.replace(target2, replace2);
fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
