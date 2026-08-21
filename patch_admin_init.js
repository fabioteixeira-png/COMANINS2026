import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

const oldInit = `let firebaseAdminApp;
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

const newInit = `let firebaseAdminApp;
if (!getApps().length) {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  const missingVars = [];
  if (!projectId) missingVars.push('FIREBASE_ADMIN_PROJECT_ID');
  if (!clientEmail) missingVars.push('FIREBASE_ADMIN_CLIENT_EMAIL');
  if (!privateKey) missingVars.push('FIREBASE_ADMIN_PRIVATE_KEY');

  if (missingVars.length === 0) {
    try {
      firebaseAdminApp = initializeApp({
        credential: cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: privateKey.replace(/\\\\n/g, '\\n'),
        }),
        projectId: firebaseConfig.projectId
      });
      console.log('✅ Firebase Admin SDK inicializado com variáveis de ambiente dedicadas.');
    } catch (e) {
      console.error('❌ Erro ao inicializar Firebase Admin SDK com as credenciais fornecidas:', e);
      firebaseAdminApp = initializeApp({ projectId: firebaseConfig.projectId });
    }
  } else {
    console.warn(\`⚠️ AVISO: As seguintes variáveis de ambiente estão ausentes: \${missingVars.join(', ')}\`);
    console.warn('⚠️ O Firebase Admin SDK usará credenciais padrão da máquina, o que causará erros de PERMISSION_DENIED no Firestore.');
    firebaseAdminApp = initializeApp({ projectId: firebaseConfig.projectId });
  }
} else {
  firebaseAdminApp = getApps()[0];
}`;

code = code.replace(oldInit, newInit);

code = code.replace(
  'console.error("Você precisa configurar a variável de ambiente: FIREBASE_SERVICE_ACCOUNT_KEY");',
  'console.error("Você precisa configurar as variáveis de ambiente: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL e FIREBASE_ADMIN_PRIVATE_KEY");'
);

code = code.replace(
  'console.error("com o JSON da conta de serviço (Service Account) do Firebase.\\\\n\\\\n");',
  'console.error("com os valores da conta de serviço (Service Account) do Firebase.\\\\n\\\\n");'
);

fs.writeFileSync('server.ts', code);
