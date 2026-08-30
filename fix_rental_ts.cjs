const fs = require('fs');
let code = fs.readFileSync('src/components/RentalManagement.tsx', 'utf8');

code = code.replace(
  /onClick=\{\(\) => void issueInvoice\(rental\)\}/g,
  'onClick={() => { setInvoicePromptTarget(rental); setManualInvoiceNumber(rental.processNumber || \'\'); }}'
);

code = code.replace(
  / \|\| currentUser\?\.profile === 'administrator' \|\| currentUser\?\.profile === 'Administrador'/g,
  ''
);

fs.writeFileSync('src/components/RentalManagement.tsx', code);
