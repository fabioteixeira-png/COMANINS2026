const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

// Add "employee_aso" to requestAdminDelete types
content = content.replace(
  '      | "employee_training"',
  '      | "employee_training"\n      | "employee_aso"'
);

// Add "employee_aso" handler in handleConfirmAdminDelete
const targetHandlerStr = `        } else if (deleteTarget.type === "employee_training") {
          await deleteEmployeeTrainingDoc(deleteTarget.id);`;
const newHandlerStr = `        } else if (deleteTarget.type === "employee_training") {
          await deleteEmployeeTrainingDoc(deleteTarget.id);
        } else if (deleteTarget.type === "employee_aso") {
          await import("../lib/firebase").then(m => m.deleteEmployeeAsoDoc(deleteTarget.id));`;

content = content.replace(targetHandlerStr, newHandlerStr);

// Change requestAdminDelete call for ASO
const oldDeleteCall = `                                    requestAdminDelete(
                                      "exam",
                                      aso.id,
                                      \`ASO: \${aso.contractName}\`,
                                    )`;
const newDeleteCall = `                                    requestAdminDelete(
                                      "employee_aso",
                                      aso.id,
                                      \`ASO: \${aso.contractName}\`,
                                    )`;

content = content.replace(oldDeleteCall, newDeleteCall);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Patched InternalPortal.tsx ASO delete");
