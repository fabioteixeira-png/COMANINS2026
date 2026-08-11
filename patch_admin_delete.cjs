const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target1 = `} else if (deleteTarget.type === "audit_log") {
          await deleteCalibrationAuditLogDoc(deleteTarget.id);
        }`;
const replacement1 = `} else if (deleteTarget.type === "audit_log") {
          await deleteCalibrationAuditLogDoc(deleteTarget.id);
        } else if (deleteTarget.type === "payslip") {
          await deletePayslipDoc(deleteTarget.id);
          setPayslips((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        } else if (deleteTarget.type === "exam") {
          await deleteMedicalExamDoc(deleteTarget.id);
        } else if (deleteTarget.type === "exam_type") {
          const updated = examTypesCatalog.filter((t) => t.id !== deleteTarget.id);
          await saveExamTypes(updated);
        } else if (deleteTarget.type === "intake_photo") {
          const [intakeId, idxStr] = deleteTarget.id.split("::");
          const photoIndex = parseInt(idxStr, 10);
          if (selectedIntakeForPhotos && selectedIntakeForPhotos.id === intakeId) {
            const existingPhotos = selectedIntakeForPhotos.photos || [];
            const updatedPhotos = existingPhotos.filter((_, idx) => idx !== photoIndex);
            await updateIntakePhotosDoc(intakeId, updatedPhotos);
          }
        } else if (deleteTarget.type === "inst_photo_reg") {
          await updateInstrumentDoc(deleteTarget.id, { photoRegistration: "" });
          setPhotoModalInstrument((prev) => prev && prev.id === deleteTarget.id ? { ...prev, photoRegistration: "" } : prev);
        } else if (deleteTarget.type === "inst_photo_calib") {
          await updateInstrumentDoc(deleteTarget.id, { photoCalibrated: "" });
          setPhotoModalInstrument((prev) => prev && prev.id === deleteTarget.id ? { ...prev, photoCalibrated: "" } : prev);
        }`;

code = code.replace(target1, replacement1);

fs.writeFileSync('src/components/InternalPortal.tsx', code);
