const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

if (!code.includes('export interface EmployeeAsoRecord')) {
  const asoDefIndex = code.indexOf('export interface AsoContractItem {');
  if (asoDefIndex > -1) {
    code = code.replace('export interface AsoContractItem {', `export interface EmployeeAsoRecord extends AsoContractItem {
  employeeId: string;
  employeeName: string;
}

export interface AsoContractItem {`);
  }

  const syncFunctionsIndex = code.indexOf('// 9. Employee Trainings');
  if (syncFunctionsIndex > -1) {
    code = code.slice(0, syncFunctionsIndex) + `// 8.5 Employee ASOs
export async function syncEmployeeAsos(callback: (records: EmployeeAsoRecord[]) => void) {
  const colRef = collection(db, 'employeeAsos');
  return onSnapshot(colRef, (snapshot) => {
    const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as EmployeeAsoRecord));
    callback(list);
  }, (err) => {
    console.error('Firestore syncEmployeeAsos error:', err);
  });
}

export async function addEmployeeAsoDoc(data: Omit<EmployeeAsoRecord, 'id'>): Promise<EmployeeAsoRecord> {
  const newId = 'easo_' + Date.now();
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
  const fullItem: any = { ...cleanData, id: newId };
  await setDoc(doc(db, 'employeeAsos', newId), fullItem);
  return fullItem;
}

export async function updateEmployeeAsoDoc(id: string, data: Partial<EmployeeAsoRecord>): Promise<void> {
  await updateDoc(doc(db, 'employeeAsos', id), data);
}

export async function deleteEmployeeAsoDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, 'employeeAsos', id));
}

` + code.slice(syncFunctionsIndex);
  }
}

fs.writeFileSync('src/lib/firebase.ts', code);
