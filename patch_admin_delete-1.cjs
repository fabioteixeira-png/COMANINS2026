const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target = `} else if (deleteTarget.type === "finance_category") {
          await import("../lib/firebase").then(m => m.deleteFinanceDoc('financeCategories', deleteTarget.id));
        }`;

const replacement = `} else if (deleteTarget.type === "finance_category") {
          await import("../lib/firebase").then(m => m.deleteFinanceDoc('financeCategories', deleteTarget.id));
        } else if (deleteTarget.type === "intake_devolution") {
          await updateIntakeDevolutionPhoto(deleteTarget.id, "");
          setSelectedIntakeForDevolution((prev) => prev && prev.id === deleteTarget.id ? { ...prev, photoDevolution: "" } : prev);
          setSavedIntakes((prev) =>
            prev.map((item) =>
              item.id === deleteTarget.id
                ? { ...item, photoDevolution: "" }
                : item,
            ),
          );
        }`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/InternalPortal.tsx', code);
