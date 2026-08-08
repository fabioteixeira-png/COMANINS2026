const fs = require('fs');
const file = 'src/components/InternalPortal.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `        const fe = Math.max(Math.abs(max), Math.abs(min));
        let pct = 1.0;
        if (initialAccuracyClass === 'A4') pct = 0.10;
        else if (initialAccuracyClass === 'A3') pct = 0.25;
        else if (initialAccuracyClass === 'A2') pct = 0.50;
        else if (initialAccuracyClass === 'A1') pct = 1.0;
        else if (initialAccuracyClass === 'A') pct = 1.0;
        else if (initialAccuracyClass === 'B') pct = 2.0;
        else if (initialAccuracyClass === 'C') pct = 3.0;
        else if (initialAccuracyClass === 'D') pct = 4.0;
        else if (initialAccuracyClass.includes('0.075')) pct = 0.075;
        else if (initialAccuracyClass.includes('AA')) pct = 0.1;
        else if (initialAccuracyClass.includes('0.1')) pct = 0.1;
        else if (initialAccuracyClass.includes('0.20') || initialAccuracyClass.includes('0.2')) pct = 0.2;
        else if (initialAccuracyClass.includes('Classe A') || initialAccuracyClass.includes('0.25')) pct = 0.25;
        else if (initialAccuracyClass.includes('Classe B') || initialAccuracyClass.includes('0.5')) pct = 0.5;
        else if (initialAccuracyClass.includes('Classe 1') || initialAccuracyClass.includes('1.0')) pct = 1.0;
        else if (initialAccuracyClass.includes('Classe 2') || initialAccuracyClass.includes('1.5')) pct = 1.5;
        else if (initialAccuracyClass.includes('2.0')) pct = 2.0;
        else if (initialAccuracyClass.includes('3.0')) pct = 3.0;
        
        setBenchMpe(Number(((pct / 100) * fe).toFixed(4)));

        // 1. Manômetro & Termômetro Points (VI vs VRef)
        let pcts: number[] = [];
        if (benchPointCount === 10) {
          pcts = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        } else if (benchPointCount === 5) {
          pcts = [0, 25, 50, 75, 100];
        } else {
          const step = 100 / Math.max(1, benchPointCount - 1);
          for (let i = 0; i < benchPointCount; i++) {
            pcts.push(i * step);
          }
        }

        const pts = pcts.map(pct => ({
          nominal: Number((min + (span * pct) / 100).toFixed(2)),
          refAsc1: '',
          refDesc1: '',
          refAsc2: '',
          refDesc2: ''
        }));
        setBenchPoints(pts);`;

const replacement = `        let fe = Math.max(Math.abs(max), Math.abs(min));
        if (detectedType === 'manovacuometro') {
          let minInMaxUnit = Math.abs(min);
          if (min <= -700) { minInMaxUnit = Math.abs(min) / 760; } // mmHg to kgf/cm2
          else if (min <= -25) { minInMaxUnit = Math.abs(min) / 29.92; } // inHg to bar
          fe = minInMaxUnit + Math.abs(max);
        }

        let pct = 1.0;
        if (initialAccuracyClass === 'A4') pct = 0.10;
        else if (initialAccuracyClass === 'A3') pct = 0.25;
        else if (initialAccuracyClass === 'A2') pct = 0.50;
        else if (initialAccuracyClass === 'A1') pct = 1.0;
        else if (initialAccuracyClass === 'A') pct = 1.0;
        else if (initialAccuracyClass === 'B') pct = 2.0;
        else if (initialAccuracyClass === 'C') pct = 3.0;
        else if (initialAccuracyClass === 'D') pct = 4.0;
        else if (initialAccuracyClass.includes('0.075')) pct = 0.075;
        else if (initialAccuracyClass.includes('AA')) pct = 0.1;
        else if (initialAccuracyClass.includes('0.1')) pct = 0.1;
        else if (initialAccuracyClass.includes('0.20') || initialAccuracyClass.includes('0.2')) pct = 0.2;
        else if (initialAccuracyClass.includes('Classe A') || initialAccuracyClass.includes('0.25')) pct = 0.25;
        else if (initialAccuracyClass.includes('Classe B') || initialAccuracyClass.includes('0.5')) pct = 0.5;
        else if (initialAccuracyClass.includes('Classe 1') || initialAccuracyClass.includes('1.0')) pct = 1.0;
        else if (initialAccuracyClass.includes('Classe 2') || initialAccuracyClass.includes('1.5')) pct = 1.5;
        else if (initialAccuracyClass.includes('2.0')) pct = 2.0;
        else if (initialAccuracyClass.includes('3.0')) pct = 3.0;
        
        setBenchMpe(Number(((pct / 100) * fe).toFixed(4)));

        // 1. Manômetro & Termômetro & Manovacuometro Points
        let pts = [];
        if (detectedType === 'manovacuometro') {
          // Vacuum points
          const vacPointsCount = Math.floor(benchPointCount / 2);
          const pressPointsCount = benchPointCount - vacPointsCount;
          
          let vacStep = vacPointsCount > 1 ? Math.abs(min) / (vacPointsCount - 1) : Math.abs(min);
          for (let i = 0; i < vacPointsCount; i++) {
            pts.push({
              nominal: Number((min + (vacStep * i)).toFixed(2)),
              refAsc1: '', refDesc1: '', refAsc2: '', refDesc2: ''
            });
          }
          
          let pressStep = pressPointsCount > 1 ? max / (pressPointsCount - 1) : max;
          for (let i = 0; i < pressPointsCount; i++) {
            pts.push({
              nominal: Number((0 + (pressStep * i)).toFixed(2)),
              refAsc1: '', refDesc1: '', refAsc2: '', refDesc2: ''
            });
          }
          // Sort points just in case and remove duplicates (like zero)
          pts = pts.sort((a, b) => a.nominal - b.nominal);
          pts = pts.filter((pt, index, self) => index === self.findIndex((t) => t.nominal === pt.nominal));
          
          // if we removed duplicates and are short on points, add one to the end if possible
          if (pts.length < benchPointCount && max > 0) {
             // just keeping it simple
          }
        } else {
          let pcts: number[] = [];
          if (benchPointCount === 10) {
            pcts = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
          } else if (benchPointCount === 5) {
            pcts = [0, 25, 50, 75, 100];
          } else {
            const step = 100 / Math.max(1, benchPointCount - 1);
            for (let i = 0; i < benchPointCount; i++) {
              pcts.push(i * step);
            }
          }

          pts = pcts.map(pct => ({
            nominal: Number((min + (span * pct) / 100).toFixed(2)),
            refAsc1: '',
            refDesc1: '',
            refAsc2: '',
            refDesc2: ''
          }));
        }
        setBenchPoints(pts);`;

if(content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log("Success");
} else {
  console.log("Target not found");
}
