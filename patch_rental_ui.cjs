const fs = require('fs');
let content = fs.readFileSync('src/components/RentalManagement.tsx', 'utf8');

// Ensure uploadRentalAttachment is imported
if (!content.includes('uploadRentalAttachment')) {
  content = content.replace(
    "} from '../lib/firebase';",
    "  uploadRentalAttachment,\n} from '../lib/firebase';"
  );
}

// Add attachments to returnForm state
content = content.replace(
  "const [returnForm, setReturnForm] = useState({ responsibleClient: '', responsibleClientDocument: '', notes: '', date: todayIso() });",
  "const [returnForm, setReturnForm] = useState({ responsibleClient: '', responsibleClientDocument: '', notes: '', date: todayIso(), attachments: [] as File[] });"
);

// Reset form when opening modal
content = content.replace(
  "setReturnTarget(rental);",
  "setReturnForm({ responsibleClient: '', responsibleClientDocument: '', notes: '', date: todayIso(), attachments: [] }); setReturnTarget(rental);"
);

// Modify registerReturn
const oldRegisterReturn = `  const registerReturn = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();
    if (!returnTarget || !ensureEditable()) return;
    const selected = Object.entries(returnItems)
      .filter(([, value]) => value.selected)
      .map(([assetId, value]) => ({ assetId, condition: value.condition, notes: value.notes }));
    if (selected.length === 0 || !returnForm.responsibleClient.trim()) {
      setError('Selecione ao menos um item e informe quem realizou a devolução.');
      return;
    }
    setBusy(true);
    try {
      const result = await returnRentalItems(returnTarget.id, { ...returnForm, items: selected });`;

const newRegisterReturn = `  const registerReturn = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();
    if (!returnTarget || !ensureEditable()) return;
    const selected = Object.entries(returnItems)
      .filter(([, value]) => value.selected)
      .map(([assetId, value]) => ({ assetId, condition: value.condition, notes: value.notes }));
    if (selected.length === 0 || !returnForm.responsibleClient.trim()) {
      setError('Selecione ao menos um item e informe quem realizou a devolução.');
      return;
    }
    setBusy(true);
    try {
      const attachmentUrls = [];
      if (returnForm.attachments.length > 0) {
        setNotice('Enviando anexos... Isso pode demorar um pouco.');
        for (const file of returnForm.attachments) {
          try {
            const url = await uploadRentalAttachment(returnTarget.id, file);
            attachmentUrls.push(url);
          } catch (err) {
            console.error('Failed to upload', file.name, err);
          }
        }
      }
      const result = await returnRentalItems(returnTarget.id, { ...returnForm, attachments: attachmentUrls, items: selected });`;

content = content.replace(oldRegisterReturn, newRegisterReturn);

// Add the file input to the Modal
const oldReturnFormFiles = `<Field label="Observações gerais"><input value={returnForm.notes} onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })} className="input-rental" /></Field></div>`;
const newReturnFormFiles = `<Field label="Observações gerais"><input value={returnForm.notes} onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })} className="input-rental" /></Field>
<Field label="Fotos / Documentos (Opcional)">
  <input type="file" multiple accept="image/*,.pdf" onChange={(e) => {
    if (e.target.files) {
      setReturnForm({ ...returnForm, attachments: Array.from(e.target.files) });
    }
  }} className="input-rental file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
  {returnForm.attachments.length > 0 && <div className="text-xs text-slate-500 mt-1">{returnForm.attachments.length} arquivo(s) selecionado(s)</div>}
</Field>
</div>`;

content = content.replace(oldReturnFormFiles, newReturnFormFiles);

fs.writeFileSync('src/components/RentalManagement.tsx', content);
