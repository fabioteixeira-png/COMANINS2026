import fetch from 'node-fetch';
fetch('http://localhost:3000/api/auth/legacy-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'fabio.teixeira', password: 'somepassword', type: 'internal' })
}).then(async res => {
  console.log(res.headers.get('content-type'));
  const text = await res.text();
  console.log(text.substring(0, 100));
});
