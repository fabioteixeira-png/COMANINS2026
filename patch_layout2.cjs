const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const layoutTarget2 = `        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex-1 flex justify-center">
          <ComaninsLogo
            src={customLogo}
            size={180}
            className="max-h-12 w-auto"
          />
        </div>`;

const layoutReplacement2 = `        <div className="p-6 flex items-center justify-center border-b border-slate-100 relative">
          <ComaninsLogo
            src={customLogo}
            size={180}
            className="max-h-12 w-auto"
          />
          <button 
            className="md:hidden absolute right-4 text-slate-500 hover:bg-slate-100 p-1 rounded"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>`;

code = code.replace(layoutTarget2, layoutReplacement2);

// Add hamburger to header
const headerTarget = `      <div className="flex-1 p-8 h-screen overflow-y-auto">
        {/* Top Navigation Header with Notification Bell */}
        <div className="mb-6 pb-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">`;

const headerReplacement = `      <div className="flex-1 p-4 md:p-8 h-screen overflow-y-auto w-full">
        {/* Top Navigation Header with Notification Bell */}
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

code = code.replace(headerTarget, headerReplacement);

fs.writeFileSync('src/components/InternalPortal.tsx', code);
