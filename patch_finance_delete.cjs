const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target1 = `} else if (deleteTarget.type === "inst_photo_calib") {
          await updateInstrumentDoc(deleteTarget.id, { photoCalibrated: "" });
          setPhotoModalInstrument((prev) => prev && prev.id === deleteTarget.id ? { ...prev, photoCalibrated: "" } : prev);
        }`;

const replacement1 = `} else if (deleteTarget.type === "inst_photo_calib") {
          await updateInstrumentDoc(deleteTarget.id, { photoCalibrated: "" });
          setPhotoModalInstrument((prev) => prev && prev.id === deleteTarget.id ? { ...prev, photoCalibrated: "" } : prev);
        } else if (deleteTarget.type === "finance_transaction") {
          await import("../lib/firebase").then(m => m.deleteFinanceTransaction(deleteTarget.id));
        } else if (deleteTarget.type === "finance_contract") {
          await import("../lib/firebase").then(m => m.deleteFinanceContract(deleteTarget.id));
        } else if (deleteTarget.type === "finance_measurement") {
          await import("../lib/firebase").then(m => m.deleteFinanceMeasurement(deleteTarget.id));
        } else if (deleteTarget.type === "finance_bank") {
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

code = code.replace(target1, replacement1);

// Also pass requestAdminDelete to FinanceManagement
code = code.replace('{activeTab === "financeiro" && <FinanceManagement />}', '{activeTab === "financeiro" && <FinanceManagement requestAdminDelete={requestAdminDelete} />}');

fs.writeFileSync('src/components/InternalPortal.tsx', code);
