const fs = require('fs');
let content = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const importReplacement = `import { Client, Instrument, CalibrationReport, CalibrationAuditLog, ContactMessage, DropdownOptions, EmployeeBirthday, Training, EmployeeTrainingRecord, InventoryItem, InventoryTransaction, ReferenceStandard, MedicalExam, ExamTypeItem, Payslip, RncReport, AccessAuditLog } from '../types';`;
content = content.replace(/import \{ Client.*?\} from '\.\.\/types';/s, importReplacement);

const newFunctions = `
// 10. Access Audit Logs (Acessos Fora de Horário)
export async function syncAccessAuditLogs(callback: (logs: AccessAuditLog[]) => void) {
  const colRef = collection(db, 'accessAuditLogs');
  return onSnapshot(colRef, (snapshot) => {
    if (snapshot.empty) {
      callback([]);
      return;
    }
    const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AccessAuditLog));
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    callback(list);
  }, (err) => {
    console.error('Firestore syncAccessAuditLogs error:', err);
  });
}

export async function addAccessAuditLog(data: Omit<AccessAuditLog, 'id'>): Promise<AccessAuditLog> {
  const newId = 'access_audit_' + Date.now();
  const logEntry: AccessAuditLog = { ...data, id: newId };
  await setDoc(doc(db, 'accessAuditLogs', newId), logEntry);
  return logEntry;
}
`;
if (!content.includes('syncAccessAuditLogs')) {
  content += newFunctions;
  fs.writeFileSync('src/lib/firebase.ts', content);
  console.log("Patched firebase.ts");
} else {
  console.log("Already patched");
}
