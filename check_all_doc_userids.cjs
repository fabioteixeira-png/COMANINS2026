const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const firebaseConfig = require('./firebase-applet-config.json');

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);

async function checkDocUserIds() {
  const docsSnap = await getDocs(collection(db, 'employeeDocuments'));
  const userIdsInDocs = new Set();
  docsSnap.forEach(d => {
    const data = d.data();
    userIdsInDocs.add(data.userId);
  });

  console.log("Distinct userId values in employeeDocuments:", Array.from(userIdsInDocs));

  const usersSnap = await getDocs(collection(db, 'portalUsers'));
  console.log("\nPortalUsers mapping:");
  usersSnap.forEach(u => {
    const data = u.data();
    console.log(`User: name="${data.name}", id="${u.id}", username="${data.username}", cpf="${data.cpf}", register="${data.register}"`);
  });

  process.exit(0);
}

checkDocUserIds().catch(console.error);
