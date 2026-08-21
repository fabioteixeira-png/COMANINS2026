const fs = require('fs');
let code = fs.readFileSync('src/components/ClientPortal.tsx', 'utf8');

const filterOriginal = `    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'pending') {
      return matchesSearch && (inst.status === 'Aguardando Triagem' || inst.status === 'Em Calibração');
    }
    if (statusFilter === 'completed') {
      return matchesSearch && (inst.status === 'Calibrado' || inst.status === 'Entregue');
    }
    return matchesSearch;`;

const filterReplacement = `    const dStatus = displayStatuses.get(inst.id);
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'pending') {
      return matchesSearch && (dStatus === 'Aguardando Triagem' || dStatus === 'Em Calibração' || dStatus === 'Aguardando Calibração' || dStatus === 'Aguardando Emissão de Certificado');
    }
    if (statusFilter === 'completed') {
      return matchesSearch && (dStatus === 'Calibrado' || dStatus === 'Entregue' || dStatus === 'Disponível para Retirada' || dStatus === 'Não Conforme');
    }
    return matchesSearch;`;

code = code.replace(filterOriginal, filterReplacement);

fs.writeFileSync('src/components/ClientPortal.tsx', code);
