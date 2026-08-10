import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId || undefined);

async function run() {
  try {
    const q = query(collection(db, "portalUsers"), where("email", "==", "felypehsteixeira@gmail.com"));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.log("User not found by email, checking by username...");
      const q2 = query(collection(db, "portalUsers"), where("username", "==", "felypehsteixeira@gmail.com"));
      const snap2 = await getDocs(q2);
      if(snap2.empty) {
         console.log("User not found at all.");
         // Let's list users
         const all = await getDocs(collection(db, "portalUsers"));
         all.forEach(d => console.log(d.id, d.data().email, d.data().username));
         process.exit(1);
      }
      for (const d of snap2.docs) {
        await updateDoc(doc(db, "portalUsers", d.id), {
          permissionLevel: "Administrador",
          role: "Administrador"
        });
        console.log("Updated", d.id);
      }
    } else {
      for (const d of snapshot.docs) {
        await updateDoc(doc(db, "portalUsers", d.id), {
          permissionLevel: "Administrador",
          role: "Administrador"
        });
        console.log("Updated", d.id);
      }
    }
    console.log("Done");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
