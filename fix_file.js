const fs = require('fs');

const baseContent = fs.readFileSync('src/components/InternalPortal_clean.tsx', 'utf8');

const endSnippet = `
                                                className={\`px-2 py-0.5 rounded font-bold text-[9px] \${pass ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}\`}
                                              >
                                                {pass ? "APROVADO" : "REPROVADO"}
                                              </span>
                                            )}
                                            {!hasData && (
                                              <span className="text-slate-400 text-xs">-</span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    },
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InternalPortal;
`;

fs.writeFileSync('src/components/InternalPortal.tsx', baseContent + endSnippet);
