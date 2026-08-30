const fs = require('fs');
let code = fs.readFileSync('src/components/RentalManagement.tsx', 'utf8');

code = code.replace(
  /const \[printDocument, setPrintDocument\] = useState<PrintDocument>\(null\);/,
  'const [printDocument, setPrintDocument] = useState<PrintDocument>(null);\n  const [invoicePromptTarget, setInvoicePromptTarget] = useState<RentalContract | null>(null);\n  const [manualInvoiceNumber, setManualInvoiceNumber] = useState(\'\');'
);

fs.writeFileSync('src/components/RentalManagement.tsx', code);
