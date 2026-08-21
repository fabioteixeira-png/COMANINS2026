const fs = require('fs');
let code = fs.readFileSync('src/components/InternalCommunication.tsx', 'utf8');

const target = `  const filteredTickets = tickets.filter(t => {`;
const replace = `  console.log("ALL TICKETS:", tickets.length, tickets);
  console.log("CURRENT USER:", currentUser);
  console.log("IS FINANCE OR ADMIN:", isFinanceOrAdmin);
  const filteredTickets = tickets.filter(t => {`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/InternalCommunication.tsx', code);
