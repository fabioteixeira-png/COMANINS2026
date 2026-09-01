const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const routeStart = content.indexOf("app.get('/api/run-temp-update'");
const routeEndStr = "});\n\napp.get('/api/health'";
const routeEnd = content.indexOf("app.get('/api/health'", routeStart);

if (routeStart !== -1 && routeEnd !== -1) {
  content = content.slice(0, routeStart) + content.slice(routeEnd);
  fs.writeFileSync('server.ts', content);
  console.log("Server route removed.");
} else {
  console.log("Could not find route.");
}
