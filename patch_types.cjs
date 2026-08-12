const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');
code = code.replace(
  "export type CalibrationStatus = 'Aguardando Triagem' | 'Aguardando Calibração' | 'Em Calibração' | 'Calibrado' | 'Aguardando Emissão de Certificado' | 'Entregue' | 'Não Conforme' | 'Disponível para Retirada';",
  "export type CalibrationStatus = 'Aguardando Triagem' | 'Aguardando Calibração' | 'Em Calibração' | 'Calibrado' | 'Aguardando Emissão de Certificado' | 'Entregue' | 'Não Conforme' | 'Disponível para Retirada' | 'RNC';"
);
fs.writeFileSync('src/types.ts', code);
