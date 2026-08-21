const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const firebaseConfig = require('./firebase-applet-config.json');

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);

async function run() {
  const usersRef = collection(db, 'portalUsers');
  const snap = await getDocs(usersRef);
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    for (const key of Object.keys(data)) {
      const size = Buffer.byteLength(JSON.stringify(data[key] || ''), 'utf8');
      if (size > 100000) {
        console.log("User", data.id, "has large field", key, "size", size);
      }
    }
  }
  process.exit(0);
}
run().catch(console.error);
