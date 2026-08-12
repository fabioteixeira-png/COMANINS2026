const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const target1 = `export async function syncPayslips(callback: (payslips: Payslip[]) => void) {
  const cached = getLocalCache<Payslip[]>('payslips', []);
  if (cached.length > 0) callback(cached);
  const q = query(collection(db, 'payslips'), limit(25));
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Payslip));
      setLocalCache('payslips', list);
      callback(list);
    }
  }, (err) => {`;

const replace1 = `export async function syncPayslips(callback: (payslips: Payslip[]) => void) {
  const cached = getLocalCache<Payslip[]>('payslips', []);
  if (cached.length > 0) callback(cached);
  const q = query(collection(db, 'payslips'));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Payslip));
    setLocalCache('payslips', list);
    callback(list);
  }, (err) => {`;

code = code.replace(target1, replace1);

fs.writeFileSync('src/lib/firebase.ts', code);
