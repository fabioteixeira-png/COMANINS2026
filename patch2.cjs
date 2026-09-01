const fs = require('fs');
let content = fs.readFileSync('src/components/internal-portal/InternalPortal.part02.sourcepart', 'utf8');

content = content.replace(
  '                      {editingClient\n                        ? "Atualizar Cadastro do Cliente"\n                        : "Salvar Cliente"}\n                    </button>',
  '                      disabled={clientSubmitting}\n                      className="flex-grow py-2 bg-royal-blue hover:bg-blue-700 text-white font-semibold rounded cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"\n                    >\n                      {clientSubmitting ? "Salvando..." : editingClient ? "Atualizar Cadastro do Cliente" : "Salvar Cliente"}\n                    </button>'
);

// We need to also replace the old className since we added a new one with disabled states
content = content.replace(
  '                      type="submit"\n                      className="flex-grow py-2 bg-royal-blue hover:bg-blue-700 text-white font-semibold rounded cursor-pointer transition-colors"\n                    >\n                      disabled={clientSubmitting}',
  '                      type="submit"\n                      disabled={clientSubmitting}'
);


fs.writeFileSync('src/components/internal-portal/InternalPortal.part02.sourcepart', content);
