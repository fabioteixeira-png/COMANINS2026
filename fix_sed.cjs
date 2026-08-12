const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

code = code.replace(
  "await deleteEmployeeTrainingDoc, getEmployeeDocuments, addEmployeeDocument, deleteEmployeeDocument, EmployeeDocument(id);",
  "await deleteEmployeeTrainingDoc(id);"
);

fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
