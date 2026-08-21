import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  `    const usersRef = collection(firestoreDb, "portalUsers");
    const snapshot = await getDocs(usersRef);
    let valid = false;
    snapshot.forEach(doc => {
      const u = doc.data();
      if ((u.username === username || u.role === 'Administrador') && u.password === password) {
        valid = true;
      }
    });`,
  `    const usersRef = firestoreDb.collection("portalUsers");
    const snapshot = await usersRef.get();
    let valid = false;
    snapshot.forEach(doc => {
      const u = doc.data();
      if ((u.username === username || u.role === 'Administrador') && u.password === password) {
        valid = true;
      }
    });`
);

// We should also remove the hardcoded passwords as per user request: "NÃO reintroduza senhas universais como: 123456, admin, admin123, comanins2026."
code = code.replace(
  `    // Check hardcoded defaults since some apps rely on it (until legacy passwords are completely wiped)\n    if (['123456', 'admin123', 'admin', 'comanins2026'].includes(password)) {\n      return res.json({ valid: true });\n    }`,
  ``
);

fs.writeFileSync('server.ts', code);
