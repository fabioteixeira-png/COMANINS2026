import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

const route = `
app.post("/api/auth/create-user", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Call Firebase Auth REST API to create user
    const response = await fetch(\`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=\${firebaseConfig.apiKey}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: false
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(400).json({ error: data.error.message || 'Erro ao criar usuário no Auth' });
    }
    
    res.json({ success: true, uid: data.localId });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
`;

if (!code.includes('/api/auth/create-user')) {
  code = code.replace('app.post("/api/auth/legacy-login"', route + '\napp.post("/api/auth/legacy-login"');
  fs.writeFileSync('server.ts', code);
  console.log("Added create-user route");
} else {
  console.log("Route already exists");
}
