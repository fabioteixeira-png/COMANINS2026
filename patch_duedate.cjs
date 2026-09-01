const fs = require('fs');
let content = fs.readFileSync('src/components/RentalManagement.tsx', 'utf8');

content = content.replace(
  "setManualDueDate(todayIso());",
  "setManualDueDate('');"
);

fs.writeFileSync('src/components/RentalManagement.tsx', content);
