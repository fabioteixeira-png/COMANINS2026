const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const endpointCode = `
app.delete('/api/rentals/invoices/:id', requireAuth, requireInternalAccount, requireAdmin, writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const invoiceId = asLimitedString(req.params.id, 180);
  if (!invoiceId) return res.status(400).json({ error: 'INVALID_INVOICE_ID' });

  const invoiceRef = firestoreDb.collection('rentalInvoices').doc(invoiceId);
  
  try {
    await firestoreDb.runTransaction(async (transaction) => {
      const invoiceSnap = await transaction.get(invoiceRef);
      if (!invoiceSnap.exists) {
        const error: any = new Error('INVOICE_NOT_FOUND'); error.code = 'INVOICE_NOT_FOUND'; throw error;
      }
      
      const invoiceData = invoiceSnap.data() || {};
      const financeTransactionId = invoiceData.financeTransactionId;
      
      if (financeTransactionId) {
        const financeRef = firestoreDb.collection('financeTransactions').doc(financeTransactionId);
        const financeSnap = await transaction.get(financeRef);
        if (financeSnap.exists) {
          transaction.delete(financeRef);
        }
      }
      
      transaction.delete(invoiceRef);
    });

    const { actorName, actorUid } = rentalActor(req);
    await firestoreDb.collection('systemAuditLogs').add({
      timestamp: new Date().toISOString(),
      action: 'RENTAL_INVOICE_DELETED',
      entityId: invoiceId,
      entityType: 'rentalInvoice',
      actorUid,
      actorName,
      details: 'Fatura de locação e lançamentos financeiros excluídos.',
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Invoice deletion failed:', error);
    if (error.code === 'INVOICE_NOT_FOUND') return res.status(404).json({ error: 'INVOICE_NOT_FOUND' });
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});
`;

code = code.replace(
  /app\.post\('\/api\/rentals\/contracts\/:id\/invoices'/,
  endpointCode + '\napp.post(\'/api/rentals/contracts/:id/invoices\''
);

fs.writeFileSync('server.ts', code);
