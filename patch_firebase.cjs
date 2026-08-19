const fs = require('fs');
let content = fs.readFileSync('src/lib/firebase.ts', 'utf-8');

const newFunc = `
export async function bulkUpsertFieldServiceRecords(updates: {id: string, data: Partial<FieldServiceRecord>}[], adds: Omit<FieldServiceRecord, 'id'>[]): Promise<void> {
  const colRef = collection(db, 'fieldServiceRecords');
  const allOps = [];
  
  updates.forEach(u => allOps.push({ type: 'update', ...u }));
  adds.forEach(a => allOps.push({ type: 'add', data: a }));

  const chunks = [];
  for (let i = 0; i < allOps.length; i += 500) {
    chunks.push(allOps.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    for (const op of chunk) {
      if (op.type === 'update') {
        const docRef = doc(db, 'fieldServiceRecords', op.id);
        batch.update(docRef, op.data);
      } else {
        const docRef = doc(colRef);
        batch.set(docRef, op.data);
      }
    }
    await batch.commit();
  }
}
`;

content = content + newFunc;
fs.writeFileSync('src/lib/firebase.ts', content);
