const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const targetInterface = `export interface FieldServiceRecord {
  id: string;
  tag: string;
  equipamento: string;`;

const replaceInterface = `export interface FieldServiceRecord {
  id: string;
  cliente: string;
  tag: string;
  equipamento: string;`;

if (code.includes('export interface FieldServiceRecord {') && !code.includes('cliente: string;')) {
  code = code.replace(targetInterface, replaceInterface);
  fs.writeFileSync('src/lib/firebase.ts', code);
  console.log('Firebase interface patched with cliente.');
} else {
  console.log('Firebase interface not found or already patched.');
}
