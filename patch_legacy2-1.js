import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  /app\.post\("\/api\/auth\/legacy-login", async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: "Internal server error" \}\);\s*\}\);/,
  `app.post("/api/auth/legacy-login", async (req, res) => {
  try {
    const { username, cnpj, password, type } = req.body;
    
    if (type === 'internal') {
      const usersRef = firestoreDb.collection("portalUsers");
      const snap = await usersRef.get();
      const user = snap.docs.find(d => {
        const u = d.data();
        return (u.username || '').trim().toLowerCase() === username.trim().toLowerCase();
      });
      
      if (!user) return res.json({ valid: false });
      
      const userData = user.data();
      if ((userData.password || '').trim() === password.trim()) {
        return res.json({ valid: true, user: { ...userData, id: user.id } });
      }
      return res.json({ valid: false });
      
    } else if (type === 'client') {
      const clientsRef = firestoreDb.collection("clients");
      const snap = await clientsRef.get();
      const cleanCnpj = cnpj.replace(/\\D/g, '');
      const client = snap.docs.find(d => {
        const c = d.data();
        return (c.cnpj || '').replace(/\\D/g, '') === cleanCnpj;
      });
      
      if (!client) return res.json({ valid: false });
      
      const clientData = client.data();
      if ((clientData.password || '').trim() === password.trim()) {
        return res.json({ valid: true, user: { ...clientData, id: client.id } });
      }
      return res.json({ valid: false });
    }
    
    res.json({ valid: false });
  } catch (error) {
    console.error("Legacy login error:", error);
    res.status(500).json({ error: "Erro de servidor ao validar credencial antiga." });
  }
});`
);

fs.writeFileSync('server.ts', code);
