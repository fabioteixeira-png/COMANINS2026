import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "aqueous-mile-rzp2g",
  appId: "1:647094811892:web:ea77d2122accd3cbb5f2a1",
  apiKey: "AIzaSyAnCfiXJrm_pGWI6yu7X14D69fV2cxp82k",
  authDomain: "aqueous-mile-rzp2g.firebaseapp.com",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-comaninsexcelnci-f5355530-a4e5-4359-8c99-de3da14e5882");

async function run() {
  const colRef = collection(db, "payslips");
  const snap = await getDocs(colRef);
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (data.visualized) {
      await updateDoc(doc(db, "payslips", docSnap.id), {
        visualized: false,
        visualizedAt: "",
        visualizedIp: "",
        visualizedUserAgent: "",
        lgpdConsentAccepted: false,
        lgpdConsentDate: ""
      });
      console.log(`Updated payslip ${docSnap.id}`);
    }
  }
  
  const snap2 = await getDocs(colRef);
  for (const docSnap of snap2.docs) {
    console.log(`Double check payslip ${docSnap.id}: visualized = ${docSnap.data().visualized}`);
  }
  
  console.log("Done");
  process.exit(0);
}

run().catch(console.error);
