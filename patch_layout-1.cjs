const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

// Replace outer wrapper
content = content.replace(
  /<div className="min-h-screen bg-slate-50 flex">/g, 
  '<div className="h-screen sm:h-[100dvh] bg-slate-50 flex overflow-hidden">'
);

// Replace inner scroll wrapper
content = content.replace(
  /<div className="flex-1 min-w-0 p-3 sm:p-6 md:p-8 h-screen overflow-y-auto w-full">/g,
  '<div className="flex-1 min-w-0 p-3 sm:p-6 md:p-8 overflow-y-auto w-full h-full">'
);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Patched layout in InternalPortal.tsx");
