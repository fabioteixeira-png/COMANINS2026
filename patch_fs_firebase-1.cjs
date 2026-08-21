const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const targetInterface = `export interface FieldServiceRecord {
  id: string;
  tag: string;
  description: string;
  serialNumber: string;
  certificate: string;
  interventionDate: string;
  technician: string;
  status: string;
  notes: string;
}`;

const replaceInterface = `export interface FieldServiceRecord {
  id: string;
  tag: string;
  equipamento: string;
  localizacao: string;
  certificate: string;
  interventionDate: string;
  technician: string;
  area: string;
  range: string;
  operacao: string;
  unidadeMedida: string;
  categoria: string;
  emissaoPdf: string;
  ordemServico: string;
  tipoServico: string;
  observacao: string;
  unidade: string;
}`;

if (code.includes('export interface FieldServiceRecord')) {
  code = code.replace(targetInterface, replaceInterface);
  fs.writeFileSync('src/lib/firebase.ts', code);
  console.log('Firebase interface patched.');
} else {
  console.log('Target not found.');
}
