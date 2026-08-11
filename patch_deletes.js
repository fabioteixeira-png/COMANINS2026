const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

// 1. Add types to deleteTarget and requestAdminDelete
const typeReplacements = [
  '| "message"\n      | "audit_log"',
  '| "message"\n      | "audit_log"\n      | "payslip"\n      | "exam"\n      | "exam_type"\n      | "intake_photo"\n      | "inst_photo_reg"\n      | "inst_photo_calib"\n      | "rnc"'
];
code = code.split(typeReplacements[0]).join(typeReplacements[1]);

fs.writeFileSync('src/components/InternalPortal.tsx', code);
