const fs = require('fs');
const content = fs.readFileSync('src/components/InternalPortal_clean.tsx', 'utf8');

// find all open JSX tags and brackets from the start to formStart
const formStart = content.indexOf('<form', 10000); // 10476 roughly
const prefix = content.substring(0, formStart);

let divCount = 0;
const tagRegex = /<\/?div[^>]*>/g;
let match;
while ((match = tagRegex.exec(prefix)) !== null) {
    if (match[0].startsWith('</')) divCount--;
    else if (!match[0].endsWith('/>')) divCount++;
}

console.log("Net div count outside form:", divCount);
