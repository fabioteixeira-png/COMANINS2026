const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Revert the wrong injection in PATCH
code = code.replace(
  /const rentalId = asLimitedString\(req\.params\.id, 180\);\n  const manualInvoiceNumber = asLimitedString\(req\.body\.invoiceNumber, 180\);\n  if \(!manualInvoiceNumber\) return res\.status\(400\)\.json\(\{ error: 'INVOICE_NUMBER_REQUIRED' \}\);/g,
  'const rentalId = asLimitedString(req.params.id, 180);'
);

// Add the correct injection in POST invoices
const correctPost = `app.post('/api/rentals/contracts/:id/invoices', requireAuth, requireInternalAccount, requireEditModule('rental'), writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const rentalId = asLimitedString(req.params.id, 180);
  const manualInvoiceNumber = asLimitedString(req.body.invoiceNumber, 180);
  if (!manualInvoiceNumber) return res.status(400).json({ error: 'INVOICE_NUMBER_REQUIRED' });`;

code = code.replace(
  /app\.post\('\/api\/rentals\/contracts\/:id\/invoices', requireAuth, requireInternalAccount, requireEditModule\('rental'\), writeApiRateLimit, async \(req: AuthRequest, res\) => \{\n  if \(!firestoreDb\) return res\.status\(503\)\.json\(\{ error: 'AUTH_SERVICE_UNAVAILABLE' \}\);\n  const rentalId = asLimitedString\(req\.params\.id, 180\);/,
  correctPost
);

fs.writeFileSync('server.ts', code);
