import express from 'express';
const app = express();
app.post('/api/auth/legacy-login', (req, res) => {
  const error = new Error('7 PERMISSION_DENIED: Missing or insufficient permissions.');
  error.code = 7;
  console.error("Legacy login error:", error);
  if (error.code === 7 || (error.message && error.message.includes('PERMISSION_DENIED'))) {
      console.error("\n\n[ERRO CRÍTICO DE PERMISSÃO]");
      console.error("O servidor Node.js não possui permissão para ler o banco de dados.");
      console.error("Você precisa configurar as variáveis de ambiente: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL e FIREBASE_ADMIN_PRIVATE_KEY");
      console.error("com o JSON da conta de serviço (Service Account) do Firebase.\n\n");
  }
  res.status(500).json({ error: "Erro de servidor ao validar credencial antiga." });
});
app.listen(3001, async () => {
  try {
    const fetch = (await import('node-fetch')).default;
    const res = await fetch('http://localhost:3001/api/auth/legacy-login', { method: 'POST' });
    console.log('Status:', res.status);
    console.log('Headers:', res.headers.raw());
    const text = await res.text();
    console.log('Body:', text);
  } catch(e) {
    console.error('Fetch threw!', e);
  }
  process.exit(0);
});
