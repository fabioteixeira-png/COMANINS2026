const fs = require('fs');
let file = 'src/components/InternalPortal.tsx';
let content = fs.readFileSync(file, 'utf8');

// The code currently has:
//              {(isUserAdmin ||
//                currentUser?.role === "Recursos Humanos (RH)" ||
//                currentUser?.role === "Financeiro") && (
//                <button
//                  onClick={() => {
//                    setActiveTab("colaboradores");
//                    setRhSubTab("cadastro");
//                  }}
//                  className={`w-full text-left px-3 py-2 rounded transition-colors ${
//                    activeTab === "colaboradores" &&
//                    rhSubTab !== "contra_cheques"
//                      ? "bg-blue-50 text-blue-600 font-semibold"
//                      : "text-slate-700 hover:bg-slate-50"
//                  }`}
//                >
//                  Colaboradores (RH)
//                </button>
//              )}

content = content.replace(
  /\{\(isUserAdmin \|\|[\s\S]*?Financeiro"\) && \(\s*<button[\s\S]*?>\s*Colaboradores \(RH\)\s*<\/button>\s*\)\}/,
  `<button
                  onClick={() => {
                    setActiveTab("colaboradores");
                    setRhSubTab("cadastro");
                  }}
                  className={\`w-full text-left px-3 py-2 rounded transition-colors \${
                    activeTab === "colaboradores" &&
                    rhSubTab !== "contra_cheques"
                      ? "bg-blue-50 text-blue-600 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  }\`}
                >
                  Colaboradores (RH)
                </button>`
);

fs.writeFileSync(file, content);
console.log("Fixed tab");
