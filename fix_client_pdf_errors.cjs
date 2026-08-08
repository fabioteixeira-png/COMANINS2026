const fs = require('fs');
const file = 'src/components/ClientPortal.tsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `                 const absErr = count > 0 ? Math.abs(nominal - avg) : (p.error !== undefined ? Math.abs(p.error) : 0);
                 if (count > 0 && absErr > maxAbsError) {
                    maxAbsError = absErr;
                 }`;

const replacement1 = `                 const absErr = count > 0 ? Math.abs(nominal - avg) : (p.error !== undefined ? Math.abs(p.error) : 0);
                 let normalizedAbsErr = absErr;
                 if (inst?.typeSpec === 'manovacuometro' && nominal < 0) {
                    const minVal = inst?.rangeMin || 0;
                    if (minVal <= -700) normalizedAbsErr = absErr / 760;
                    else if (minVal <= -25) normalizedAbsErr = absErr / 29.92;
                 }
                 if (count > 0 && normalizedAbsErr > maxAbsError) {
                    maxAbsError = normalizedAbsErr;
                 }`;

const target2 = `                    const hyst1 = Math.abs(d1 - a1);
                    if (hyst1 > maxHysteresis) maxHysteresis = hyst1;
                    localHyst = Math.max(localHyst, hyst1);`;

const replacement2 = `                    let hyst1 = Math.abs(d1 - a1);
                    let normalizedHyst1 = hyst1;
                    if (inst?.typeSpec === 'manovacuometro' && nominal < 0) {
                       const minVal = inst?.rangeMin || 0;
                       if (minVal <= -700) normalizedHyst1 = hyst1 / 760;
                       else if (minVal <= -25) normalizedHyst1 = hyst1 / 29.92;
                    }
                    if (normalizedHyst1 > maxHysteresis) maxHysteresis = normalizedHyst1;
                    localHyst = Math.max(localHyst, hyst1);`;

const target3 = `                    const hyst2 = Math.abs(d2 - a2);
                    if (hyst2 > maxHysteresis) maxHysteresis = hyst2;
                    localHyst = Math.max(localHyst, hyst2);`;

const replacement3 = `                    let hyst2 = Math.abs(d2 - a2);
                    let normalizedHyst2 = hyst2;
                    if (inst?.typeSpec === 'manovacuometro' && nominal < 0) {
                       const minVal = inst?.rangeMin || 0;
                       if (minVal <= -700) normalizedHyst2 = hyst2 / 760;
                       else if (minVal <= -25) normalizedHyst2 = hyst2 / 29.92;
                    }
                    if (normalizedHyst2 > maxHysteresis) maxHysteresis = normalizedHyst2;
                    localHyst = Math.max(localHyst, hyst2);`;

if (content.includes(target1)) {
  content = content.replace(target1, replacement1);
  content = content.replace(target2, replacement2);
  content = content.replace(target3, replacement3);
  fs.writeFileSync(file, content);
  console.log("Success ClientPortal");
} else {
  console.log("Targets not found ClientPortal");
}
