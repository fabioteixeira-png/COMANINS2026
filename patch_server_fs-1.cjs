const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetPrompt = `Required JSON format:
{
  "tag": "String - Equipment Tag/ID",
  "description": "String - Description of equipment",
  "serialNumber": "String - Serial number",
  "certificate": "String - Certificate number (very important)",
  "interventionDate": "String - Date of intervention (DD/MM/YYYY if possible)",
  "technician": "String - Name of technician",
  "status": "String - e.g. Aprovado, Reprovado",
  "notes": "String - Any additional handwritten notes"
}`;

const replacePrompt = `Required JSON format:
{
  "tag": "String - Equipment Tag/ID",
  "equipamento": "String - Nome do equipamento",
  "localizacao": "String - Localização",
  "certificate": "String - Certificate number (very important)",
  "interventionDate": "String - Date of intervention (DD/MM/YYYY se possível)",
  "technician": "String - Name of technician / Técnico",
  "area": "String - Área",
  "range": "String - Range ou Faixa",
  "operacao": "String - Operação",
  "unidadeMedida": "String - Unidade de medida",
  "categoria": "String - Categoria",
  "emissaoPdf": "String - Emissão PDF (ex: Sim/Não)",
  "ordemServico": "String - Ordem de serviço / OS",
  "tipoServico": "String - Tipo de serviço",
  "observacao": "String - Observação",
  "unidade": "String - Unidade (local)"
}`;

if (code.includes('Required JSON format:')) {
  code = code.replace(targetPrompt, replacePrompt);
  fs.writeFileSync('server.ts', code);
  console.log('Server prompt patched.');
} else {
  console.log('Target not found in server.');
}
