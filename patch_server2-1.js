import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  "const firebaseApp = initializeApp(firebaseConfig);\nconst firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || undefined);",
  `let firebaseAdminApp;
if (!getApps().length) {
  firebaseAdminApp = initializeApp({ projectId: firebaseConfig.projectId });
} else {
  firebaseAdminApp = getApps()[0];
}
const firestoreDb = getFirestore(firebaseAdminApp, firebaseConfig.firestoreDatabaseId || undefined);`
);

fs.writeFileSync('server.ts', code);
