const fs = require('fs');
const content = fs.readFileSync('src/components/InternalPortal_clean.tsx', 'utf8');

const tabStart = content.indexOf('{activeTab === "etiquetas"');
const remaining = content.substring(tabStart);

let divCount = 0;
const tagRegex = /<\/?div[^>]*>/g;
let match;
while ((match = tagRegex.exec(remaining)) !== null) {
    if (match[0].startsWith('</')) divCount--;
    else if (!match[0].endsWith('/>')) divCount++;
}

console.log("Net div count in remaining:", divCount);
