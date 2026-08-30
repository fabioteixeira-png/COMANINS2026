const fs = require('fs');
let code = fs.readFileSync('src/components/RentalManagement.tsx', 'utf8');

// Add renewalPrice field to service form
code = code.replace(
  /<Field label="Valor mensal por equipamento \*">([\s\S]*?)<\/Field>/,
  '<Field label="Valor mensal por equipamento *">$1</Field>\n            <Field label="Valor para renovação (Opcional)"><input type="number" min="0" step="0.01" value={serviceDraft.renewalPrice || \'\'} onChange={(e) => setServiceDraft({ ...serviceDraft, renewalPrice: e.target.value ? Number(e.target.value) : undefined })} className="input-rental" placeholder="Ex: 50.00" /></Field>'
);

// Save service with renewalPrice
code = code.replace(
  /monthlyPrice: Number\(serviceDraft\.monthlyPrice \|\| 0\),/,
  'monthlyPrice: Number(serviceDraft.monthlyPrice || 0),\n        renewalPrice: serviceDraft.renewalPrice ? Number(serviceDraft.renewalPrice) : undefined,'
);

// Add select options for paymentMethod in Rental Settings
code = code.replace(
  /<label className="space-y-1"><span className="font-bold text-slate-600">Condição de pagamento<\/span><input disabled={!canEdit} value={settingsDraft\.paymentMethod} onChange={\(e\) => setSettingsDraft\(\{ \.\.\.settingsDraft, paymentMethod: e\.target\.value \}\)} className="w-full border border-slate-300 rounded-lg px-3 py-2" \/><\/label>/,
  '<label className="space-y-1"><span className="font-bold text-slate-600">Condição de pagamento</span><select disabled={!canEdit} value={settingsDraft.paymentMethod} onChange={(e) => setSettingsDraft({ ...settingsDraft, paymentMethod: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2"><option value="">Selecione...</option><option value="Depósito Bancário">Depósito Bancário</option><option value="Transferência Eletrônica">Transferência Eletrônica</option><option value="Cartão de Crédito">Cartão de Crédito</option><option value="Pix">Pix</option><option value="Boleto Bancário">Boleto Bancário</option><option value="Dinheiro">Dinheiro</option></select></label>'
);

// Add select options for paymentMethod in Rental Draft
code = code.replace(
  /<Field label="Condição de pagamento"><input value={rentalDraft\.paymentMethod} onChange={\(e\) => setRentalDraft\(\{ \.\.\.rentalDraft, paymentMethod: e\.target\.value \}\)} className="input-rental" placeholder={settings\.paymentMethod} \/><\/Field>/,
  '<Field label="Condição de pagamento"><select value={rentalDraft.paymentMethod} onChange={(e) => setRentalDraft({ ...rentalDraft, paymentMethod: e.target.value })} className="input-rental"><option value="">Padrão: {settings.paymentMethod}</option><option value="Depósito Bancário">Depósito Bancário</option><option value="Transferência Eletrônica">Transferência Eletrônica</option><option value="Cartão de Crédito">Cartão de Crédito</option><option value="Pix">Pix</option><option value="Boleto Bancário">Boleto Bancário</option><option value="Dinheiro">Dinheiro</option></select></Field>'
);

// Update print document logic
code = code.replace(
  /invoice\.bankInstructions \? `CREDITAR EM: \$\{invoice\.bankInstructions\}` : '',/,
  '(invoice.paymentMethod === \'Transferência Eletrônica\' || invoice.paymentMethod === \'Depósito Bancário\') && invoice.bankInstructions ? `CREDITAR EM: ${invoice.bankInstructions}` : \'\','
);

// Remove commercial rules from MovementPrint logic if returning
// The user says "No comprovante de devolução não deve conter a regra comercial da saida."
// Let's check MovementPrint
fs.writeFileSync('src/components/RentalManagement.tsx', code);
