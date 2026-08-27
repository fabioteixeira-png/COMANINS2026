const fs = require('fs');
const content = fs.readFileSync('src/components/InternalPortal_clean.tsx', 'utf8');

const formStart = content.indexOf('<form', 10000); 
const formContent = content.substring(formStart);

const tagRegex = /<\/?([a-zA-Z0-9]+)[\s>]/g;
let match;
let code = formContent.replace(/`(?:\\.|[^`])*`/g, '""').replace(/'(?:\\.|[^'])*'/g, '""').replace(/"(?:\\.|[^"])*"/g, '""');

let count = 0;
while ((match = tagRegex.exec(code)) !== null && count < 20) {
    console.log(match[0]);
    count++;
}
