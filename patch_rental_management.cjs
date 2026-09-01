const fs = require('fs');
let content = fs.readFileSync('src/components/RentalManagement.tsx', 'utf8');

// Add manualDueDate state
content = content.replace(
  "const [manualInvoiceNumber, setManualInvoiceNumber] = useState('');",
  "const [manualInvoiceNumber, setManualInvoiceNumber] = useState('');\n  const [manualDueDate, setManualDueDate] = useState('');"
);

// Clear manualDueDate
content = content.replace(
  "setManualInvoiceNumber('');\n    } catch (e: any)",
  "setManualInvoiceNumber('');\n      setManualDueDate('');\n    } catch (e: any)"
);
content = content.replace(
  "setManualInvoiceNumber('');\n      }\n      setNotice(",
  "setManualInvoiceNumber('');\n        setManualDueDate('');\n      }\n      setNotice("
);

// Set initial manualDueDate when opening modal
content = content.replace(
  "setManualInvoiceNumber(rental.processNumber || ''); }}",
  "setManualInvoiceNumber(rental.processNumber || ''); setManualDueDate(todayIso()); }}"
);

// Pass manualDueDate to API
content = content.replace(
  "generateRentalInvoice(invoicePromptTarget.id, { invoiceNumber: manualInvoiceNumber.trim() });",
  "generateRentalInvoice(invoicePromptTarget.id, { invoiceNumber: manualInvoiceNumber.trim(), dueDate: manualDueDate });"
);

// Add to Modal
const oldModal = `<Field label="Número da Fatura / OS *">
              <input required value={manualInvoiceNumber} onChange={(e) => setManualInvoiceNumber(e.target.value)} className="input-rental" placeholder="Ex: OS-2026-001" />
            </Field>`;
const newModal = `<Field label="Número da Fatura / OS *">
              <input required value={manualInvoiceNumber} onChange={(e) => setManualInvoiceNumber(e.target.value)} className="input-rental" placeholder="Ex: OS-2026-001" />
            </Field>
            <Field label="Data de Vencimento *">
              <input required type="date" value={manualDueDate} onChange={(e) => setManualDueDate(e.target.value)} className="input-rental" />
            </Field>`;
content = content.replace(oldModal, newModal);

fs.writeFileSync('src/components/RentalManagement.tsx', content);
