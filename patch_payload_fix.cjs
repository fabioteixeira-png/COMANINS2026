const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target = `      visualized: false,
      pdfBase64: newPayslipPdfBase64,`;

const replacement = `      visualized: false,
      documentType: newPayslipDocumentType,
      pdfBase64: newPayslipPdfBase64,`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/InternalPortal.tsx', content);
