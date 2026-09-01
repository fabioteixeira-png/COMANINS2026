const fs = require('fs');
let content = fs.readFileSync('src/components/internal-portal/InternalPortal.part01.sourcepart', 'utf8');

const effect = `
  // START TEMP MIGRATION
  React.useEffect(() => {
    const runMigration = async () => {
      if (localStorage.getItem('temp_inst_migration_232529')) return;
      try {
        const { collection, getDocs, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../../lib/firebase');
        const clientsSnap = await getDocs(collection(db, 'clients'));
        let comaninsId = null;
        clientsSnap.forEach(d => {
          if (d.data().name?.toLowerCase().includes('comanins')) comaninsId = d.id;
        });
        if (!comaninsId) return;

        const instSnap = await getDocs(collection(db, 'instruments'));
        const targetIds = ["232529", "232530", "232531", "232532", "232533", "232534", "232535", "232536", "232537", "232538"];
        const updates = [];
        instSnap.forEach(d => {
          const data = d.data();
          if (targetIds.includes(data.certificateNumber) || targetIds.includes(data.id) || targetIds.includes(data.coma)) {
            updates.push(updateDoc(d.ref, { clientId: comaninsId }));
          }
        });
        await Promise.all(updates);
        localStorage.setItem('temp_inst_migration_232529', 'done');
        console.log('Migração de instrumentos concluída: ', updates.length);
        if (updates.length > 0) {
          alert('Ajuste de instrumentos (NSM para Comanins) concluído com sucesso! Foram atualizados ' + updates.length + ' instrumentos.');
          window.location.reload();
        }
      } catch (e) {
        console.error(e);
      }
    };
    runMigration();
  }, []);
  // END TEMP MIGRATION
`;

content = content.replace(
  '  const [showSignatureAlert, setShowSignatureAlert] = React.useState(false);',
  '  const [showSignatureAlert, setShowSignatureAlert] = React.useState(false);\n' + effect
);

fs.writeFileSync('src/components/internal-portal/InternalPortal.part01.sourcepart', content);
