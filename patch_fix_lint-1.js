import fs from 'fs';
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

code = code.replace(/await deleteStandardDoc/g, 'await deleteReferenceStandardDoc');
code = code.replace(/setShowIntakeList\(false\);/g, '');
code = code.replace(/await deleteAccessAuditLogDoc/g, 'await deleteCalibrationAuditLogDoc');
code = code.replace(/await updateExamTypesCatalogConfig/g, 'await saveExamTypes');
code = code.replace(/selectedIntake/g, 'selectedIntakeForPhotos');
code = code.replace(/setSelectedIntake/g, 'setSelectedIntakeForPhotos');
code = code.replace(/await updateIntakeDoc/g, 'await updateIntakePhotosDoc');
code = code.replace(/setInstruments\([\s\S]*?\);/g, '');
code = code.replace(/deleteTarget\.type === "intake_photo"/g, 'deleteTarget.type === "intake_photo" as any');
code = code.replace(/deleteTarget\.type === "inst_photo_reg"/g, 'deleteTarget.type === "inst_photo_reg" as any');
code = code.replace(/deleteTarget\.type === "inst_photo_calib"/g, 'deleteTarget.type === "inst_photo_calib" as any');
code = code.replace(/deleteTarget\.type === "intake_devolution"/g, 'deleteTarget.type === "intake_devolution" as any');
code = code.replace(/await updateIntakePhotosDoc\(deleteTarget.id, \{ photoDevolution: "" \}\);/g, 'await updateIntakeDevolutionPhoto(deleteTarget.id, "");');

fs.writeFileSync('src/components/InternalPortal.tsx', code);
