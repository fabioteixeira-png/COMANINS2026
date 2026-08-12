const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

if (!code.includes('syncClientIntakes')) {
  const func = `
export async function syncClientIntakes(clientId: string, callback: (intakes: SavedIntake[]) => void) {
  const q = query(collection(db, 'savedIntakes'), where('clientId', '==', clientId));
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as SavedIntake));
      callback(list);
    } else {
      callback([]);
    }
  });
}
`;
  code += func;
  fs.writeFileSync('src/lib/firebase.ts', code);
}
