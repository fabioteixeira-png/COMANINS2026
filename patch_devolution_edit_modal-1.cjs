const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target = `                    {editingIntakeId ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteIntake(editingIntakeId, intakeNum)
                        }
                        className="w-full sm:w-auto px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 text-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                        
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                        <span>Excluir Guia</span>
                      </button>
                    ) : (
                      <div />
                    )}`;

const replacement = `                    {editingIntakeId ? (
                      <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteIntake(editingIntakeId, intakeNum)
                          }
                          className="w-full sm:w-auto px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 text-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                          <span>Excluir Guia</span>
                        </button>
                        
                        {(() => {
                          const currentIntake = savedIntakes.find(i => i.id === editingIntakeId);
                          if (currentIntake && currentIntake.photoDevolution) {
                            return (
                              <button
                                type="button"
                                onClick={() => handleOpenDevolutionModal(currentIntake)}
                                className="w-full sm:w-auto px-4 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold rounded-xl border border-teal-200 text-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                              >
                                <CheckCircle className="h-4 w-4 text-teal-600" />
                                <span>Ver Devolução</span>
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    ) : (
                      <div />
                    )}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/InternalPortal.tsx', code);
