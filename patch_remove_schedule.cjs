const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

const target1 = `  const [newNrExpirationDate, setNewNrExpirationDate] = useState('');
  const [newNrScheduledDate, setNewNrScheduledDate] = useState('');
  const [newNrStatus, setNewNrStatus] = useState<'Válido' | 'Agendado' | 'Pendente' | 'Vencido'>('Válido');`;

const replacement1 = `  const [newNrExpirationDate, setNewNrExpirationDate] = useState('');
  const [newNrStatus, setNewNrStatus] = useState<'Válido' | 'Agendado' | 'Pendente' | 'Vencido'>('Válido');`;

code = code.replace(target1, replacement1);

const target2 = `        expirationDate: expDate,
        scheduledDate: newNrScheduledDate,
        status: newNrStatus,`;

const replacement2 = `        expirationDate: expDate,
        status: newNrStatus,`;

code = code.replace(target2, replacement2);

const target3 = `      setNewNrExpirationDate('');
      setNewNrScheduledDate('');
      setNewNrStatus('Válido');`;

const replacement3 = `      setNewNrExpirationDate('');
      setNewNrStatus('Válido');`;

code = code.replace(target3, replacement3);

const targetUI = `                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Data Agendada (Se futuro)</label>
                            <input
                              type="date"
                              value={newNrScheduledDate}
                              onChange={(e) => setNewNrScheduledDate(e.target.value)}
                              className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                            />
                          </div>`;

code = code.replace(targetUI, '');
fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
