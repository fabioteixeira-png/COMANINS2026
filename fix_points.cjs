const fs = require('fs');
const file = 'src/components/InternalPortal.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `        if (detectedType === 'manovacuometro') {
          // Vacuum points
          const vacPointsCount = Math.floor(benchPointCount / 2);
          const pressPointsCount = benchPointCount - vacPointsCount;
          
          let vacStep = vacPointsCount > 1 ? Math.abs(min) / (vacPointsCount - 1) : Math.abs(min);`;

const replacement = `        if (detectedType === 'manovacuometro') {
          // Vacuum points
          const totalPointsToGenerate = benchPointCount + 1; // Since 0 is shared
          const vacPointsCount = Math.floor(totalPointsToGenerate / 2);
          const pressPointsCount = totalPointsToGenerate - vacPointsCount;
          
          let vacStep = vacPointsCount > 1 ? Math.abs(min) / (vacPointsCount - 1) : Math.abs(min);`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log("Success");
} else {
  console.log("Target not found");
}
