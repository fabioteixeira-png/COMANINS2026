import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

const route = `
app.post("/api/auth/legacy-login", async (req, res) => {
  try {
    const { username, cnpj, password, type } = req.body;
    
    if (type === 'internal') {
      const usersRef = collection(firestoreDb, "portalUsers");
      const snap = await getDocs(usersRef);
      const user = snap.docs.find(d => {
        const u = d.data();
        return (u.username || '').toLowerCase() === username.toLowerCase();
      });
      
      if (!user) return res.json({ valid: false });
      
      const userData = user.data();
      if (userData.password === password) {
        return res.json({ valid: true, id: user.id });
      }
      return res.json({ valid: false });
      
    } else if (type === 'client') {
      const clientsRef = collection(firestoreDb, "clients");
      const snap = await getDocs(clientsRef);
      const cleanCnpj = cnpj.replace(/\\D/g, '');
      const client = snap.docs.find(d => {
        const c = d.data();
        return (c.cnpj || '').replace(/\\D/g, '') === cleanCnpj;
      });
      
      if (!client) return res.json({ valid: false });
      
      const clientData = client.data();
      if (clientData.password === password) {
        return res.json({ valid: true, id: client.id });
      }
      return res.json({ valid: false });
    }
    
    res.json({ valid: false });
  } catch (error) {
    console.error("Legacy login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
`;

if (!code.includes('/api/auth/legacy-login')) {
  code = code.replace('app.post("/api/clients"', route + '\napp.post("/api/clients"');
  fs.writeFileSync('server.ts', code);
  console.log("Added /api/auth/legacy-login");
} else {
  console.log("Already added");
}
