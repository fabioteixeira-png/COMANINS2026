const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

content = content.replace(
  'clientPassword.trim() || editingClient.password || "123456",',
  'clientPassword.trim() || editingClient.password || "123456",\n            isFieldService: clientIsFieldService,'
);

content = content.replace(
  'password: clientPassword.trim() || "123456",',
  'password: clientPassword.trim() || "123456",\n            isFieldService: clientIsFieldService,'
);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Patched client submit");
