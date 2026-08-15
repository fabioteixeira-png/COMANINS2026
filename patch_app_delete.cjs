const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `import { deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';`;
const replace1 = `import { deleteDoc, doc, updateDoc, setDoc, deleteField } from 'firebase/firestore';`;

if (!code.includes('deleteField')) {
  code = code.replace(target1, replace1);
}

const target2 = `      const cleanUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);`;

const replace2 = `      const cleanUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
        if (value === null) {
          acc[key] = deleteField();
        } else if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);`;

code = code.replace(target2, replace2);
fs.writeFileSync('src/App.tsx', code);
