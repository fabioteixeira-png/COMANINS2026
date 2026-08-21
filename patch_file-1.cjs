const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

const badLabel = '<label className="cursor-pointer w-full bg-white border border-slate-300 rounded-lg p-2 flex items-center justify-between text-sla                              <input';
const goodLabel = `<label className="cursor-pointer w-full bg-white border border-slate-300 rounded-lg p-2 flex items-center justify-between text-slate-600 hover:bg-slate-100 transition-colors">
                              <span className="truncate max-w-[180px] font-mono text-[11px]">
                                {newDocFile ? newDocFile.name : 'Selecionar arquivo...'}
                              </span>
                              <Upload className="h-4 w-4 text-royal-blue shrink-0 ml-1" />
                              <input`;
                              
code = code.replace(badLabel, goodLabel);

const badCode = `                              if (newDocFile.size > 800 * 1024) {
                                alert('⚠️ ARQUIVO MUITO GRANDE!\\n\\nO arquivo selecionado ultrapassa o limite de 800KB e não será salvo. Por favor, escolha um arquivo menor.');
                                return;
                              }
                              const reader = new FileReader();ão/nome para o documento.');
                                return;
                              }
                              if (!newDocFile) {
                                alert('Por favor, selecione um arquivo.');
                                return;
                              }

                              const reader = new FileReader();`;

const goodCode = `                              if (newDocFile.size > 800 * 1024) {
                                alert('⚠️ ARQUIVO MUITO GRANDE!\\n\\nO arquivo selecionado ultrapassa o limite de 800KB e não será salvo. Por favor, escolha um arquivo menor.');
                                return;
                              }

                              const reader = new FileReader();`;

code = code.replace(badCode, goodCode);

fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
