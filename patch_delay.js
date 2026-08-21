import fs from 'fs';
let code = fs.readFileSync('src/components/LoginScreen.tsx', 'utf-8');

code = code.replace(
  `        try {
          const usersRef = collection(db, "portalUsers");`,
  `        try {
          await new Promise(r => setTimeout(r, 800)); // Wait for Auth token to propagate to Firestore
          const usersRef = collection(db, "portalUsers");`
);

fs.writeFileSync('src/components/LoginScreen.tsx', code);
