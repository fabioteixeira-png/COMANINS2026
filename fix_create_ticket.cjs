const fs = require('fs');
let code = fs.readFileSync('src/components/InternalCommunication.tsx', 'utf8');

code = code.replace('creatorName: currentUser.name || currentUser.id', 'creatorName: currentUser.name || currentUser.username');
code = code.replace('creatorEmail: currentUser.id', 'creatorEmail: currentUser.username');

fs.writeFileSync('src/components/InternalCommunication.tsx', code);
