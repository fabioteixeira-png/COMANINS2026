const fs = require('fs');

let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

// Add State
if (!content.includes('clientIsFieldService')) {
  content = content.replace(
    'const [clientCnpj, setClientCnpj] = useState<any>("");',
    'const [clientCnpj, setClientCnpj] = useState<any>("");\n  const [clientIsFieldService, setClientIsFieldService] = useState<boolean>(false);'
  );
}

// Update handleEditClient
content = content.replace(
  'setClientCnpj(c.cnpj || "");',
  'setClientCnpj(c.cnpj || "");\n    setClientIsFieldService(c.isFieldService || false);'
);

// Update reset forms (multiple places)
content = content.split('setClientCnpj("");').join('setClientCnpj("");\n      setClientIsFieldService(false);');

// Add to save payload in handleAddClient
content = content.replace(
  'password: clientPassword.trim(),',
  'password: clientPassword.trim(),\n            isFieldService: clientIsFieldService,'
);
// It might occur multiple times (update and create)
let parts = content.split('password: clientPassword.trim(),');
if (parts.length === 3) {
  content = parts[0] + 'password: clientPassword.trim(),\n            isFieldService: clientIsFieldService,' + parts[1] + 'password: clientPassword.trim(),\n            isFieldService: clientIsFieldService,' + parts[2];
}

// Add checkbox in UI
const checkboxHtml = `
                  <div className="flex items-center space-x-2 mt-4 col-span-1 sm:col-span-2">
                    <input
                      type="checkbox"
                      id="isFieldService"
                      checked={clientIsFieldService}
                      onChange={(e) => setClientIsFieldService(e.target.checked)}
                      className="w-4 h-4 text-royal-blue bg-slate-50 border-slate-300 rounded focus:ring-royal-blue focus:ring-2"
                    />
                    <label htmlFor="isFieldService" className="text-slate-700 font-medium cursor-pointer">
                      Acesso Restrito: Mostrar apenas Certificados do Serviço de Campo
                    </label>
                  </div>
`;

content = content.replace(
  'placeholder="Ex: 123456"\n                    />\n                  </div>',
  'placeholder="Ex: 123456"\n                    />\n                  </div>\n' + checkboxHtml
);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Patched InternalPortal fully.");
