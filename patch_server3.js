import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  `      const userData = user.data();
      if ((userData.password || '').trim() === password.trim()) {
        return res.json({ valid: true, id: user.id });
      }`,
  `      const userData = user.data();
      if ((userData.password || '').trim() === password.trim()) {
        return res.json({ valid: true, user: { ...userData, id: user.id } });
      }`
);

code = code.replace(
  `      const clientData = client.data();
      if ((clientData.password || '').trim() === password.trim()) {
        return res.json({ valid: true, id: client.id });
      }`,
  `      const clientData = client.data();
      if ((clientData.password || '').trim() === password.trim()) {
        return res.json({ valid: true, user: { ...clientData, id: client.id } });
      }`
);

fs.writeFileSync('server.ts', code);
