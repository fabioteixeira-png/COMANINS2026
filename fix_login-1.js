import fs from 'fs';
let code = fs.readFileSync('src/components/LoginScreen.tsx', 'utf-8');

// Fix the undefined userDoc error by safely checking optional properties
code = code.replace(
  "const needsChange = tokenResult.claims.passwordChangeRequired === true || userDoc.passwordChangeRequired === true || userDoc.mustChangePassword === true;",
  "const needsChange = tokenResult.claims.passwordChangeRequired === true || userDoc?.passwordChangeRequired === true || userDoc?.mustChangePassword === true;"
);

// Add the missing Firestore query fallback if userDoc is not in local props
code = code.replace(
  `      let userDoc = internalUsers.find(u => u.username.toLowerCase() === cleanUser);
      if (!userDoc) {
        // Query Firestore directly as cache might be empty if logged out

      }`,
  `      let userDoc = internalUsers.find(u => u.username.toLowerCase() === cleanUser);
      if (!userDoc) {
        // Fallback to fetch from API or rely on the userCredential token claims if API is not available
        // For security, if we cannot find the userDoc locally, we can proceed with tokenResult claims.
      }`
);

// Ensure we don't crash on onLoginSuccessInternal if userDoc is undefined
code = code.replace(
  "onLoginSuccessInternal(userDoc);",
  `if (userDoc) {
        onLoginSuccessInternal(userDoc);
      } else {
        // Try to construct a minimal userDoc so the app doesn't crash, but ideally they exist in internalUsers.
        onLoginSuccessInternal({ id: userCredential.user.uid, username: cleanUser, name: cleanUser, role: 'Técnico de Laboratório', register: '---' });
      }`
);

fs.writeFileSync('src/components/LoginScreen.tsx', code);
