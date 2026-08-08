const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const otherRolesTarget = `              <button
                onClick={() => setActiveTab("treinamentos")}
                className={\`w-full text-left px-3 py-2 rounded transition-colors flex items-center space-x-2 \${
                  activeTab === "treinamentos"
                    ? "bg-blue-50 text-royal-blue font-bold"
                    : "text-slate-700 hover:bg-slate-50"
                }\`}
              >
                <BookOpen className="h-4 w-4 text-slate-500" />
                <span>Treinamentos</span>
              </button>
            </>`;

const otherRolesReplacement = `              <button
                onClick={() => setActiveTab("treinamentos")}
                className={\`w-full text-left px-3 py-2 rounded transition-colors flex items-center space-x-2 \${
                  activeTab === "treinamentos"
                    ? "bg-blue-50 text-royal-blue font-bold"
                    : "text-slate-700 hover:bg-slate-50"
                }\`}
              >
                <BookOpen className="h-4 w-4 text-slate-500" />
                <span>Treinamentos</span>
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
              </button>
            </>`;

if (content.includes(otherRolesTarget)) {
  content = content.replace(otherRolesTarget, otherRolesReplacement);
  fs.writeFileSync('src/components/InternalPortal.tsx', content);
  console.log('patched other roles menu');
} else {
  console.log('other roles target not found');
}
