const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');

const newRoute = `
app.get('/api/run-temp-update', async (req, res) => {
  try {
    if (!firestoreDb) return res.send('No db');
    const ids = ["232529", "232530", "232531", "232532", "232533", "232534", "232535", "232536", "232537", "232538"];
    
    // Find Comanins
    const clientsSnap = await firestoreDb.collection('clients').get();
    let comaninsId = null;
    let nsmId = null;
    clientsSnap.forEach(doc => {
      const name = doc.data().name?.toLowerCase() || '';
      if (name.includes('comanins')) {
        comaninsId = doc.id;
      }
      if (name.includes('nsm')) {
        nsmId = doc.id;
      }
    });

    if (!comaninsId) return res.send('Comanins not found');

    const batch = firestoreDb.batch();
    const instSnap = await firestoreDb.collection('instruments').get();
    let count = 0;
    const foundIds = [];
    instSnap.forEach(doc => {
      const data = doc.data();
      if (ids.includes(data.certificateNumber) || ids.includes(data.id)) {
         batch.update(doc.ref, { clientId: comaninsId });
         count++;
         foundIds.push(data.certificateNumber || data.id);
      }
    });
    
    await batch.commit();
    res.send({ updatedCount: count, foundIds, comaninsId, nsmId });
  } catch (err) {
    res.status(500).send(err.toString());
  }
});
`;

fs.writeFileSync('server.ts', content.replace('app.get("/api/health",', newRoute + '\napp.get("/api/health",'));
