import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

const route = `
// TEMPORARY SEED ROUTE FOR LEGACY USERS
app.get("/api/admin/seed-legacy-users", async (req, res) => {
  try {
    const users = [
      { username: "andrea.santos", name: "Andrea Santos" },
      { username: "aristeu.neto", name: "Aristeu Neto" },
      { username: "cassiel.pereira", name: "Cassiel Pereira" },
      { username: "diego.bouth", name: "Diego Bouth" },
      { username: "eliseu.sales", name: "Eliseu Sales" },
      { username: "emanuelle.carvalho", name: "Emanuelle Carvalho" },
      { username: "fabio.teixeira", name: "Fabio Teixeira" },
      { username: "felype.teixeira", name: "Felype Teixeira" },
      { username: "gabriela.reis", name: "Gabriela Reis" },
      { username: "gilson.soares", name: "Gilson Soares" },
      { username: "kaue.pompeu", name: "Kaue Pompeu" },
      { username: "patricia.santos", name: "Patricia Santos" },
      { username: "vanilson.santos", name: "Vanilson Santos" },
      { username: "vinicius.pinto", name: "Vinicius Pinto" },
      { username: "isidro.teixeira", name: "Isidro Teixeira" },
      { username: "solange.teixeira", name: "Solange Teixeira" },
      { username: "rose.teixeira", name: "Rose Teixeira" },
      { username: "ryan.conceicao", name: "Ryan Conceicao" }
    ];
    
    const usersRef = firestoreDb.collection("portalUsers");
    let added = 0;
    
    for (const u of users) {
      const snap = await usersRef.where("username", "==", u.username).get();
      if (snap.empty) {
        await usersRef.add({
          username: u.username,
          name: u.name,
          password: "comanins2026",
          mustChangePassword: true,
          role: "Técnico de Laboratório",
          permissionLevel: "Padrão",
          register: \`MAT-\${Math.floor(1000 + Math.random() * 9000)}\`,
          status: 'Ativo'
        });
        added++;
      }
    }
    
    res.json({ success: true, message: \`Foram adicionados \${added} usuários legados com sucesso. A senha padrão para todos é 'comanins2026'.\` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

`;

code = code.replace("const app = express();", "const app = express();\n" + route);
fs.writeFileSync('server.ts', code);
