const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

const tableFind = `{selectedUser.asoContracts && selectedUser.asoContracts.length > 0 && (`;
const tableReplace = `{(() => {
                  const asoRecords = [
                    ...(selectedUser.asoContracts || []),
                    ...(employeeAsos || []).filter(a => a.employeeId === selectedUser?.id || a.employeeId === selectedUser?.username)
                  ].filter((v,i,a) => a.findIndex(t=>(t.id === v.id))===i);
                  
                  return asoRecords.length > 0 && (`;

const mapFind = `{selectedUser.asoContracts.map((aso, idx) => (`;
const mapReplace = `{asoRecords.map((aso, idx) => (`;

const endTableFind = `</div>
                  </div>
                )}
                
                {/* TABELA DE TREINAMENTOS DE NR */}`;

const endTableReplace = `</div>
                  </div>
                );})()}
                
                {/* TABELA DE TREINAMENTOS DE NR */}`;

if (code.includes(tableFind)) {
  code = code.replace(tableFind, tableReplace);
  code = code.replace(mapFind, mapReplace);
  code = code.replace(endTableFind, endTableReplace);
}

fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
