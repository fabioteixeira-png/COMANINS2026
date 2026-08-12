const fs = require('fs');
let code = fs.readFileSync('src/components/InternalCommunication.tsx', 'utf8');

// Modify List Column container
code = code.replace(
  '<div className={`w-full md:w-1/3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-8rem)] ${selectedTicket ? "hidden md:flex" : "flex"}`}>',
  '<div className={`w-full md:w-1/3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full ${selectedTicket ? "hidden md:flex" : "flex"}`}>'
);

// Modify Detail Column container
code = code.replace(
  '<div className={`w-full md:w-2/3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100dvh-5rem)] md:h-[calc(100vh-8rem)] ${!selectedTicket ? "hidden md:flex" : "flex"}`}>',
  '<div className={`w-full md:w-2/3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full ${!selectedTicket ? "hidden md:flex" : "flex"}`}>'
);

fs.writeFileSync('src/components/InternalCommunication.tsx', code);
