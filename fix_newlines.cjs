const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

// I will just look for `.split("\n")` and `.join("\n")` that got corrupted.
// Wait, the corrupted text is `.split("` followed by a literal newline, then `")`.
content = content.replace(/\.split\("([^"]*)\n([^"]*)"\)/g, '.split("$1\\\\n$2")');
content = content.replace(/\.join\("([^"]*)\n([^"]*)"\)/g, '.join("$1\\\\n$2")');

fs.writeFileSync('src/components/InternalPortal.tsx', content);
