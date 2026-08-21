import fs from 'fs';
const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf-8'));

async function test() {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'testrest@comanins.internal',
      password: 'TestPassword123!',
      returnSecureToken: false
    })
  });
  const data = await res.json();
  console.log(data);
}
test().catch(console.error);
