const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const target = "const dueDate = rentalAddDays(rentalForCycle.firstDueDate, cycleIndex * RENTAL_BILLING_DAYS);";

const replacement = `const manualDueDate = asLimitedString(req.body.dueDate, 10);
  const dueDate = manualDueDate || rentalAddDays(rentalForCycle.firstDueDate, cycleIndex * RENTAL_BILLING_DAYS);`;

content = content.replace(target, replacement);

fs.writeFileSync('server.ts', content);
