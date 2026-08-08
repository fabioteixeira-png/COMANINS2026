const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target = `unsubs.push(syncCalibrationAuditLogs((list) => setAuditLogs(list)));`;
const replacement = `unsubs.push(syncCalibrationAuditLogs((list) => setAuditLogs(list)));
    unsubs.push(syncAccessAuditLogs((list) => setAccessAuditLogs(list)));`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Sync patched");
