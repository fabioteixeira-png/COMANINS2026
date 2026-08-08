const fs = require('fs');
const file = 'src/components/InternalPortal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `                                  {selectedInstrumentType === 'manometro' && 'Manômetro (ABNT NBR 14105)'}`,
  `                                  {selectedInstrumentType === 'manometro' && 'Manômetro (ABNT NBR 14105)'}
                                  {selectedInstrumentType === 'manovacuometro' && 'Manovacuômetro (ABNT NBR 14105)'}`
);

content = content.replace(
  `                              {(selectedInstrumentType === 'manometro') && (`,
  `                              {(selectedInstrumentType === 'manometro' || selectedInstrumentType === 'manovacuometro') && (`
);

content = content.replace(
  `{(selectedInstrumentType === 'manometro' || selectedInstrumentType === 'termometro') && (
                                <div className="flex items-center space-x-2 font-normal">
                                  <span className="text-slate-500 text-[10px]">Pontos:</span>`,
  `{(selectedInstrumentType === 'manometro' || selectedInstrumentType === 'termometro' || selectedInstrumentType === 'manovacuometro') && (
                                <div className="flex items-center space-x-2 font-normal">
                                  <span className="text-slate-500 text-[10px]">Pontos:</span>`
);

content = content.replace(
  `                            {/* TABLE RENDER: 1. MANÔMETRO & TERMÔMETRO */}
                            {(selectedInstrumentType === 'manometro' || selectedInstrumentType === 'termometro') && (`,
  `                            {/* TABLE RENDER: 1. MANÔMETRO & TERMÔMETRO & MANOVACUOMETRO */}
                            {(selectedInstrumentType === 'manometro' || selectedInstrumentType === 'termometro' || selectedInstrumentType === 'manovacuometro') && (`
);

fs.writeFileSync(file, content);
console.log("Success");
