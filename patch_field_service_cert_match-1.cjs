const fs = require('fs');

let fsContent = fs.readFileSync('src/components/FieldService.tsx', 'utf-8');

fsContent = fsContent.replace(
  "const matchingInst = instruments.find(i => i.certificateNumber && record.certificate && i.certificateNumber.toLowerCase() === record.certificate.toLowerCase());",
  `const extractNum = (s) => String(s || '').replace(/\\D/g, '');
                        const recNum = extractNum(record.certificate);
                        const matchingInst = instruments.find(i => {
                          const instNum = extractNum(i.certificateNumber);
                          return instNum && recNum && instNum === recNum;
                        });`
);

fs.writeFileSync('src/components/FieldService.tsx', fsContent);
console.log("Patched FieldService logic.");
