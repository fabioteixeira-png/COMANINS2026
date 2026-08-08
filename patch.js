const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const replacement = `          {isUserAdmin && (
            <>
              <div className="pt-4 pb-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3">
                  Admin
                </span>
              </div>
              <button
                onClick={() => setActiveTab("auditoria")}
                className={\`w-full text-left px-3 py-2 rounded font-medium flex items-center space-x-2 transition-colors \${
                  activeTab === "auditoria"
                    ? "bg-blue-50 text-royal-blue font-bold"
                    : "text-slate-700 hover:bg-slate-50"
                }\`}
              >
                <ShieldCheck className="h-4 w-4 text-slate-500" />
                <span>Auditoria e Metrologia</span>
              </button>
              <button
                onClick={() => setActiveTab("configuracoes")}
                className={\`w-full text-left px-3 py-2 rounded font-medium flex items-center space-x-2 transition-colors \${
                  activeTab === "configuracoes" ||
                  activeTab === "cadastro_usuarios"
                    ? "bg-blue-50 text-royal-blue font-bold"
                    : "text-slate-700 hover:bg-slate-50"
                }\`}
              >
                <Settings className="h-4 w-4 text-slate-500" />
                <span>Configurações</span>
              </button>
            </>
          )}`;

content = content.replace(/\{\s*isUserAdmin\s*&&\s*\(\s*<>\s*<div className="pt-4 pb-1">\s*<span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3">\s*Admin\s*<\/span>\s*<\/div>\s*<button[\s\S]*?<span>Configurações<\/span>\s*<\/button>\s*<\/>\s*\)\s*\}/m, replacement);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log('patched');
