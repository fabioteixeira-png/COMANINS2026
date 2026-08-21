import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

if (!getApps().length) {
    initializeApp({
        projectId: firebaseConfig.projectId
    });
}
const db = getFirestore();
async function run() {
    const snap = await db.collection('portalUsers').where('username', '==', 'fabio.teixeira').get();
    if (snap.empty) {
        console.log("Not found");
    } else {
        console.log(snap.docs[0].data());
    }
}
run();
