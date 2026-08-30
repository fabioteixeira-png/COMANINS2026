const fs = require('fs');
let code = fs.readFileSync('src/components/RentalManagement.tsx', 'utf8');

const goodBlock = `{invoicePromptTarget && (
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

      <style>`;

code = code.replace('<style>', goodBlock);
fs.writeFileSync('src/components/RentalManagement.tsx', code);
