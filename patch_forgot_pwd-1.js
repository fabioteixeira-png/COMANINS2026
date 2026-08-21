import fs from 'fs';
let code = fs.readFileSync('src/components/LoginScreen.tsx', 'utf-8');

// We need to add "Forgot Password" state and handler.
// First, check if sendPasswordResetEmail is imported.
if (!code.includes('sendPasswordResetEmail')) {
    code = code.replace(
        "import { signInWithEmailAndPassword } from 'firebase/auth';",
        "import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';"
    );
}

// State for forgot password
if (!code.includes('showForgotPassword')) {
    code = code.replace(
        "const [errorMsg, setErrorMsg] = useState('');",
        "const [errorMsg, setErrorMsg] = useState('');\n  const [showForgotPassword, setShowForgotPassword] = useState(false);\n  const [resetEmail, setResetEmail] = useState('');\n  const [resetSuccess, setResetSuccess] = useState(false);"
    );
}

// Function to handle forgot password
const resetFunction = `
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
         // Security best practice: don't reveal if email exists, but for UX we might say email sent anyway
         setResetSuccess(true);
      } else if (err.code === 'auth/invalid-email') {
         setErrorMsg('E-mail inválido.');
      } else {
         setErrorMsg('Erro ao tentar redefinir a senha. Verifique o e-mail ou contate o suporte.');
      }
    }
  };
`;

if (!code.includes('handleForgotPassword')) {
    code = code.replace(
        "const handleLoginInternal = async (e: React.FormEvent) => {",
        resetFunction + "\n  const handleLoginInternal = async (e: React.FormEvent) => {"
    );
}

fs.writeFileSync('src/components/LoginScreen.tsx', code);
