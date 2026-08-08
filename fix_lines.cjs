const fs = require('fs');
let file = 'src/components/InternalPortal.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const inserts = {
  3571: '              )}',
  4994: '              )}',
  5025: '            )}', // Wait, the Excluir button doesn't have an opening `&& (` anymore, it has `hidden={!isUserAdmin}`! Wait, line 5025 is before the Excluir button. The previous button is the Historico button which has `{(inst.status !== 'Novo') && (` on line 5013! So it needs a closing.
  5158: '                      )}',
  8172: '                            )}',
  8256: '                              )}',
  8667: '                                )}', // Wait, 8668 error, 8667 is </button>
  9595: '                      )}',
  10165: '                                  )}', // Wait, line 10165 is </button>. Was there a `&& (`? Ah, the delete training record. But I already added `hidden={!isUserAdmin}`! Wait, did it have `isUserAdmin && (`? Yes, I added it with fix_trash.cjs but then removed it with revert.cjs, BUT my first regex to remove `</button>)}` removed the closing from the ACTUAL button that had a condition!
  10582: '                    )}',
  11587: '                        )}',
  12936: '                )}', // wait, 12937 is </div>. Let's look at 12936.
};

for (const [lineNumStr, insertStr] of Object.entries(inserts)) {
  const i = parseInt(lineNumStr) - 1; // 0-indexed
  lines[i] = lines[i] + '\n' + insertStr;
}

fs.writeFileSync(file, lines.join('\n'));
console.log("Fixed lines");
