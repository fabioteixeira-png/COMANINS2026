const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const firebaseConfig = require('./firebase-applet-config.json');

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);

async function run() {
  const dSnap = await getDoc(doc(db, 'portalUsers', 'user_1785883226887'));
  if (dSnap.exists()) {
    const data = dSnap.data();
    for (const key of Object.keys(data)) {
      const size = Buffer.byteLength(JSON.stringify(data[key] || ''), 'utf8');
      if (size > 1000) {
        console.log(key, 'size:', size);
      }
    }
  }
  process.exit(0);
}
run().catch(console.error);
