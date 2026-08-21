const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, deleteField } = require('firebase/firestore');
const firebaseConfig = require('./firebase-applet-config.json');

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);

async function run() {
  const userRef = doc(db, 'portalUsers', 'user_1785883226887');
  try {
    await updateDoc(userRef, {
      attachedDocs: deleteField()
    });
    console.log("Successfully deleted attachedDocs from cassiel");
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}
run().catch(console.error);
