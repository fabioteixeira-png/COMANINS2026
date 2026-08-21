import fs from 'fs';
let code = fs.readFileSync('src/components/LoginScreen.tsx', 'utf-8');

code = code.replace(
  `const needsChange = tokenResult.claims.passwordChangeRequired === true || 
                          userDoc?.passwordChangeRequired === true || 
                          userDoc?.passwordChangeRequired === "true" || 
                          userDoc?.mustChangePassword === true || 
                          userDoc?.mustChangePassword === "true";`,
  `const needsChange = tokenResult.claims.passwordChangeRequired === true || 
                          userDoc?.passwordChangeRequired === true || 
                          userDoc?.passwordChangeRequired === "true" || 
                          userDoc?.mustChangePassword === true || 
                          userDoc?.mustChangePassword === "true" || 
                          (userDoc && userDoc.passwordChangeRequired !== false);`
);

fs.writeFileSync('src/components/LoginScreen.tsx', code);
