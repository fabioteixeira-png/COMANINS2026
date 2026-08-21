const fs = require('fs');
let code = fs.readFileSync('src/components/InternalCommunication.tsx', 'utf8');

code = code.replace(/creatorId: currentUser\.id/, 'creatorId: currentUser.username || currentUser.name');

fs.writeFileSync('src/components/InternalCommunication.tsx', code);
