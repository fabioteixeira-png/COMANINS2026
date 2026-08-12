const fs = require('fs');
let code = fs.readFileSync('src/components/InternalCommunication.tsx', 'utf8');

code = code.replace(/safeFetch\("\/api\/send-email", \{([\s\S]*?)\}\)\.catch\(console\.error\);/g, `safeFetch("/api/send-email", {$1}).then(res => console.log("Email response:", res)).catch(console.error);`);

// And for the await saveInternalTicket ones where there was no .catch() attached in the same line:
code = code.replace(/safeFetch\("\/api\/send-email", \{\s*method: "POST",\s*body: JSON\.stringify\(\{([\s\S]*?)\}\)\s*\}\);/g, `safeFetch("/api/send-email", {
      method: "POST",
      body: JSON.stringify({$1})
    }).then(res => console.log("Email response:", res)).catch(console.error);`);

fs.writeFileSync('src/components/InternalCommunication.tsx', code);
