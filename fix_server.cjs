const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Get manual invoiceNumber
code = code.replace(
  /const rentalId = asLimitedString\(req\.params\.id, 180\);/,
  'const rentalId = asLimitedString(req.params.id, 180);\n  const manualInvoiceNumber = asLimitedString(req.body.invoiceNumber, 180);\n  if (!manualInvoiceNumber) return res.status(400).json({ error: \'INVOICE_NUMBER_REQUIRED\' });'
);

// Update sequenceNumber/invoiceNumber logic
code = code.replace(
  /const sequenceNumber = currentSettings\.nextInvoiceNumber;\s*const invoiceNumber = `\$\{currentSettings\.invoicePrefix\}\$\{sequenceNumber\}`;/,
  'const sequenceNumber = currentSettings.nextInvoiceNumber;\n      const invoiceNumber = manualInvoiceNumber;'
);

// Update monthlyPrice to handle renewalPrice
code = code.replace(
  /monthlyPrice: Number\(Number\(item\.monthlyPrice \|\| 0\)\.toFixed\(2\)\),/,
  'monthlyPrice: Number(Number(cycleIndex > 0 ? (item.renewalPrice ?? item.monthlyPrice || 0) : (item.monthlyPrice || 0)).toFixed(2)),'
);

fs.writeFileSync('server.ts', code);
