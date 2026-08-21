const fs = require('fs');
let code = fs.readFileSync('src/components/InternalCommunication.tsx', 'utf8');

code = code.replace(/senderId: currentUser\.id,/, 'senderId: currentUser.username || currentUser.id,');
code = code.replace(/senderName: currentUser\.name \|\| currentUser\.id,/, 'senderName: currentUser.name || currentUser.username || currentUser.id,');

fs.writeFileSync('src/components/InternalCommunication.tsx', code);
