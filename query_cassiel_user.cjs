const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');
const firebaseConfig = require('./firebase-applet-config.json');

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);

async function run() {
  const usersRef = collection(db, 'portalUsers');
  const uSnap = await getDocs(usersRef);
  uSnap.forEach(d => {
    const data = d.data();
    if (data.username && data.username.toLowerCase().includes('cassiel')) {
      console.log('Cassiel User Data:', {
        id: data.id,
        username: data.username,
        name: data.name
      });
    }
  });
  process.exit(0);
}
run().catch(console.error);
