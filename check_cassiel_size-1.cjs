const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const firebaseConfig = require('./firebase-applet-config.json');

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);

async function run() {
  const dSnap = await getDoc(doc(db, 'portalUsers', 'user_1785883226887'));
  if (dSnap.exists()) {
    const data = dSnap.data();
    const str = JSON.stringify(data);
    console.log('Cassiel portalUser doc size (bytes):', Buffer.byteLength(str, 'utf8'));
    console.log('asoContracts length:', data.asoContracts?.length);
    console.log('employeeTrainings (legacy) length:', data.employeeTrainings?.length);
    console.log('certificatesList length:', data.certificatesList?.length);
  }
  process.exit(0);
}
run().catch(console.error);
