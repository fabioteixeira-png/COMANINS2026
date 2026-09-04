const fs = require('fs');
const file = 'src/utils/certificateDomPdf.ts';
let content = fs.readFileSync(file, 'utf8');

if (content.includes("frame?.iframe.remove()")) {
    console.log("iframe remove still present!");
}
