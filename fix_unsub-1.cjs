const fs = require('fs');
let code = fs.readFileSync('src/components/InternalCommunication.tsx', 'utf8');

const target = `    unsub.then(u => u && u()); return () => { unsub.then(u => u && u()) };`;
const replace = `    return () => { unsub.then(u => u && u()) };`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/InternalCommunication.tsx', code);
