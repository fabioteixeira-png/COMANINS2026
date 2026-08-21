const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

code = code.replace(
  'const files = Array.from(e.target.files || []);',
  'const files = Array.from(e.target.files || []) as File[];'
);

fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
