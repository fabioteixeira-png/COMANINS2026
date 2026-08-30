const fs = require('fs');
let code = fs.readFileSync('src/components/RentalManagement.tsx', 'utf8');

// Update MovementPrint commercial rules
code = code.replace(
  /\{rental && <div className="border-x border-b border-black p-4 text-xs"><b>Regra comercial:<\/b> locação em ciclos fixos de 30 dias, sem cobrança diária ou pró-rata\. Primeiro vencimento: \{formatDate\(rental\.firstDueDate\)\}\.<\/div>\}/,
  '{rental && isDispatch && <div className="border-x border-b border-black p-4 text-xs"><b>Regra comercial:</b> locação em ciclos fixos de 30 dias, sem cobrança diária ou pró-rata. Primeiro vencimento: {formatDate(rental.firstDueDate)}.</div>}'
);

// Add action to delete invoice
code = code.replace(
  /const deleteRental = async \(rental: RentalContract\) => \{/,
  `const deleteInvoice = async (invoice: RentalInvoice) => {
    if (!ensureEditable()) return;
    if (confirm(\`Tem certeza que deseja cancelar e excluir a fatura \${invoice.invoiceNumber} e os lançamentos no financeiro associados?\`)) {
      setBusy(true);
      try {
        await fetch(\`/api/rentals/invoices/\${invoice.id}\`, {
          method: 'DELETE',
          headers: { 'Authorization': \`Bearer \${(window as any).currentUserToken}\` }
        }).then(res => {
          if (!res.ok) throw new Error('Failed to delete invoice');
        });
        setNotice(\`Fatura \${invoice.invoiceNumber} excluída.\`);
        // We might want to reload invoices here
      } catch (e: any) {
        setError(e?.message || 'Não foi possível excluir a fatura.');
      } finally {
        setBusy(false);
      }
    }
  };

  const deleteRental = async (rental: RentalContract) => {`
);

// Add the delete button to invoices view. Let's find where invoices are mapped
code = code.replace(
  /invoice\.status === 'cancelada' \? 'bg-slate-100 opacity-60' : 'bg-white'/g,
  'invoice.status === \'cancelada\' ? \'bg-slate-100 opacity-60 relative\' : \'bg-white relative\''
);

code = code.replace(
  /(\<div className="flex gap-2"\>)\s*(\<button onClick=\{\(\) =\> setPrintDocument\(\{ kind: 'invoice', invoice, rental: findRental\(invoice\.rentalId\) \}\)\} className="px-3 py-1\.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 text-xs font-bold"\>)/,
  '$1\n                  {canEdit && <button onClick={() => deleteInvoice(invoice)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold mr-2"><Trash2 className="w-3 h-3 inline mr-1" /> Excluir Fatura</button>}\n                  $2'
);

fs.writeFileSync('src/components/RentalManagement.tsx', code);
