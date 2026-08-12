const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const target = `export async function updateIntakePhotosDoc(id: string, photos: string[]): Promise<void> {`;
const replacement = `export async function updateIntakeDevolutionPhoto(id: string, photoBase64: string): Promise<void> {
  const ref = doc(db, 'savedIntakes', id);
  if (photoBase64) {
    await updateDoc(ref, { photoDevolution: photoBase64 });
  } else {
    await updateDoc(ref, { photoDevolution: deleteField() });
  }
}

export async function updateIntakePhotosDoc(id: string, photos: string[]): Promise<void> {`;

code = code.replace(target, replacement);
fs.writeFileSync('src/lib/firebase.ts', code);
