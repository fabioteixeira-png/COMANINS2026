import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const newInternalUser = `
  const handleAddInternalUser = async (newUser: { name: string; username: string; role: string; permissionLevel?: string; register: string; password?: string }) => {
    try {
      const email = \`\${newUser.username.toLowerCase()}@comanins.internal\`;
      const tempPass = newUser.password || 'Mudar123456!';
      
      const res = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: tempPass })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar conta no Firebase Auth');
      }

      const cleanUser = Object.entries(newUser).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
      
      // Enforce password change for new users
      cleanUser.passwordChangeRequired = true;
      // Do not store the plaintext password in Firestore anymore!
      delete cleanUser.password;

      await addPortalUserDoc(cleanUser);
    } catch (err: any) {
      console.error('Error adding internal user to Firestore:', err);
      alert('Erro ao cadastrar usuário: ' + err.message);
    }
  };
`;
code = code.replace(/const handleAddInternalUser = async \([\s\S]*?console\.error\('Error adding internal user to Firestore:', err\);\n    \}\n  \};/, newInternalUser.trim());

const newClient = `
  const handleAddClient = async (newClientData: Omit<Client, 'id'>) => {
    try {
      if (newClientData.password) {
        const cleanCnpj = newClientData.cnpj?.replace(/\\D/g, '') || '';
        const email = \`\${cleanCnpj}@comanins.client\`;
        
        const res = await fetch('/api/auth/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: newClientData.password })
        });
        const data = await res.json();
        
        if (!res.ok && !data.error?.includes('EMAIL_EXISTS')) {
           throw new Error(data.error || 'Erro ao criar cliente no Firebase Auth');
        }
        
        newClientData.passwordChangeRequired = true;
        delete newClientData.password;
      }
    
      const saved = await addClientDoc(newClientData);
      setClients(prev => [saved, ...prev.filter(c => c.id !== saved.id)]);
      return saved;
    } catch (err: any) {
      console.error('Error adding client to Firestore:', err);
      alert('Erro ao cadastrar cliente: ' + err.message);
      throw err;
    }
  };
`;
code = code.replace(/const handleAddClient = async \([\s\S]*?throw err;\n    \}\n  \};/, newClient.trim());

fs.writeFileSync('src/App.tsx', code);
console.log("App.tsx updated");
