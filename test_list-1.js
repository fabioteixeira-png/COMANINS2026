import fs from 'fs';
const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf-8'));

async function test() {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${firebaseConfig.projectId}/accounts:lookup?key=${firebaseConfig.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ['testrest@comanins.internal']
    })
  });
  const data = await res.json();
  console.log(data);
}
test().catch(console.error);
