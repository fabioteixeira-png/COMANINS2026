const fs = require('fs');
const content = fs.readFileSync('src/components/InternalPortal_clean.tsx', 'utf8');

const formStart = content.indexOf('<form', 10000); 
const afterForm = content.substring(formStart);

let match;
let code = afterForm.replace(/`(?:\\.|[^`])*`/g, '""').replace(/'(?:\\.|[^'])*'/g, '""').replace(/"(?:\\.|[^"])*"/g, '""');

const tagRegex = /<\/?div[^>]*>/g;
while ((match = tagRegex.exec(code)) !== null) {
    console.log(match[0]);
}
