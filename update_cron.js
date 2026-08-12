const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// We will replace the entire cron block. Let's find its start and end.
// We'll just replace everything from "// ------------------- CRON JOB (NOTIFICAÇÕES E ALERTAS) -------------------" 
// to the end of the cron.schedule callback. 
