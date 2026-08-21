import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

if (!getApps().length) {
  initializeApp({ projectId: firebaseConfig.projectId });
}

// Pass databaseId to getFirestore
const db = getFirestore(getApps()[0], firebaseConfig.firestoreDatabaseId);

db.collection('portalUsers').limit(1).get().then(snap => {
  console.log('Success:', !snap.empty);
}).catch(e => {
  console.error('Error:', e);
});
