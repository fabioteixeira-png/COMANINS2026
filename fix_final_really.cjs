const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

// I will extract the whole component form section again but more carefully.
// The syntax error is: src/components/InternalPortal.tsx(1865,41): error TS1381: Unexpected token. Did you mean `{'}'}` or `&rbrace;`?
// Let's manually reconstruct the component.
// I will just download the original text if I can find it. But wait, I have it in form_dump.txt!
let formDump = fs.readFileSync('form_dump.txt', 'utf-8');
const formLines = formDump.split('\n');

// Wait! form_dump.txt has line numbers!
// 1850                      }
// 1851                      setShowInstForm(!showInstForm);
// I need to strip those correctly!
const cleanedFormLines = formLines.map(line => {
    // Regex to remove leading whitespace and numbers, followed by a tab or space
    const res = line.replace(/^\s*\d+[\t\s]+/, '');
    return res;
});

let originalFormStr = cleanedFormLines.join('\n');

// Find where to replace
const match = content.match(/<form onSubmit=\{handleInstrumentSubmit\}[\s\S]*?<\/form>/);
if (match) {
    // wait, what if the match is broken? The whole form is broken.
}

// Let's just find the start of the form:
const startIdx = content.indexOf('<form onSubmit={handleInstrumentSubmit}');
// the end of the form was:
const endIdx = content.indexOf('</form>', startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const origFormMatch = originalFormStr.match(/<form onSubmit=\{handleInstrumentSubmit\}[\s\S]*?<\/form>/);
    if (origFormMatch) {
         content = content.substring(0, startIdx) + origFormMatch[0] + content.substring(endIdx + 7);
         fs.writeFileSync('src/components/InternalPortal.tsx', content);
         console.log("Restored form strictly between <form... and </form>");
    } else {
         console.log("Could not find <form> in originalFormStr");
    }
}
