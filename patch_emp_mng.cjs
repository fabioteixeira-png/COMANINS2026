const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

// 1. Add prop to interface
if (!code.includes('employeeAsos?: any[];')) {
  code = code.replace(
    'employeeTrainings?: any[];',
    'employeeTrainings?: any[];\n  employeeAsos?: any[];'
  );
  
  code = code.replace(
    'employeeTrainings = [],',
    'employeeTrainings = [],\n  employeeAsos = [],'
  );
}

// 2. Import addEmployeeAsoDoc and deleteEmployeeAsoDoc
if (!code.includes('addEmployeeAsoDoc')) {
  code = code.replace(
    'addEmployeeTrainingDoc,',
    'addEmployeeTrainingDoc,\n  addEmployeeAsoDoc,\n  deleteEmployeeAsoDoc,'
  );
}

fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
