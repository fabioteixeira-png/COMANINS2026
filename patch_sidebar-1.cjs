const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const targetButton = `          <button
            onClick={() => setActiveTab("instruments")}
            className={\`w-full text-left px-3 py-2 rounded transition-colors flex items-center space-x-2 \${
              activeTab === "instruments" || activeTab === "bench"
                ? "bg-blue-50 text-royal-blue font-bold"
                : "text-slate-700 hover:bg-slate-50"
            }\`}
          >
            <Gauge className="h-4 w-4 text-slate-500" />
            <span>Calibração</span>
          </button>`;

const replaceButton = targetButton + `
          <button
            onClick={() => setActiveTab("field_service")}
            className={\`w-full text-left px-3 py-2 rounded transition-colors flex items-center space-x-2 \${
              activeTab === "field_service"
                ? "bg-blue-50 text-royal-blue font-bold"
                : "text-slate-700 hover:bg-slate-50"
            }\`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span>Serviço de Campo</span>
          </button>`;

if (!code.includes('setActiveTab("field_service")')) {
  code = code.replace(targetButton, replaceButton);
  fs.writeFileSync('src/components/InternalPortal.tsx', code);
  console.log('Sidebar patched.');
} else {
  console.log('Sidebar already patched.');
}
