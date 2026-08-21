const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

code = code.replace(
  '                      {/* LISTA DE ASOs CADASTRADOS POR CONTRATO */}\n                      (() => {',
  '                      {/* LISTA DE ASOs CADASTRADOS POR CONTRATO */}\n                      {(() => {'
);

code = code.replace(
  '                {/* TABELA DE TREINAMENTOS DE NR */}',
  '                {/* TABELA DE TREINAMENTOS DE NR */}' // Do nothing
);

fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
