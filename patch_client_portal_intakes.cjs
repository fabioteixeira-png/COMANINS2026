const fs = require('fs');
let code = fs.readFileSync('src/components/ClientPortal.tsx', 'utf8');

const importStatement = "import { syncClientIntakes, SavedIntake } from '../lib/firebase';\n";

if (!code.includes('syncClientIntakes')) {
  // Add import
  code = code.replace("import { getReportAuthKey } from '../utils/authKey';", "import { getReportAuthKey } from '../utils/authKey';\n" + importStatement);
}

const componentStart = "export default function ClientPortal({ client, instruments, reports, customLogo, onLogout }: ClientPortalProps) {";

if (!code.includes('const [clientIntakes, setClientIntakes]')) {
  const hooksToAdd = `
  const [clientIntakes, setClientIntakes] = useState<SavedIntake[]>([]);
  
  useEffect(() => {
    if (client?.id) {
      const unsub = syncClientIntakes(client.id, (list) => {
        setClientIntakes(list);
      });
      return () => unsub.then(fn => fn());
    }
  }, [client?.id]);
`;

  code = code.replace(
    componentStart,
    componentStart + hooksToAdd
  );
}

// Update getClientStatus to use clientIntakes
const originalGetClientStatus = `  const getClientStatus = (inst: Instrument, allInsts: Instrument[]) => {
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
  };`;

const newGetClientStatus = `  const getClientStatus = (inst: Instrument, allInsts: Instrument[]) => {
    if (inst.status === 'Disponível para Retirada' || inst.status === 'Entregue') {
      if (!inst.numeroDaEntrada) return inst.status;
      
      const numEntrada = inst.numeroDaEntrada.trim().toLowerCase();
      const intake = clientIntakes.find(i => (i.numEntrada || '').trim().toLowerCase() === numEntrada);
      
      let expectedCount = 0;
      if (intake && intake.rows) {
         expectedCount = intake.rows.reduce((sum, r) => sum + (Number(r.quant) || 0), 0);
      }
      
      const intakeInstruments = allInsts.filter(i => (i.numeroDaEntrada || '').trim().toLowerCase() === numEntrada);
      const readyCount = intakeInstruments.filter(i => 
        i.status === 'Disponível para Retirada' || 
        i.status === 'Entregue' || 
        i.status === 'Não Conforme'
      ).length;
      
      // Se não sabemos a quantidade esperada (sem intake salvo), baseamos apenas no que está lançado.
      const allReady = expectedCount > 0 ? (readyCount >= expectedCount) : intakeInstruments.every(i => 
        i.status === 'Disponível para Retirada' || 
        i.status === 'Entregue' || 
        i.status === 'Não Conforme'
      );
      
      if (!allReady) {
        return inst.status === 'Entregue' ? 'Entregue' : 'Aguardando Calibração'; // se já foi entregue, mantem.
      }
    }
    return inst.status;
  };`;

code = code.replace(originalGetClientStatus, newGetClientStatus);

fs.writeFileSync('src/components/ClientPortal.tsx', code);
