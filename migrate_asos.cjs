const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteField } = require('firebase/firestore');
const firebaseConfig = require('./firebase-applet-config.json');

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);

async function run() {
  const usersRef = collection(db, 'portalUsers');
  const snap = await getDocs(usersRef);
  let migrated = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (data.asoContracts && data.asoContracts.length > 0) {
      console.log(`Migrating ${data.asoContracts.length} ASOs for user ${data.username}`);
      for (const aso of data.asoContracts) {
        const newId = aso.id || `easo_${Date.now()}_${Math.random().toString(36).substring(2,6)}`;
        await setDoc(doc(db, 'employeeAsos', newId), {
          ...aso,
          id: newId,
          employeeId: data.id,
          employeeName: data.name || data.username
        });
        migrated++;
      }
      // Scrub it from the user
      await updateDoc(docSnap.ref, {
        asoContracts: deleteField()
      });
    }
  }
  console.log(`Migrated ${migrated} ASOs and scrubbed portalUsers`);
  process.exit(0);
}
run().catch(console.error);
