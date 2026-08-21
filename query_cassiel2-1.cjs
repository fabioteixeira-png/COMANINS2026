const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');
const firebaseConfig = require('./firebase-applet-config.json');

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);

async function run() {
  const usersRef = collection(db, 'portalUsers');
  const uSnap = await getDocs(usersRef);
  let cassiel = null;
  uSnap.forEach(doc => {
    const data = doc.data();
    if (data.username && data.username.toLowerCase().includes('cassiel')) {
      cassiel = data;
      console.log('Found Cassiel:', data.id, data.username);
    }
  });

  if (cassiel) {
    const docsRef = collection(db, 'employeeDocuments');
    const dSnap = await getDocs(docsRef);
    console.log('Total documents:', dSnap.size);
    dSnap.forEach(doc => {
      const data = doc.data();
      if (data.userId === cassiel.id || data.userId === cassiel.username || (typeof data.userId === 'string' && data.userId.toLowerCase().includes('cassiel'))) {
        console.log('Doc:', doc.id, data.name, 'userId:', data.userId);
      }
    });
  } else {
    console.log('Cassiel not found');
  }
  process.exit(0);
}
run().catch(console.error);
