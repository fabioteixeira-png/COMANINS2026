const http = require('http');

http.get('http://localhost:3000/api/fs/calibrationReports', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => { console.log("OK", data.length); });
}).on("error", (err) => { console.log("Error: " + err.message); });
