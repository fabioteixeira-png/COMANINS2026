const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');
content = content.replace(
  `  console.log("GEMINI_API_KEY state:", key ? (key === "MY_GEMINI_API_KEY" ? "DEFAULT" : "PRESENT_AND_REAL") : "MISSING");`,
  ``
);
fs.writeFileSync('server.ts', content);
