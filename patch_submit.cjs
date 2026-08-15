const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

const target = `    if (selectedUser && onUpdateInternalUser) {
      // Update existing
      const isPasswordChanged = formData.password && formData.password !== selectedUser.password;
      onUpdateInternalUser(selectedUser.id, {
        ...formData,
        permissionLevel: (formData as any).permissionLevel || 'Padrão',
        mustChangePassword: isPasswordChanged ? true : (formData.mustChangePassword ?? selectedUser.mustChangePassword),
        auditLogs: logs
      });`;

const replace = `    if (selectedUser && onUpdateInternalUser) {
      // Update existing
      const isPasswordChanged = formData.password && formData.password !== selectedUser.password;
      
      const updatePayload: any = {
        ...formData,
        permissionLevel: (formData as any).permissionLevel || 'Padrão',
        mustChangePassword: isPasswordChanged ? true : (formData.mustChangePassword ?? selectedUser.mustChangePassword),
        auditLogs: logs
      };
      
      // Force scrub the legacy bloated field to prevent 1MB limit errors
      updatePayload.attachedDocs = null;
      
      onUpdateInternalUser(selectedUser.id, updatePayload);`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
