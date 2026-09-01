const fs = require('fs');
let content = fs.readFileSync('src/components/internal-portal/InternalPortal.part01.sourcepart', 'utf8');

const target = '<div className="h-screen sm:h-[100dvh] bg-slate-50 flex overflow-hidden print:h-auto print:overflow-visible print:block">';
const buttonStart = content.indexOf('<button', content.indexOf(target));
const buttonEnd = content.indexOf('⚠️ CLIQUE AQUI PARA EXECUTAR CORREÇÃO DE INSTRUMENTOS (NSM PARA COMANINS) ⚠️', buttonStart);
const closingTagEnd = content.indexOf('</button>', buttonEnd) + '</button>'.length;

if (buttonStart !== -1 && buttonEnd !== -1) {
  content = content.slice(0, buttonStart) + content.slice(closingTagEnd);
  // clean up any leftover empty lines
  content = content.replace(/\n\s*\n\s*\{/g, '\n      {');
}

fs.writeFileSync('src/components/internal-portal/InternalPortal.part01.sourcepart', content);
