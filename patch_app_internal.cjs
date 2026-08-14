const fs = require('fs');

// Patch App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
if (!appCode.includes('employeeAsos')) {
  appCode = appCode.replace(
    'const [employeeTrainings, setEmployeeTrainings] = useState<any[]>([]);',
    'const [employeeTrainings, setEmployeeTrainings] = useState<any[]>([]);\n  const [employeeAsos, setEmployeeAsos] = useState<any[]>([]);'
  );
  
  appCode = appCode.replace(
    'employeeTrainings={employeeTrainings}',
    'employeeTrainings={employeeTrainings}\n              employeeAsos={employeeAsos}'
  );
  
  fs.writeFileSync('src/App.tsx', appCode);
}

// Patch InternalPortal.tsx
let internalCode = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');
if (!internalCode.includes('employeeAsos')) {
  internalCode = internalCode.replace(
    'employeeTrainings?: any[];',
    'employeeTrainings?: any[];\n  employeeAsos?: any[];'
  );
  
  internalCode = internalCode.replace(
    'employeeTrainings = [],',
    'employeeTrainings = [],\n  employeeAsos = [],'
  );
  
  internalCode = internalCode.replace(
    'employeeTrainings={employeeTrainings}',
    'employeeTrainings={employeeTrainings}\n              employeeAsos={employeeAsos}'
  );
  
  internalCode = internalCode.replace(
    'import {',
    'import {\n  syncEmployeeAsos,'
  );
  
  internalCode = internalCode.replace(
    'unsubs.push(syncEmployeeTrainings((list) => setEmployeeTrainings(list)));',
    'unsubs.push(syncEmployeeTrainings((list) => setEmployeeTrainings(list)));\n    unsubs.push(syncEmployeeAsos((list) => setEmployeeAsos(list)));'
  );
  
  internalCode = internalCode.replace(
    'const [employeeTrainings, setEmployeeTrainings] = useState<any[]>([]);',
    'const [employeeTrainings, setEmployeeTrainings] = useState<any[]>([]);\n  const [employeeAsos, setEmployeeAsos] = useState<any[]>([]);'
  );
  
  fs.writeFileSync('src/components/InternalPortal.tsx', internalCode);
}
