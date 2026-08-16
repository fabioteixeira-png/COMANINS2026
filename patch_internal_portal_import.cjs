const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const targetImport = `import EmployeeManagement from "./EmployeeManagement";`;
const replaceImport = `import EmployeeManagement from "./EmployeeManagement";\nimport FieldService from "./FieldService";`;

if (!code.includes('import FieldService from "./FieldService"')) {
  code = code.replace(targetImport, replaceImport);
  fs.writeFileSync('src/components/InternalPortal.tsx', code);
  console.log('Import added.');
} else {
  console.log('Import exists.');
}
