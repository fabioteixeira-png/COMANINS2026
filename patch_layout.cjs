const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

// Add Menu to imports
code = code.replace(/import \{\n(.*?)\n\} from "lucide-react";/s, (match, p1) => {
  if (!p1.includes("Menu,")) {
    return `import {\n${p1},\n  Menu\n} from "lucide-react";`;
  }
  return match;
});

// Add isMobileMenuOpen state
const stateTarget = `  const [afterHoursBypass, setAfterHoursBypass] = useState(false);

  const setActiveTab = (t: any) => {
    setRawActiveTab(t);
  };`;

const stateReplacement = `  const [afterHoursBypass, setAfterHoursBypass] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const setActiveTab = (t: any) => {
    setRawActiveTab(t);
    setIsMobileMenuOpen(false);
  };`;

code = code.replace(stateTarget, stateReplacement);

// Update JSX layout
const layoutTarget = `  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 flex items-center justify-center border-b border-slate-100">`;

const layoutReplacement = `  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <aside className={\`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        \${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      \`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex-1 flex justify-center">`;

code = code.replace(layoutTarget, layoutReplacement);

// We need to fix the logo div closing and add close button inside mobile if wanted, but simpler to just use the outside overlay to close.
// Let's refine layoutTarget2 to keep logo correctly enclosed.

const layoutTarget2 = `        <div className="p-6 flex items-center justify-center border-b border-slate-100">
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

// Actually let's just do it cleanly

fs.writeFileSync('src/components/InternalPortal.tsx', code);
