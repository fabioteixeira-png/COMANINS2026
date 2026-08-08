import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(config);

try {
  const db = getFirestore(app, config.firestoreDatabaseId);
  console.log("getFirestore success");
} catch (e) {
  console.log("getFirestore error:", e.message);
}

try {
  const db2 = initializeFirestore(app, {}, config.firestoreDatabaseId);
  console.log("initializeFirestore success");
} catch (e) {
  console.log("initializeFirestore error:", e.message);
}
