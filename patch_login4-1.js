import fs from 'fs';
let code = fs.readFileSync('src/components/LoginScreen.tsx', 'utf-8');

code = code.replace(
  `        const q = query(collection(db, 'portalUsers'), where('username', '==', cleanUser));
        const snap = await getDocs(q);
        if (!snap.empty) {
          userDoc = { ...snap.docs[0].data(), id: snap.docs[0].id } as InternalUser;
        } else {
          setErrorMsg('Usuário não encontrado no sistema.');
          return;
        }`,
  ""
);

code = code.replace(
  `        const q = query(collection(db, 'clients'));
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        clientDoc = docs.find((c: any) => c.cnpj?.replace(/\\D/g, '') === cleanCnpj) as any;
        
        if (!clientDoc) {
           setErrorMsg('Cliente não encontrado no sistema.');
           return;
        }`,
  ""
);

fs.writeFileSync('src/components/LoginScreen.tsx', code);
