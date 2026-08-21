const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

// The rendering logic inside the form uses formData.asoContracts
// We need to merge them if there are legacy ones, or just show the new ones.
// A safe way is to create a computed list inside the render function.

const findStr = `{(formData.asoContracts || []).length} ASO(s) Registrado(s)`;
const replaceStr = `{((employeeAsos || []).filter(a => a.employeeId === (formData.id || formData.username || selectedUser?.id || selectedUser?.username)).length + (formData.asoContracts || []).length)} ASO(s) Registrado(s)`;
code = code.replace(findStr, replaceStr);

const listHeaderFind = `{(formData.asoContracts || []).length > 0 && (`;
const listHeaderReplace = `(() => {
                        const asoRecords = [
                          ...(formData.asoContracts || []),
                          ...(employeeAsos || []).filter(a => a.employeeId === (formData.id || formData.username || selectedUser?.id || selectedUser?.username))
                        ].filter((v,i,a) => a.findIndex(t=>(t.id === v.id))===i);
                        
                        return asoRecords.length > 0 && (`;
code = code.replace(listHeaderFind, listHeaderReplace);

const listMapFind = `{(formData.asoContracts || []).map((asoItem, idx) => {`;
const listMapReplace = `{asoRecords.map((asoItem, idx) => {`;
code = code.replace(listMapFind, listMapReplace);

const endDivFind = `</div>
                      )}
                    </div>`;
const endDivReplace = `</div>
                      );})()}
                    </div>`;

// Wait, doing this by string replacement might be fragile. Let's do it carefully.
if (code.includes(listHeaderFind)) {
  code = code.replace(listHeaderFind, listHeaderReplace);
  code = code.replace(listMapFind, listMapReplace);
  code = code.replace('                      )}', '                      )}'); // Need to close IIFE
}

fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
