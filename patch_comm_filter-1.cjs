const fs = require('fs');
let code = fs.readFileSync('src/components/InternalCommunication.tsx', 'utf8');

const target = `  const filteredTickets = tickets.filter(t => {
    if (!isFinanceOrAdmin && t.creatorId !== currentUser?.username) return false;`;

const replace = `  const filteredTickets = tickets.filter(t => {
    const isCreator = t.creatorId === currentUser?.username || t.creatorName === currentUser?.name || t.creatorName === currentUser?.username;
    if (!isFinanceOrAdmin && !isCreator) return false;`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/InternalCommunication.tsx', code);
