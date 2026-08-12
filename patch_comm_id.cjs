const fs = require('fs');
let code = fs.readFileSync('src/components/InternalCommunication.tsx', 'utf8');

code = code.replace(/currentUser\.id/g, 'currentUser.username');
code = code.replace(/currentUser\?\.id/g, 'currentUser?.username');

fs.writeFileSync('src/components/InternalCommunication.tsx', code);
