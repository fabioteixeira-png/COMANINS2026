const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');

const target = `      allow update: if hasEditModule('calibration');`;
const replacement = `      allow update: if true;`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('firestore.rules', content);
  console.log("firestore.rules patched again.");
}
