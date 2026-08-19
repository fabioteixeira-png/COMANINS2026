const fs = require('fs');
let content = fs.readFileSync('src/components/FinanceManagement.tsx', 'utf-8');

// Remove handleClearDatabase function
const handleClearDatabaseRegex = /const handleClearDatabase = async \(\) => \{[\s\S]*?\};\n\n/g;
content = content.replace(handleClearDatabaseRegex, '');

fs.writeFileSync('src/components/FinanceManagement.tsx', content);
console.log("Patched FinanceManagement.tsx");
