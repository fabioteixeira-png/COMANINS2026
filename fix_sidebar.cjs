const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

// The messed up part
const target = `          <div className="pt-4 pb-1"><span className="text-xs font-bold text-slate-400 upper          {!isLimitedRole && (
            <>
              <div className="pt-4 pb-1"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3">Administrativo</span></div>
              <button 
                onClick={() => setActiveTab('financeiro')} 
                className={\`w-full text-left px-3 py-2 rounded transition-colors flex items-center space-x-2 \${
                  activeTab === 'financeiro' ? 'bg-blue-50 text-royal-blue font-bold' : 'text-slate-700 hover:bg-slate-50'
                }\`}
              >
                <TrendingUp className="h-4 w-4 text-slate-500" />
                <span>Financeiro</span>
              </button>
            </>
          )}          <button 
                onClick={() => setActiveTab('financeiro')} 
                className={\`w-full text-left px-3 py-2 rounded transition-colors flex items-center space-x-2 \${
                  activeTab === 'financeiro' ? 'bg-blue-50 text-royal-blue font-bold' : 'text-slate-700 hover:bg-slate-50'
                }\`}
              >
                <TrendingUp className="h-4 w-4 text-slate-500" />
                <span>Financeiro</span>
              </button>
            </>
          )}`;

const replacement = `          <div className="pt-4 pb-1"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3">Pessoal</span></div>
          <button 
            onClick={() => { setActiveTab('colaboradores'); setRhSubTab('contra_cheques'); setActivePayslipTab('meus'); }} 
            className={\`w-full text-left px-3 py-2 rounded transition-colors \${
              activeTab === 'colaboradores' && rhSubTab === 'contra_cheques' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-700 hover:bg-slate-50'
            }\`}
          >
            Meus Contra-cheques
          </button>

          {!isLimitedRole && (
            <>
              <div className="pt-4 pb-1"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3">Administrativo</span></div>
              <button 
                onClick={() => setActiveTab('financeiro')} 
                className={\`w-full text-left px-3 py-2 rounded transition-colors flex items-center space-x-2 \${
                  activeTab === 'financeiro' ? 'bg-blue-50 text-royal-blue font-bold' : 'text-slate-700 hover:bg-slate-50'
                }\`}
              >
                <TrendingUp className="h-4 w-4 text-slate-500" />
                <span>Financeiro</span>
              </button>
            </>
          )}`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/InternalPortal.tsx', code);
  console.log("Fixed!");
} else {
  console.log("Target not found!");
}
