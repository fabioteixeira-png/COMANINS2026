const fs = require('fs');
const content = fs.readFileSync('src/components/InternalPortal_clean.tsx', 'utf8');

const formStart = content.indexOf('<form', 10000); 
const afterForm = content.substring(formStart);

let match;
let code = afterForm.replace(/`(?:\\.|[^`])*`/g, '""').replace(/'(?:\\.|[^'])*'/g, '""').replace(/"(?:\\.|[^"])*"/g, '""');

let divCount = 0;
const tagRegex = /<\/?div[^>]*>/g;
while ((match = tagRegex.exec(code)) !== null) {
    if (match[0].startsWith('</')) divCount--;
    else if (!match[0].endsWith('/>')) divCount++;
}

console.log("Net divs inside form:", divCount);
