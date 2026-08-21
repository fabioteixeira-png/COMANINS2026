import fs from 'fs';
let code = fs.readFileSync('src/components/LoginScreen.tsx', 'utf-8');

code = code.replace(
  `      let userDoc = internalUsers.find(u => u.username.toLowerCase() === cleanUser);
      if (!userDoc) {
        // Fallback to fetch from API or rely on the userCredential token claims if API is not available
        // For security, if we cannot find the userDoc locally, we can proceed with tokenResult claims.
      }`,
  `      let userDoc = internalUsers.find(u => u.username.toLowerCase() === cleanUser);
      if (!userDoc) {
        // Now that we are authenticated, we can safely query Firestore directly.
        try {
          const usersRef = collection(db, "portalUsers");
          const q = query(usersRef, where("username", "==", cleanUser));
          const snap = await getDocs(q);
          if (!snap.empty) {
            userDoc = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
          }
        } catch(e) {
          console.error("Error fetching userDoc after auth:", e);
        }
      }`
);

fs.writeFileSync('src/components/LoginScreen.tsx', code);
