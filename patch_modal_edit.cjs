const fs = require('fs');
let content = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

const target1 = `<div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden my-auto">`;
const replacement1 = `<div className={\`bg-white w-full flex flex-col border border-slate-200 shadow-2xl overflow-hidden transition-all \${isMaximized ? "max-w-full h-full min-h-[100dvh] rounded-none my-0" : "rounded-2xl max-w-5xl max-h-[92vh] sm:max-h-[88vh] my-auto"}\`}>`;

const target2 = `              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                ✕
              </button>`;
const replacement2 = `              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="p-1 text-slate-400 hover:text-white transition-colors bg-slate-800 rounded-lg hover:bg-slate-700"
                  title={isMaximized ? "Restaurar tamanho" : "Maximizar"}
                >
                  {isMaximized ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="p-1 text-slate-400 hover:text-white transition-colors bg-slate-800 rounded-lg hover:bg-red-500"
                  title="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>`;

if (content.includes(target1) && content.includes(target2)) {
  content = content.replace(target1, replacement1);
  content = content.replace(target2, replacement2);
  fs.writeFileSync('src/components/EmployeeManagement.tsx', content);
  console.log("Edit modal patched!");
} else {
  console.log("Could not find targets in EmployeeManagement.tsx");
}
