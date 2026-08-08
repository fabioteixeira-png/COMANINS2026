const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

content = content.replace(/Meus Contra-cheques/g, 'Meus Documentos');
content = content.replace(/Portal de Demonstrativos e Contra-cheques/g, 'Portal de Demonstrativos (RH)');
content = content.replace(/Anexar Contra-cheque PDF/g, 'Anexar Documento PDF');
content = content.replace(/Anexar Novo Contra-cheque PDF/g, 'Anexar Novo Documento (PDF)');
content = content.replace(/Gerenciar Contra-cheques & Auditoria \\(LGPD\\)/g, 'Gerenciar Documentos & Auditoria (LGPD)');
content = content.replace(/Entrar na Área de Contra-cheques/g, 'Entrar na Área de Documentos');
content = content.replace(/Seus Contra-cheques Disponíveis/g, 'Seus Documentos Disponíveis');
content = content.replace(/Nenhum contra-cheque disponível/g, 'Nenhum documento disponível');
content = content.replace(/Nenhum contra-cheque cadastrado/g, 'Nenhum documento cadastrado');

fs.writeFileSync('src/components/InternalPortal.tsx', content);
