const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const interfaceDef = `
export interface FieldServiceRecord {
  id: string;
  tag: string;
  description: string;
  serialNumber: string;
  certificate: string;
  interventionDate: string;
  technician: string;
  status: string;
  notes: string;
}

export async function syncFieldServiceRecords(callback: (records: FieldServiceRecord[]) => void) {
  const colRef = collection(db, 'fieldServiceRecords');
  return onSnapshot(colRef, (snapshot) => {
    const list: FieldServiceRecord[] = [];
    snapshot.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() } as FieldServiceRecord);
    });
    callback(list);
  }, (err) => {
    console.error("Error syncing field service records:", err);
  });
}

export async function addFieldServiceRecord(data: Omit<FieldServiceRecord, 'id'>): Promise<FieldServiceRecord> {
  const colRef = collection(db, 'fieldServiceRecords');
  const docRef = await addDoc(colRef, data);
  return { id: docRef.id, ...data };
}

export async function updateFieldServiceRecord(id: string, data: Partial<FieldServiceRecord>): Promise<void> {
  const docRef = doc(db, 'fieldServiceRecords', id);
  await updateDoc(docRef, data);
}

export async function deleteFieldServiceRecord(id: string): Promise<void> {
  const docRef = doc(db, 'fieldServiceRecords', id);
  await deleteDoc(docRef);
}
`;

if (!code.includes('export interface FieldServiceRecord')) {
  code += interfaceDef;
  fs.writeFileSync('src/lib/firebase.ts', code);
  console.log('Firebase functions added.');
} else {
  console.log('Firebase functions already exist.');
}
