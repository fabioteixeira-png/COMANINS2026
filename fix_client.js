import fs from 'fs';
let code = fs.readFileSync('src/components/LoginScreen.tsx', 'utf-8');

code = code.replace(
  `const needsChange = tokenResult.claims.passwordChangeRequired === true || clientDoc.passwordChangeRequired === true;`,
  `const needsChange = tokenResult.claims.passwordChangeRequired === true || clientDoc?.passwordChangeRequired === true || (clientDoc && clientDoc.passwordChangeRequired !== false);`
);

fs.writeFileSync('src/components/LoginScreen.tsx', code);
