const fs = require('fs');
let code = fs.readFileSync('src/components/ClientPortal.tsx', 'utf8');

const target1 = `import { Client, Instrument, CalibrationReport } from '../types';
import { PrivacyPolicyModal } from './LGPDPrivacy';
import { getReportAuthKey } from '../utils/authKey';
import { syncClientIntakes, SavedIntake } from '../lib/firebase';`;

const replace1 = `import { Client, Instrument, CalibrationReport, RncReport } from '../types';
import { PrivacyPolicyModal } from './LGPDPrivacy';
import { getReportAuthKey } from '../utils/authKey';
import { syncClientIntakes, SavedIntake, syncRncReports } from '../lib/firebase';`;

code = code.replace(target1, replace1);

const target2 = `  const [selectedReport, setSelectedReport] = useState<CalibrationReport | null>(null);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);

  const [copiedKey, setCopiedKey] = useState(false);

  // Read URL query string for ?chave=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chaveParam = params.get('chave');
    if (chaveParam) {
      setSearchTerm(chaveParam);
    }
  }, []);`;

const replace2 = `  const [selectedReport, setSelectedReport] = useState<CalibrationReport | null>(null);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [rncReports, setRncReports] = useState<RncReport[]>([]);
  const [selectedRncReport, setSelectedRncReport] = useState<RncReport | null>(null);
  const [showRncViewModal, setShowRncViewModal] = useState<boolean>(false);

  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    let unsubscribeRnc: any = null;
    syncRncReports((list) => {
      setRncReports(list);
    }).then(unsub => {
      unsubscribeRnc = unsub;
    }).catch(console.error);

    return () => {
      if (unsubscribeRnc) unsubscribeRnc();
    };
  }, []);

  // Read URL query string for ?chave=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chaveParam = params.get('chave');
    if (chaveParam) {
      setSearchTerm(chaveParam);
    }
  }, []);`;

code = code.replace(target2, replace2);

fs.writeFileSync('src/components/ClientPortal.tsx', code);
