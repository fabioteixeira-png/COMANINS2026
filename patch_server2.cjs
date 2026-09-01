const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  "const returnDate = rentalDate(req.body?.date || new Date().toISOString().slice(0, 10));",
  "const returnDate = rentalDate(req.body?.date || new Date().toISOString().slice(0, 10));\n  const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments.slice(0, 10).map(String) : [];"
);

content = content.replace(
  "        responsibleClientDocument,\n        items: movementItems,",
  "        responsibleClientDocument,\n        items: movementItems,\n        attachments,"
);

fs.writeFileSync('server.ts', content);
