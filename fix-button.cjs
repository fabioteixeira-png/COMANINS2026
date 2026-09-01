const fs = require('fs');
let content = fs.readFileSync('src/components/internal-portal/InternalPortal.part01.sourcepart', 'utf8');

const oldButtonStart = content.indexOf('<button\n        onClick={async () => {');
const oldButtonEnd = content.indexOf('</button>', oldButtonStart) + '</button>'.length;

if (oldButtonStart !== -1 && oldButtonEnd !== -1) {
  const newButton = `
      <button
        onClick={async () => {
          try {
            const { collection, getDocs, updateDoc, doc } = await import('firebase/firestore');
            const { db } = await import('../../lib/firebase');
            
            alert("Iniciando correção com busca flexível. Buscando cliente Comanins no banco de dados...");
            const clientsSnap = await getDocs(collection(db, 'clients'));
            let comaninsId = null;
            let nsmId = null;
            
            clientsSnap.forEach(d => {
              const name = d.data().name?.toLowerCase() || "";
              if (name.includes('comanins')) comaninsId = d.id;
              if (name.includes('nsm')) nsmId = d.id;
            });
            
            if (!comaninsId) {
              alert("Erro: Cliente Comanins não encontrado.");
              return;
            }
            
            const rawIds = ["232529", "232530", "232531", "232532", "232533", "232534", "232535", "232536", "232537", "232538"];
            alert("Comanins ID: " + comaninsId + "\\nBuscando os 10 instrumentos (qualquer formato COMA-XXXX)...");
            
            const instSnap = await getDocs(collection(db, 'instruments'));
            let count = 0;
            const updates = [];
            
            for (const d of instSnap.docs) {
              const data = d.data();
              
              let isTarget = false;
              for (const rid of rawIds) {
                if (
                  (data.certificateNumber && typeof data.certificateNumber === 'string' && data.certificateNumber.includes(rid)) ||
                  (data.id && typeof data.id === 'string' && data.id.includes(rid)) ||
                  (data.coma && typeof data.coma === 'string' && data.coma.includes(rid))
                ) {
                  isTarget = true;
                  break;
                }
              }

              if (isTarget) {
                updates.push(updateDoc(d.ref, { clientId: comaninsId }));
                count++;
              }
            }
            
            if (updates.length === 0) {
              alert("Nenhum instrumento correspondente foi encontrado para atualizar. Verifique os dados no banco.");
              return;
            }
            
            await Promise.all(updates);
            alert('Sucesso! ' + count + ' instrumentos foram atualizados para a Comanins.\\nA página será recarregada agora.');
            window.location.reload();
          } catch (e) {
            alert("Erro durante a atualização: " + e.message);
            console.error(e);
          }
        }}
        style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 999999, backgroundColor: '#dc2626', color: 'white', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
      >
        ⚠️ CLIQUE AQUI PARA EXECUTAR CORREÇÃO DE INSTRUMENTOS (NSM PARA COMANINS) ⚠️
      </button>
  `;
  content = content.slice(0, oldButtonStart) + newButton.trim() + content.slice(oldButtonEnd);
  fs.writeFileSync('src/components/internal-portal/InternalPortal.part01.sourcepart', content);
} else {
  console.log("Button not found.");
}
