const fs = require('fs');
let code = fs.readFileSync('src/components/RentalManagement.tsx', 'utf8');

// Define isAdmin
code = code.replace(
  /export default function RentalManagement\(\{ clients, currentUser, canEdit, companyData = \{\} \}: RentalManagementProps\) \{/,
  `export default function RentalManagement({ clients, currentUser, canEdit, companyData = {} }: RentalManagementProps) {
  const isAdmin = currentUser?.role === 'Administrador' || currentUser?.role === 'Admin' || currentUser?.role === 'admin' || currentUser?.role === 'master' || currentUser?.role === 'Diretor' || currentUser?.profile === 'administrator' || currentUser?.profile === 'Administrador';`
);

// Update invoice deletion button to require isAdmin
code = code.replace(
  /\{canEdit && <button onClick=\{\(\) => deleteInvoice\(invoice\)\} className="px-3 py-1\.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold mr-2"\>/,
  '{isAdmin && <button onClick={() => deleteInvoice(invoice)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold mr-2">'
);

fs.writeFileSync('src/components/RentalManagement.tsx', code);
