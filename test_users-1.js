import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function test() {
  try {
    const signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'master@comanins.internal',
        password: 'masterPassword123!',
        returnSecureToken: true
      })
    });
    const signInData = await signInRes.json();
    if (!signInRes.ok) throw new Error('Sign In Error: ' + JSON.stringify(signInData));
    
    const idToken = signInData.idToken;

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/systemSettings/customLogo`;
    const res = await fetch(firestoreUrl, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: { url: { stringValue: 'test' } }
      })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

test();
