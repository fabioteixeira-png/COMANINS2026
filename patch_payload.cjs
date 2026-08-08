const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

content = content.replace(
  '      visualized: false,\\n      pdfBase64: newPayslipPdfBase64,',
  '      visualized: false,\\n      documentType: newPayslipDocumentType,\\n      pdfBase64: newPayslipPdfBase64,'
);

// We need to also clear `newPayslipDocumentType` on form reset
content = content.replace(/setNewPayslipMonth\(""\);/g, 'setNewPayslipMonth("");\\n      setNewPayslipDocumentType("holerite");');

fs.writeFileSync('src/components/InternalPortal.tsx', content);
