const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

// Fix comma
code = code.replace(/ArrowLeft,,\n  Menu/g, 'ArrowLeft,\n  Menu');

// The second layout replacement missed replacing a closing div tag probably.
// Let's look at the headerReplacement again.
/*
const headerTarget = `      <div className="flex-1 p-8 h-screen overflow-y-auto">
        {/* Top Navigation Header with Notification Bell *\/}
        <div className="mb-6 pb-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">`;

const headerReplacement = `      <div className="flex-1 p-4 md:p-8 h-screen overflow-y-auto w-full">
        {/* Top Navigation Header with Notification Bell *\/}
        <div className="mb-6 pb-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">`;
*/
// In headerReplacement, I added `<div className="flex items-center space-x-3">` but did I close it?
// Ah! Yes, I opened a new `<div>` but didn't provide a way to close it!
// Let's fix that.
// The original was `<div><span...><h2...>...</h2></div>`. I wrapped that `<div>` inside `<div className="flex items-center space-x-3">` alongside the button.
// So I need to find the `</div>` that closed the title `<div>` and append another `</div>` there.
