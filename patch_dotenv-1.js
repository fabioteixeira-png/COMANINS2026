import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf-8');

// Remove existing dotenv.config();
code = code.replace(/\/\/ Load env variables\ndotenv\.config\(\);\n?/g, '');
code = code.replace(/dotenv\.config\(\);\n?/g, '');

// Insert it right after the imports
code = code.replace(/import dotenv from "dotenv";/g, 'import dotenv from "dotenv";\ndotenv.config();');

fs.writeFileSync('server.ts', code);
