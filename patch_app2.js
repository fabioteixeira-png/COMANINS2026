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
      
      if (!res.ok && !data.error?.includes('EMAIL_EXISTS')) {
        throw new Error(data.error || 'Erro ao criar conta no Firebase Auth');
      }

      const cleanUser = Object.entries(newUser).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
      
      cleanUser.passwordChangeRequired = true;
      delete cleanUser.password;

      await addPortalUserDoc(cleanUser);
    } catch (err: any) {
      console.error('Error adding internal user to Firestore:', err);
      alert('Erro ao cadastrar usuário: ' + err.message);
    }
  };
`;

code = code.replace(/const handleAddInternalUser = async \([\s\S]*?alert\('Erro ao cadastrar usuário: ' \+ err\.message\);\n    \}\n  \};/, newInternalUser.trim());
fs.writeFileSync('src/App.tsx', code);
