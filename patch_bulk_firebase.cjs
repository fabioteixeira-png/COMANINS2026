const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

if (!code.includes('writeBatch')) {
  code = code.replace(/} from 'firebase\/firestore';/, ', writeBatch } from "firebase/firestore";');
}

const functionsToAdd = `
export async function bulkAddFieldServiceRecords(records: Omit<FieldServiceRecord, 'id'>[]): Promise<void> {
  const colRef = collection(db, 'fieldServiceRecords');
  const chunks = [];
  for (let i = 0; i < records.length; i += 500) {
    chunks.push(records.slice(i, i + 500));
  }
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    for (const record of chunk) {
      const docRef = doc(colRef);
      batch.set(docRef, record);
    }
    await batch.commit();
  }
}

export async function clearAllFieldServiceRecords(): Promise<void> {
  const colRef = collection(db, 'fieldServiceRecords');
  const snapshot = await getDocs(colRef);
  const chunks = [];
  for (let i = 0; i < snapshot.docs.length; i += 500) {
    chunks.push(snapshot.docs.slice(i, i + 500));
  }
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    for (const d of chunk) {
      batch.delete(d.ref);
    }
    await batch.commit();
  }
}
`;

if (!code.includes('bulkAddFieldServiceRecords')) {
  code += functionsToAdd;
  fs.writeFileSync('src/lib/firebase.ts', code);
  console.log('Firebase bulk functions added.');
} else {
  console.log('Functions already exist.');
}
