const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Find the endpoint
content = content.replace(
  'const { employeeName, employeeRegister, month, visualizedAt, ip, userAgent } = req.body;',
  'const { employeeName, employeeRegister, month, visualizedAt, ip, userAgent, documentType } = req.body;'
);

content = content.replace(
  'const emailSubject = `[COMPROVANTE LGPD] Visualização de Contra-cheque - ${employeeName} (${month})`;',
  'const docTypeLabel = documentType || "Contra-cheque";\n  const emailSubject = `[COMPROVANTE LGPD] Visualização de ${docTypeLabel} - ${employeeName} (${month})`;'
);

content = content.replace(
  'Confirmamos que o colaborador abaixo visualizou seu contra-cheque correspondente ao mês de referência',
  'Confirmamos que o colaborador abaixo visualizou seu(ua) <b>${docTypeLabel}</b> correspondente ao mês de referência'
);

content = content.replace(
  /Comprovante de Visualização de Contra-cheque\\n\\nColaborador:/g,
  'Comprovante de Visualização de ${docTypeLabel}\\n\\nColaborador:'
);

content = content.replace(
  /Notificação de visualização de contra-cheque/g,
  'Notificação de visualização de ${docTypeLabel}'
);

fs.writeFileSync('server.ts', content);
