import fs from 'fs';

let code = fs.readFileSync('src/components/LoginScreen.tsx', 'utf-8');

// Import sendPasswordResetEmail
if (!code.includes('sendPasswordResetEmail')) {
    code = code.replace(
        "import { signInWithEmailAndPassword",
        "import { signInWithEmailAndPassword, sendPasswordResetEmail"
    );
}

// Add the function
if (!code.includes('const handleForgotPassword')) {
    const resetFn = `
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setResetSuccess(false);
    
    if (!resetEmail) {
      setErrorMsg('Por favor, informe seu e-mail para recuperação.');
      return;
    }
    
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess(true);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
         setResetSuccess(true);
      } else if (err.code === 'auth/invalid-email') {
         setErrorMsg('E-mail inválido.');
      } else {
         setErrorMsg('Erro ao tentar redefinir a senha. Verifique o e-mail ou contate o suporte.');
      }
    }
  };
`;
    // Find where to insert it, before handleInternalSubmit
    code = code.replace(
        "const handleInternalSubmit =",
        resetFn + "\n  const handleInternalSubmit ="
    );
}

fs.writeFileSync('src/components/LoginScreen.tsx', code);
