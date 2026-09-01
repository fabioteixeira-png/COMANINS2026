const fs = require('fs');
let content = fs.readFileSync('src/lib/firebase.ts', 'utf8');

content = content.replace(
  "export const generateRentalInvoice = async (id: string, payload: { invoiceNumber?: string } = {}): Promise<{ invoice: RentalInvoice; financeTransactionId: string }> => {",
  "export const generateRentalInvoice = async (id: string, payload: { invoiceNumber?: string; dueDate?: string } = {}): Promise<{ invoice: RentalInvoice; financeTransactionId: string }> => {"
);

fs.writeFileSync('src/lib/firebase.ts', content);
