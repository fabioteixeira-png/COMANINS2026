const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const importTarget = 'import FinanceManagement from "./FinanceManagement";';
const importReplacement = 'import FinanceManagement from "./FinanceManagement";\nimport InternalCommunication from "./InternalCommunication";';

if (!content.includes('import InternalCommunication')) {
  content = content.replace(importTarget, importReplacement);
}

const tabTarget = `              <button
                onClick={() => setActiveTab("financeiro")}
                className={\`w-full text-left px-3 py-2 rounded transition-colors flex items-center space-x-2 \${
                  activeTab === "financeiro"
                    ? "bg-blue-50 text-royal-blue font-bold"
                    : "text-slate-700 hover:bg-slate-50"
                }\`}
              >
                <TrendingUp className="h-4 w-4 text-slate-500" />
                <span>Financeiro</span>
              </button>`;
              
const tabReplacement = `              <button
                onClick={() => setActiveTab("financeiro")}
                className={\`w-full text-left px-3 py-2 rounded transition-colors flex items-center space-x-2 \${
                  activeTab === "financeiro"
                    ? "bg-blue-50 text-royal-blue font-bold"
                    : "text-slate-700 hover:bg-slate-50"
                }\`}
              >
                <TrendingUp className="h-4 w-4 text-slate-500" />
                <span>Financeiro</span>
              </button>
              <button
                onClick={() => setActiveTab("comunicacao_interna")}
                className={\`w-full text-left px-3 py-2 rounded transition-colors flex items-center space-x-2 \${
                  activeTab === "comunicacao_interna"
                    ? "bg-blue-50 text-royal-blue font-bold"
                    : "text-slate-700 hover:bg-slate-50"
                }\`}
              >
                <MessageSquare className="h-4 w-4 text-slate-500" />
                <span>Comunicação Interna</span>
              </button>`;

if (content.includes(tabTarget)) {
  content = content.replace(tabTarget, tabReplacement);
} else {
  console.log("Tab target not found");
}

const renderTarget = '{activeTab === "financeiro" && <FinanceManagement />}';
const renderReplacement = '{activeTab === "financeiro" && <FinanceManagement />}\n        {activeTab === "comunicacao_interna" && <InternalCommunication currentUser={currentUser} />}';

if (content.includes(renderTarget)) {
  content = content.replace(renderTarget, renderReplacement);
} else {
  console.log("Render target not found");
}

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log('patched portal');
