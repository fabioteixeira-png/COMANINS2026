const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const target = `export async function addEmployeeTrainingDoc(data: Omit<EmployeeTrainingRecord, 'id'>): Promise<EmployeeTrainingRecord> {
  const newId = 'etr_' + Date.now();
  const fullItem: EmployeeTrainingRecord = { ...data, id: newId };
  await setDoc(doc(db, 'employeeTrainings', newId), fullItem);
  return fullItem;
}`;

const replacement = `export async function addEmployeeTrainingDoc(data: Omit<EmployeeTrainingRecord, 'id'>): Promise<EmployeeTrainingRecord> {
  const newId = 'etr_' + Date.now();
  
  // Clean undefined values
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
  
  const fullItem: any = { ...cleanData, id: newId };
  await setDoc(doc(db, 'employeeTrainings', newId), fullItem);
  return fullItem;
}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/lib/firebase.ts', code);
