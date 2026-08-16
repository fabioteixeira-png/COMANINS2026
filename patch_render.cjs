const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const targetRender = `{activeTab === "financeiro" && <FinanceManagement requestAdminDelete={requestAdminDelete} />}`;
const replaceRender = `{activeTab === "field_service" && <FieldService />}\n        {activeTab === "financeiro" && <FinanceManagement requestAdminDelete={requestAdminDelete} />}`;

if (!code.includes('{activeTab === "field_service" && <FieldService />}')) {
  code = code.replace(targetRender, replaceRender);
  fs.writeFileSync('src/components/InternalPortal.tsx', code);
  console.log('Render patched.');
} else {
  console.log('Render already patched.');
}
