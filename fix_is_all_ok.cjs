const fs = require('fs');
const file = 'src/components/InternalPortal.tsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `    if (selectedInstrumentType === 'manometro' || selectedInstrumentType === 'termometro') {
      if (!benchPoints || benchPoints.length === 0) {`;

const replacement1 = `    if (selectedInstrumentType === 'manometro' || selectedInstrumentType === 'termometro' || selectedInstrumentType === 'manovacuometro') {
      if (!benchPoints || benchPoints.length === 0) {`;

const target2 = `          const vals = [a1, d1, a2, d2];
          const avg = vals.reduce((sum, v) => sum + v, 0) / vals.length;
          const errVal = Math.abs(Number((p.nominal - avg).toFixed(2)));
          if (errVal > (benchMpe || 1.0)) {
            isAllOk = false;
          }`;

const replacement2 = `          const vals = [a1, d1, a2, d2];
          const avg = vals.reduce((sum, v) => sum + v, 0) / vals.length;
          const errVal = Math.abs(Number((p.nominal - avg).toFixed(2)));
          
          let currentMpe = benchMpe || 1.0;
          if (selectedInstrumentType === 'manovacuometro' && p.nominal < 0) {
            const min = activeInst?.rangeMin || 0;
            if (min <= -700) { currentMpe = currentMpe * 760; }
            else if (min <= -25) { currentMpe = currentMpe * 29.92; }
          }
          
          if (errVal > currentMpe) {
            isAllOk = false;
          }`;

if (content.includes(target1) && content.includes(target2)) {
  content = content.replace(target1, replacement1);
  content = content.replace(target2, replacement2);
  fs.writeFileSync(file, content);
  console.log("Success");
} else {
  console.log("Targets not found");
}
