const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target = `                                  <button
                                    onClick={async () => {
                                      if (
                                        confirm(
                                          "Tem certeza que deseja excluir este exame?",
                                        )
                                      ) {
                                        await deleteMedicalExamDoc(exam.id);
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>`;

const replacement = `                                  <button
                                    onClick={() => {
                                      requestAdminDelete("exam", exam.id, \`Exame Médico (\${exam.examDate})\`);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/InternalPortal.tsx', code);
