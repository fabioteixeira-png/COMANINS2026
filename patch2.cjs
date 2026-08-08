const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target = `<button
                  onClick={() => {
                    setShowInventoryTransactionForm(true);
                  }}
                  className="bg-royal-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2 shadow-sm"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  <span>Movimentar Estoque</span>
                </button>`;

const replacement = `<button
                  onClick={() => {
                    setShowInventoryTransactionForm(true);
                  }}
                  className="bg-royal-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2 shadow-sm"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  <span>Movimentar Estoque</span>
                </button>
                {isUserAdmin && (
                  <button
                    onClick={() => {
                      setActiveTab("configuracoes");
                      setTimeout(() => setEditingDropdownKey("estoqueCategoria"), 100);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2 shadow-sm border border-slate-200"
                    title="Gerenciar Categorias no Painel de Admin"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Categorias</span>
                  </button>
                )}`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/InternalPortal.tsx', content);
  console.log('patched');
} else {
  console.log('target not found');
}
