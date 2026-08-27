const fs = require('fs');
const content = fs.readFileSync('src/components/InternalPortal_clean.tsx', 'utf8');

const formStart = content.indexOf('<form', 10000); // 10476 roughly
const formContent = content.substring(formStart);

let divCount = 0;
const tagRegex = /<\/?div[^>]*>/g;
let match;
while ((match = tagRegex.exec(formContent)) !== null) {
    if (match[0].startsWith('</')) divCount--;
    else divCount++;
}

console.log("Net div count inside form:", divCount);
