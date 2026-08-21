const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const firebaseConfig = require('./firebase-applet-config.json');

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);

async function run() {
  const docsRef = collection(db, 'employeeDocuments');
  const dSnap = await getDocs(docsRef);
  console.log("Total employeeDocuments:", dSnap.size);
  process.exit(0);
}
run().catch(console.error);
