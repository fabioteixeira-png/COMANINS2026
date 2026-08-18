const fs = require('fs');

let content = fs.readFileSync('src/components/ClientPortal.tsx', 'utf-8');

// Add states for FS equip and tag
content = content.replace(
  'const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);',
  'const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);\n  const [fsTag, setFsTag] = useState<string>("");\n  const [fsEquip, setFsEquip] = useState<string>("");'
);

// Clear them on close modal
content = content.replace(
  /setSelectedInstrument\(null\);/g,
  'setSelectedInstrument(null);\n            setFsTag("");\n            setFsEquip("");'
);

// Update Tag and Equip rendering in the PDF
content = content.replace(
  '<p><span className="font-bold">Tag Cliente:</span> {inst?.tag || \'—\'}</p>',
  '<p><span className="font-bold">TAG do Cliente:</span> {fsTag || inst?.tag || \'—\'}</p>\n                        {fsEquip && <p><span className="font-bold">Equipamento:</span> {fsEquip}</p>}'
);

fs.writeFileSync('src/components/ClientPortal.tsx', content);
console.log("Patched states and PDF rendering in ClientPortal.");
