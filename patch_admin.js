import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  "import { initializeApp, getApps } from 'firebase-admin/app';",
  "import { initializeApp, getApps, cert } from 'firebase-admin/app';"
);

const oldInit = `let firebaseAdminApp;
if (!getApps().length) {
  firebaseAdminApp = initializeApp({ projectId: firebaseConfig.projectId });
} else {
  firebaseAdminApp = getApps()[0];
}`;

const newInit = `let firebaseAdminApp;
if (!getApps().length) {
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountEnv) {
    try {
      const serviceAccount = serviceAccountEnv.trim().startsWith('{') 
        ? JSON.parse(serviceAccountEnv) 
        : JSON.parse(Buffer.from(serviceAccountEnv, 'base64').toString('utf8'));
        
      firebaseAdminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: firebaseConfig.projectId
      });
      console.log('✅ Firebase Admin SDK inicializado com FIREBASE_SERVICE_ACCOUNT_KEY.');
    } catch (e) {
      console.error('❌ Erro ao parsear FIREBASE_SERVICE_ACCOUNT_KEY. Verifique se é um JSON válido ou Base64:', e);
      firebaseAdminApp = initializeApp({ projectId: firebaseConfig.projectId });
    }
  } else {
    console.warn('⚠️ AVISO: A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida.');
    console.warn('⚠️ O Firebase Admin SDK usará credenciais padrão da máquina, o que causará erros de PERMISSION_DENIED no Firestore.');
    firebaseAdminApp = initializeApp({ projectId: firebaseConfig.projectId });
  }
} else {
  firebaseAdminApp = getApps()[0];
}`;

code = code.replace(oldInit, newInit);

// Also need to improve the error message on legacy login catch block
const oldCatch = `  } catch (error) {
    console.error("Legacy login error:", error);
    res.status(500).json({ error: "Erro de servidor ao validar credencial antiga." });
  }`;

const newCatch = `  } catch (error: any) {
    console.error("Legacy login error:", error);
    if (error.code === 7 || (error.message && error.message.includes('PERMISSION_DENIED'))) {
        console.error("\\n\\n[ERRO CRÍTICO DE PERMISSÃO]");
        console.error("O servidor Node.js não possui permissão para ler o banco de dados.");
        console.error("Você precisa configurar a variável de ambiente: FIREBASE_SERVICE_ACCOUNT_KEY");
        console.error("com o JSON da conta de serviço (Service Account) do Firebase.\\n\\n");
    }
    res.status(500).json({ error: "Erro de servidor ao validar credencial antiga." });
  }`;

code = code.replace(oldCatch, newCatch);

fs.writeFileSync('server.ts', code);
