import fs from 'fs';
let code = fs.readFileSync('src/components/LoginScreen.tsx', 'utf-8');

code = code.replace(
  "import { collection, query, where, getDocs } from 'firebase/firestore';",
  "import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';"
);

code = code.replace(
  `      } else if (activeTabType === 'client' && pendingChangeUser?.id) {
        await fetch('/api/auth/clear-password-change', {
           method: 'POST',
           headers: {'Content-Type': 'application/json'},
           body: JSON.stringify({ id: pendingChangeUser.id, type: 'client' })
        });
        if (auth.currentUser) {
          await auth.currentUser.getIdToken(true);
        }`,
  `      } else if (activeTabType === 'client' && pendingChangeUser?.id) {
        await updateDoc(doc(db, 'clients', pendingChangeUser.id), { passwordChangeRequired: false, mustChangePassword: false });
        if (auth.currentUser) {
          await auth.currentUser.getIdToken(true);
        }`
);

fs.writeFileSync('src/components/LoginScreen.tsx', code);
