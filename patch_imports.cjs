const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

content = content.replace("syncCalibrationAuditLogs,", "syncCalibrationAuditLogs,\\n  syncAccessAuditLogs,\\n  addAccessAuditLog,");
content = content.replace("CalibrationAuditLog,", "CalibrationAuditLog,\\n  AccessAuditLog,");

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Imports patched");
