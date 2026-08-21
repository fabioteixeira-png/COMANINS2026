const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, deleteField } = require('firebase/firestore');
const firebaseConfig = require('./firebase-applet-config.json');

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);

async function run() {
  const usersRef = collection(db, 'portalUsers');
  const snap = await getDocs(usersRef);
  let fixed = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (data.attachedDocs && data.attachedDocs.length > 0) {
      const size = Buffer.byteLength(JSON.stringify(data.attachedDocs), 'utf8');
      if (size > 100000) {
        console.log("Fixing user", data.id, "size", size);
        await updateDoc(docSnap.ref, {
          attachedDocs: deleteField()
        });
        fixed++;
      }
    }
  }
  console.log("Fixed", fixed, "users");
  process.exit(0);
}
run().catch(console.error);
