const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

// I will just undo what I did by replacing actual newlines with "\n" in split?
// Actually I can just fix `.split("
// ")` to `.split("\\n")`

content = content.replace(/\.split\("([^"]*)\n([^"]*)"\)/g, '.split("$1\\\\n$2")');
fs.writeFileSync('src/components/InternalPortal.tsx', content);
