const fs = require('fs');
let code = fs.readFileSync('src/components/InternalCommunication.tsx', 'utf8');

code = code.replace(/currentUser\.username/g, 'currentUser.id');
code = code.replace(/currentUser\?\.username/g, 'currentUser?.id');

fs.writeFileSync('src/components/InternalCommunication.tsx', code);
