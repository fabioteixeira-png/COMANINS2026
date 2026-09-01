const fs = require('fs');
let content = fs.readFileSync('src/components/internal-portal/InternalPortal.part01.sourcepart', 'utf8');

const target = '<div className="h-screen sm:h-[100dvh] bg-slate-50 flex overflow-hidden print:h-auto print:overflow-visible print:block">';
const buttonCode = `
      <button
        onClick={async () => {
          try {
            const { collection, getDocs, updateDoc, doc } = await import('firebase/firestore');
            const { db } = await import('../../lib/firebase');
            
            alert("Iniciando correção. Buscando cliente Comanins no banco de dados...");
            const clientsSnap = await getDocs(collection(db, 'clients'));
            let comaninsId = null;
            let nsmId = null;
            
            clientsSnap.forEach(d => {
              const name = d.data().name?.toLowerCase() || "";
              if (name.includes('comanins')) comaninsId = d.id;
              if (name.includes('nsm')) nsmId = d.id;
            });
            
            if (!comaninsId) {
              alert("Erro: Cliente Comanins não encontrado no banco de dados. Atualize a página e tente novamente.");
              return;
            }
            
            // Search for COMA + numbers and the numbers themselves
            const rawIds = ["232529", "232530", "232531", "232532", "232533", "232534", "232535", "232536", "232537", "232538"];
            const targetIds = [...rawIds, ...rawIds.map(id => "COMA" + id)];
            
            alert("Comanins ID: " + comaninsId + "\\nBuscando os 10 instrumentos...");
            
            const instSnap = await getDocs(collection(db, 'instruments'));
            let count = 0;
            const updates = [];
            
            for (const d of instSnap.docs) {
              const data = d.data();
              if (targetIds.includes(data.certificateNumber) || targetIds.includes(data.id) || targetIds.includes(data.tag) || targetIds.includes(data.coma)) {
                updates.push(updateDoc(d.ref, { clientId: comaninsId }));
                count++;
              }
            }
            
            if (updates.length === 0) {
              alert("Nenhum instrumento correspondente foi encontrado para atualizar. Certifique-se de que os números de certificado estão corretos.");
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

content = content.replace(target, target + buttonCode);
fs.writeFileSync('src/components/internal-portal/InternalPortal.part01.sourcepart', content);
