import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function createMaster() {
  const username = 'master';
  const email = 'master@comanins.internal';
  const password = 'masterPassword123!';
  const role = 'Administrador';
  const name = 'Master Admin';

  try {
    // 1. Create in Firebase Auth
    const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true
      })
    });
    
    const authData = await authRes.json();
    if (!authRes.ok) {
      if (authData.error && authData.error.message === 'EMAIL_EXISTS') {
        console.log('User already exists in Auth. Proceeding to create/update in Firestore...');
        // We can't update password easily without admin sdk or sign in, but that's fine.
      } else {
        throw new Error('Auth Error: ' + JSON.stringify(authData));
      }
    } else {
      console.log('Created user in Auth. UID:', authData.localId);
    }

    // 2. We need to write to Firestore, but the rules are `request.auth != null`.
    // We can sign in as the user to get an idToken, then write to Firestore!
    
    const signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true
      })
    });
    const signInData = await signInRes.json();
    if (!signInRes.ok) throw new Error('Sign In Error: ' + JSON.stringify(signInData));
    
    const idToken = signInData.idToken;
    const uid = signInData.localId;
    
    // Write to Firestore using REST API
    const docId = 'u_master_' + Date.now();
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/portalUsers/${docId}`;
    
    const fsRes = await fetch(firestoreUrl, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        fields: {
          id: { stringValue: docId },
          name: { stringValue: name },
          username: { stringValue: username },
          role: { stringValue: role },
          permissionLevel: { stringValue: 'Administrador' },
          register: { stringValue: '0000' },
          passwordChangeRequired: { booleanValue: false }
        }
      })
    });
    
    const fsData = await fsRes.json();
    if (!fsRes.ok) throw new Error('Firestore Error: ' + JSON.stringify(fsData));
    
    console.log('Successfully created master user in Firestore:', docId);
    console.log(`\n\nLogin credentials:\nEmail/Username: ${username} (or ${email})\nPassword: ${password}\n`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createMaster();
