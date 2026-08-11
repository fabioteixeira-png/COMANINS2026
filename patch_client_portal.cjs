const fs = require('fs');
let code = fs.readFileSync('src/components/ClientPortal.tsx', 'utf8');

// Find the start of ClientPortal
const componentStart = `export default function ClientPortal({ client, instruments, reports, customLogo, onLogout }: ClientPortalProps) {`;

const getClientStatusFn = `
  const getClientStatus = (inst: Instrument, allInsts: Instrument[]) => {
    if (inst.status === 'Disponível para Retirada') {
      if (!inst.numeroDaEntrada) return 'Disponível para Retirada';
      
      const intakeInstruments = allInsts.filter(i => i.numeroDaEntrada === inst.numeroDaEntrada);
      const allReady = intakeInstruments.every(i => 
        i.status === 'Disponível para Retirada' || 
        i.status === 'Entregue' || 
        i.status === 'Não Conforme'
      );
      
      if (!allReady) {
        return 'Aguardando Calibração';
      }
    }
    return inst.status;
  };
`;

code = code.replace(
  componentStart,
  componentStart + getClientStatusFn
);

// We need to replace usages of inst.status with displayStatus inside ClientPortal stats and filtering
const statsReplacement = `
  // Filter instruments belonging to this client
  const clientInstruments = instruments.filter(inst => inst.clientId === client.id);

  const displayStatuses = new Map<string, string>();
  clientInstruments.forEach(inst => {
    displayStatuses.set(inst.id, getClientStatus(inst, clientInstruments));
  });

  // Stats calculation
  const totalInstruments = clientInstruments.length;
  const pendingInstruments = clientInstruments.filter(inst => {
    const s = displayStatuses.get(inst.id);
    return s === 'Aguardando Triagem' || s === 'Em Calibração' || s === 'Aguardando Calibração' || s === 'Aguardando Emissão de Certificado';
  }).length;
  const completedInstruments = clientInstruments.filter(inst => {
    const s = displayStatuses.get(inst.id);
    return s === 'Calibrado' || s === 'Entregue' || s === 'Disponível para Retirada' || s === 'Não Conforme';
  }).length;
`;

// Replace from "// Filter instruments belonging to this client" to "const completedInstruments = ..."
code = code.replace(
  /\/\/ Filter instruments belonging to this client[\s\S]*?const completedInstruments = [^\n]+;/m,
  statsReplacement
);

fs.writeFileSync('src/components/ClientPortal.tsx', code);
