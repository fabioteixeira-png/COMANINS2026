const fs = require('fs');
let fb = fs.readFileSync('src/lib/firebase.ts', 'utf8');
fb = fb.replace(
  'export const generateRentalInvoice = async (id: string): Promise<{ invoice: RentalInvoice; financeTransactionId: string }> => {',
  'export const generateRentalInvoice = async (id: string, payload: { invoiceNumber?: string } = {}): Promise<{ invoice: RentalInvoice; financeTransactionId: string }> => {'
);
fb = fb.replace(
  '    body: JSON.stringify({}),',
  '    body: JSON.stringify(payload),'
);
fs.writeFileSync('src/lib/firebase.ts', fb);

let rm = fs.readFileSync('src/components/RentalManagement.tsx', 'utf8');
rm = rm.replace(
  `      const response = await fetch(\`/api/rentals/contracts/\${invoicePromptTarget.id}/invoices\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${(window as any).currentUserToken}\` },
        body: JSON.stringify({ invoiceNumber: manualInvoiceNumber.trim() })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Não foi possível gerar a fatura.');
      }
      const result = await response.json();`,
  `      const result = await generateRentalInvoice(invoicePromptTarget.id, { invoiceNumber: manualInvoiceNumber.trim() });`
);
fs.writeFileSync('src/components/RentalManagement.tsx', rm);
