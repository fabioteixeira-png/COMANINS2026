import fs from 'fs';
let code = fs.readFileSync('src/components/LoginScreen.tsx', 'utf-8');

code = code.replace(
  `      if (userDoc) {
        onLoginSuccessInternal(userDoc);
      } else {
        // Try to construct a minimal userDoc so the app doesn't crash, but ideally they exist in internalUsers.
        onLoginSuccessInternal({ id: userCredential.user.uid, username: cleanUser, name: cleanUser, role: 'Técnico de Laboratório', register: '---' });
      }`,
  `      if (userDoc) {
        onLoginSuccessInternal(userDoc);
      } else {
        setErrorMsg('Usuário autenticado, mas cadastro não encontrado no banco de dados (portalUsers). Contate o administrador para vincular a conta.');
        return;
      }`
);

fs.writeFileSync('src/components/LoginScreen.tsx', code);
