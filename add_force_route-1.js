import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

const route = `
// TEMPORARY ROUTE TO FORCE PASSWORD CHANGE
app.get("/api/admin/force-password-change", async (req, res) => {
  try {
    const usersRef = firestoreDb.collection("portalUsers");
    const usersSnap = await usersRef.get();
    let batch = firestoreDb.batch();
    let count = 0;
    
    usersSnap.forEach(doc => {
        batch.update(doc.ref, { passwordChangeRequired: true, mustChangePassword: true });
        count++;
    });
    if (count > 0) await batch.commit();

    const clientsRef = firestoreDb.collection("clients");
    const clientsSnap = await clientsRef.get();
    let clientBatch = firestoreDb.batch();
    let clientCount = 0;
    
    clientsSnap.forEach(doc => {
        clientBatch.update(doc.ref, { passwordChangeRequired: true, mustChangePassword: true });
        clientCount++;
    });
    if (clientCount > 0) await clientBatch.commit();
    
    res.json({ success: true, message: \`Forced password change for \${count} portalUsers and \${clientCount} clients.\` });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
`;

if (!code.includes('/api/admin/force-password-change')) {
    code = code.replace(
        'app.get("/api/admin/seed-legacy-users"',
        route + '\napp.get("/api/admin/seed-legacy-users"'
    );
    fs.writeFileSync('server.ts', code);
}
