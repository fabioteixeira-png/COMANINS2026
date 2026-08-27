const fs = require('fs');
const content = fs.readFileSync('src/components/InternalPortal_clean.tsx', 'utf8');

// simple regex to find open and close tags, skipping self-closing
const tagRegex = /<\/?([a-zA-Z0-9]+)[^>]*>/g;
let match;
const tags = [];
while ((match = tagRegex.exec(content)) !== null) {
    const fullTag = match[0];
    const tagName = match[1];
    
    if (fullTag.endsWith('/>')) continue;
    
    if (fullTag.startsWith('</')) {
        // close tag
        if (tags.length > 0 && tags[tags.length - 1] === tagName) {
            tags.pop();
        } else {
            // maybe unclosed or mismatched, try to pop until match
            let found = -1;
            for(let i = tags.length-1; i>=0; i--) {
                if(tags[i] === tagName) {
                    found = i;
                    break;
                }
            }
            if (found !== -1) {
                tags.splice(found, tags.length - found);
            }
        }
    } else {
        // open tag
        // ignore br, input, img, hr, etc
        if (!['br', 'input', 'img', 'hr', 'meta', 'link'].includes(tagName)) {
            tags.push(tagName);
        }
    }
}

console.log("Open tags remaining:", tags);
