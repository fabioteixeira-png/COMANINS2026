const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target2 = `} else if (deleteTarget.type === "finance_bank") {
          await import("../lib/firebase").then(m => {
            return m.syncDropdownOptions(opts => {
              const updated = opts.bancosFinanceiros.filter((b: any) => b.id !== deleteTarget.id);
              m.saveDropdownOptions({ bancosFinanceiros: updated });
            });
          });
        } else if (deleteTarget.type === "finance_category") {
          await import("../lib/firebase").then(m => {
            return m.syncDropdownOptions(opts => {
              const updated = opts.categoriasFinanceiras.filter((c: any) => c.id !== deleteTarget.id);
              m.saveDropdownOptions({ categoriasFinanceiras: updated });
            });
          });
        }`;

const replacement2 = `} else if (deleteTarget.type === "finance_bank") {
          await import("../lib/firebase").then(m => m.deleteFinanceDoc('financeBankAccounts', deleteTarget.id));
        } else if (deleteTarget.type === "finance_category") {
          await import("../lib/firebase").then(m => m.deleteFinanceDoc('financeCategories', deleteTarget.id));
        }`;

code = code.replace(target2, replacement2);

fs.writeFileSync('src/components/InternalPortal.tsx', code);
