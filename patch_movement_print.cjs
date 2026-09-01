const fs = require('fs');
let content = fs.readFileSync('src/components/RentalManagement.tsx', 'utf8');

const targetStr = '<div className="border-x border-b border-black p-4 text-xs min-h-24"><b>OBSERVAÇÕES:</b><br />{movement.notes || (isDispatch ? \'Material entregue para locação mensal em condições de uso, conforme relação acima.\' : \'Material recebido e conferido conforme relação acima.\')}</div>';

const replacement = `<div className="border-x border-b border-black p-4 text-xs min-h-24"><b>OBSERVAÇÕES:</b><br />{movement.notes || (isDispatch ? 'Material entregue para locação mensal em condições de uso, conforme relação acima.' : 'Material recebido e conferido conforme relação acima.')}</div>
    {movement.attachments && movement.attachments.length > 0 && (
      <div className="border-x border-b border-black p-4 rental-no-print">
        <b className="text-xs">ANEXOS / FOTOS:</b>
        <div className="flex flex-wrap gap-2 mt-2">
          {movement.attachments.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-24 h-24 border border-slate-300 rounded overflow-hidden">
              <img src={url} alt={"Anexo " + (i + 1)} className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      </div>
    )}`;

content = content.replace(targetStr, replacement);
fs.writeFileSync('src/components/RentalManagement.tsx', content);
