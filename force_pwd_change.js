import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

if (!getApps().length) {
    initializeApp({ projectId: firebaseConfig.projectId });
}
const db = getFirestore(firebaseConfig.firestoreDatabaseId);

async function run() {
    console.log("Starting batch update for portalUsers...");
    const usersSnap = await db.collection('portalUsers').get();
    let batch = db.batch();
    let count = 0;
    
    usersSnap.forEach(doc => {
        batch.update(doc.ref, { passwordChangeRequired: true, mustChangePassword: true });
        count++;
    });
    
    if (count > 0) {
        await batch.commit();
        console.log(`Updated ${count} portalUsers.`);
    } else {
        console.log("No portalUsers found.");
    }

    console.log("Starting batch update for clients...");
    const clientsSnap = await db.collection('clients').get();
    batch = db.batch();
    let clientCount = 0;
    
    clientsSnap.forEach(doc => {
        batch.update(doc.ref, { passwordChangeRequired: true, mustChangePassword: true });
        clientCount++;
    });
    
    if (clientCount > 0) {
        await batch.commit();
        console.log(`Updated ${clientCount} clients.`);
    } else {
        console.log("No clients found.");
    }
}
run();
