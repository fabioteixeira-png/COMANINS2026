import fs from 'fs';
let code = fs.readFileSync('src/components/LoginScreen.tsx', 'utf-8');

const newMethods = `
  const handleInternalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = internalPassword.trim();
    
    const email = \`\${cleanUser}@comanins.internal\`;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, cleanPass);
      const userDoc = internalUsers.find(u => u.username.toLowerCase() === cleanUser);
      if (!userDoc) {
        setErrorMsg('Usuário não encontrado no sistema.');
        return;
      }
      
      const tokenResult = await userCredential.user.getIdTokenResult();
      const needsChange = tokenResult.claims.passwordChangeRequired === true || userDoc.passwordChangeRequired === true || userDoc.mustChangePassword === true;
      
      if (needsChange) {
        setPendingChangeUser(userDoc);
        setPasswordChangeRequired(true);
        setPendingUserEmail(email);
        setActiveTabType('internal');
        return;
      }

      onLoginSuccessInternal(userDoc);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const res = await fetch('/api/auth/legacy-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: cleanUser, password: cleanPass, type: 'internal' })
          });
          const data = await res.json();
          if (data.valid) {
            const userDoc = internalUsers.find(u => u.username.toLowerCase() === cleanUser);
            if (userDoc) {
              setPendingChangeUser(userDoc);
              setPasswordChangeRequired(true);
              setPendingUserEmail(email);
              setLegacyAuthSuccess(true);
              setActiveTabType('internal');
            } else {
              setErrorMsg('Usuário não encontrado na base.');
            }
          } else {
            setErrorMsg('Usuário ou senha interna incorretos. Por favor, verifique suas credenciais.');
          }
        } catch (serverErr) {
          setErrorMsg('Erro ao conectar ao servidor para validação de legado.');
        }
      } else {
        setErrorMsg('Erro de autenticação: ' + err.message);
      }
    }
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanCnpj = cnpj.replace(/\\D/g, '');
    const cleanPass = clientPassword.trim();
    
    const email = \`\${cleanCnpj}@comanins.client\`;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, cleanPass);
      const clientDoc = clients.find(c => c.cnpj?.replace(/\\D/g, '') === cleanCnpj);
      if (!clientDoc) {
        setErrorMsg('Cliente não encontrado no sistema.');
        return;
      }
      
      const tokenResult = await userCredential.user.getIdTokenResult();
      const needsChange = tokenResult.claims.passwordChangeRequired === true || clientDoc.passwordChangeRequired === true;
      
      if (needsChange) {
        setPendingChangeUser(clientDoc as any);
        setPasswordChangeRequired(true);
        setPendingUserEmail(email);
        setActiveTabType('client');
        return;
      }

      onLoginSuccessClient(clientDoc);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const res = await fetch('/api/auth/legacy-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cnpj: cleanCnpj, password: cleanPass, type: 'client' })
          });
          const data = await res.json();
          if (data.valid) {
            const clientDoc = clients.find(c => c.cnpj?.replace(/\\D/g, '') === cleanCnpj);
            if (clientDoc) {
              setPendingChangeUser(clientDoc as any);
              setPasswordChangeRequired(true);
              setPendingUserEmail(email);
              setLegacyAuthSuccess(true);
              setActiveTabType('client');
            } else {
              setErrorMsg('Cliente não encontrado na base.');
            }
          } else {
            setErrorMsg('CNPJ ou senha incorretos.');
          }
        } catch (serverErr) {
          setErrorMsg('Erro ao conectar ao servidor.');
        }
      } else {
        setErrorMsg('Erro de autenticação: ' + err.message);
      }
    }
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassChangeError('');

    if (newPassword !== confirmPassword) {
      setPassChangeError('As senhas não coincidem. Digite novamente.');
      return;
    }

    if (newPassword.length < 10) {
      setPassChangeError('A nova senha deve ter no mínimo 10 caracteres.');
      return;
    }
    
    if (!/[A-Z]/.test(newPassword)) {
      setPassChangeError('A nova senha deve ter pelo menos uma letra maiúscula.');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setPassChangeError('A nova senha deve ter pelo menos uma letra minúscula.');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setPassChangeError('A nova senha deve ter pelo menos um número.');
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      setPassChangeError('A nova senha deve ter pelo menos um caractere especial.');
      return;
    }

    const currentTypedPass = activeTabType === 'internal' ? internalPassword.trim() : clientPassword.trim();
    if (newPassword === currentTypedPass) {
      setPassChangeError('A nova senha não pode ser igual à senha atual.');
      return;
    }

    setIsSavingPass(true);
    try {
      if (legacyAuthSuccess) {
        await createUserWithEmailAndPassword(auth, pendingUserEmail, newPassword);
      } else {
        if (auth.currentUser) {
          await updatePassword(auth.currentUser, newPassword);
        } else {
           throw new Error("Usuário não está autenticado para trocar a senha.");
        }
      }
      
      if (activeTabType === 'internal' && onUpdateInternalUser && pendingChangeUser?.id) {
        await onUpdateInternalUser(pendingChangeUser.id, { passwordChangeRequired: false, mustChangePassword: false });
        if (auth.currentUser) {
          await auth.currentUser.getIdToken(true);
        }
        onLoginSuccessInternal(pendingChangeUser);
      } else if (activeTabType === 'client' && pendingChangeUser?.id) {
        await fetch('/api/auth/clear-password-change', {
           method: 'POST',
           headers: {'Content-Type': 'application/json'},
           body: JSON.stringify({ id: pendingChangeUser.id, type: 'client' })
        });
        if (auth.currentUser) {
          await auth.currentUser.getIdToken(true);
        }
        onLoginSuccessClient(pendingChangeUser as unknown as Client);
      }

    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
         setPassChangeError('Esta conta já foi migrada. Por favor, faça login usando sua NOVA senha.');
      } else {
         setPassChangeError('Erro ao atualizar senha no Firebase: ' + err.message);
      }
    } finally {
      setIsSavingPass(false);
    }
  };
`;

const startIndex = code.indexOf('const handleInternalSubmit');
const endIndex = code.indexOf('if (pendingChangeUser && passwordChangeRequired) {');

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + newMethods + '\n  ' + code.substring(endIndex);
  fs.writeFileSync('src/components/LoginScreen.tsx', code);
  console.log('Fixed methods!');
} else {
  console.log('Could not find bounds');
}
