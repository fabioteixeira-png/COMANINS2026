const fs = require('fs');
let code = fs.readFileSync('src/components/RentalManagement.tsx', 'utf8');

// Add a state for invoice modal
code = code.replace(
  /const \[printDocument, setPrintDocument\] = useState<any>\(null\);/,
  'const [printDocument, setPrintDocument] = useState<any>(null);\n  const [invoicePromptTarget, setInvoicePromptTarget] = useState<RentalContract | null>(null);\n  const [manualInvoiceNumber, setManualInvoiceNumber] = useState(\'\');'
);

// Update issueInvoice to use the prompt
code = code.replace(
  /const issueInvoice = async \(rental: RentalContract\) => \{[\s\S]*?finally \{\s*setBusy\(false\);\s*\}\s*\};/,
  `const issueInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoicePromptTarget || !manualInvoiceNumber.trim()) return;
    clearMessages();
    if (!ensureEditable()) return;
    setBusy(true);
    try {
      const response = await fetch(\`/api/rentals/contracts/\${invoicePromptTarget.id}/invoices\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${(window as any).currentUserToken}\` },
        body: JSON.stringify({ invoiceNumber: manualInvoiceNumber.trim() })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Não foi possível gerar a fatura.');
      }
      const result = await response.json();
      setNotice(\`Fatura \${result.invoice.invoiceNumber} emitida e integrada ao Contas a Receber.\`);
      setPrintDocument({ kind: 'invoice', invoice: result.invoice, rental: invoicePromptTarget });
      setInvoicePromptTarget(null);
      setManualInvoiceNumber('');
    } catch (e: any) {
      setError(e?.message || 'Não foi possível gerar a fatura.');
    } finally {
      setBusy(false);
    }
  };`
);

// Add the modal JSX just above <CompanyHeader
code = code.replace(
  /function CompanyHeader/,
  `{invoicePromptTarget && (
        <Modal title="Emitir Fatura / Renovação" onClose={() => setInvoicePromptTarget(null)}>
          <form onSubmit={issueInvoice} className="space-y-4">
            <p className="text-sm text-slate-600 mb-2">Informe manualmente o número da Fatura (vinculado à Ordem de Serviço) para esta locação/renovação.</p>
            <Field label="Número da Fatura / OS *">
              <input required value={manualInvoiceNumber} onChange={(e) => setManualInvoiceNumber(e.target.value)} className="input-rental" placeholder="Ex: OS-2026-001" />
            </Field>
            <button disabled={busy} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold disabled:opacity-50 mt-4">Emitir Fatura</button>
          </form>
        </Modal>
      )}

      function CompanyHeader`
);

// In the faturas list or active tab where Emitir Fatura is called, update it to set the target instead of calling directly
// Need to find onClick={() => issueInvoice(rental)}
code = code.replace(
  /onClick=\{\(\) => issueInvoice\(rental\)\}/g,
  'onClick={() => { setInvoicePromptTarget(rental); setManualInvoiceNumber(rental.processNumber || \'\'); }}'
);

fs.writeFileSync('src/components/RentalManagement.tsx', code);
