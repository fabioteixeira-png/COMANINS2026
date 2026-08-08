const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

let origForm = fs.readFileSync('form_dump.txt', 'utf-8');
const lines = origForm.split('\n');
const strippedFormLines = lines.map(line => line.replace(/^\s*\d+\t/, ''));
let originalFormStr = strippedFormLines.join('\n');

const currentMatch = content.match(/<form onSubmit=\{handleInstrumentSubmit\}[\s\S]*?<\/form>/);
if (currentMatch) {
  content = content.replace(currentMatch[0], originalFormStr);
  fs.writeFileSync('src/components/InternalPortal.tsx', content);
  console.log("Reverted form completely to original form dump");
} else {
  console.log("Could not find bad form to replace");
}
