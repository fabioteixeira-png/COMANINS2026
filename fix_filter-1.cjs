const fs = require('fs');
let code = fs.readFileSync('src/components/InternalCommunication.tsx', 'utf8');

const target = `    const isCreator = t.creatorId === currentUser?.id || t.creatorName === currentUser?.name || t.creatorName === currentUser?.id;`;
const replace = `    const isCreator = t.creatorId === currentUser?.username || t.creatorId === currentUser?.id || t.creatorName === currentUser?.name || t.creatorName === currentUser?.username;`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/InternalCommunication.tsx', code);
