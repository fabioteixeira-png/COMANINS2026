import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

if (!getApps().length) {
    initializeApp({
        credential: cert(firebaseConfig)
    });
}
const db = getFirestore();
const auth = getAuth();
async function run() {
    const snap = await db.collection('portalUsers').where('username', '==', 'fabio.teixeira').get();
    if (snap.empty) {
        console.log("Not found in DB");
    } else {
        const u = snap.docs[0].data();
        console.log("DB User:", u);
        
        try {
            const authUser = await auth.getUserByEmail(`${u.username}@comanins.internal`);
            console.log("Auth User:", authUser.uid, authUser.customClaims);
        } catch(e) {
            console.log("Not found in Auth");
        }
    }
}
run();
