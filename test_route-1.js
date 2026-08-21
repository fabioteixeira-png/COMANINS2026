import fetch from 'node-fetch';
fetch('http://localhost:3000/api/auth/legacy-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'master', password: 'masterPassword123!', type: 'internal' })
}).then(res => res.json()).then(console.log).catch(console.error);
