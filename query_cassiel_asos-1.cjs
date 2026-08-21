const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');
const firebaseConfig = require('./firebase-applet-config.json');

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);

async function run() {
  const asoRef = collection(db, 'employeeAsos');
  const asoSnap = await getDocs(asoRef);
  asoSnap.forEach(d => {
    const data = d.data();
    if (data.employeeId === 'user_1785883226887' || data.employeeId === 'cassiel.pereira' || (typeof data.employeeName === 'string' && data.employeeName.toLowerCase().includes('cassiel'))) {
      console.log('Cassiel ASO:', data);
    }
  });

  const trRef = collection(db, 'employeeTrainings');
  const trSnap = await getDocs(trRef);
  trSnap.forEach(d => {
    const data = d.data();
    if (data.employeeId === 'user_1785883226887' || data.employeeId === 'cassiel.pereira' || (typeof data.employeeName === 'string' && data.employeeName.toLowerCase().includes('cassiel'))) {
      console.log('Cassiel Training:', data);
    }
  });

  process.exit(0);
}
run().catch(console.error);
