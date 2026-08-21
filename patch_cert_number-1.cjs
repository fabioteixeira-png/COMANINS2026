const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

const oldLogic = `        const year = new Date().getFullYear();
        const nextNum = certSequence.nextNumber || 1;
        const generatedCertNumber = \`\${certSequence.prefix}\${nextNum}\`;`;

const newLogic = `        const year = new Date().getFullYear();
        const nextNum = certSequence.nextNumber || 1;
        const generatedCertNumber = activeInst?.certificateNumber || \`\${certSequence.prefix}\${nextNum}\`;
        const isNewNumber = !activeInst?.certificateNumber;`;

content = content.replace(oldLogic, newLogic);

const oldSequenceUpdate = `        // Update certificate sequence
        await saveCertSequenceConfig({
          ...certSequence,
          nextNumber: nextNum + 1,
        });`;

const newSequenceUpdate = `        // Update certificate sequence if a new one was generated
        if (isNewNumber) {
          await saveCertSequenceConfig({
            ...certSequence,
            nextNumber: nextNum + 1,
          });
        }`;

content = content.replace(oldSequenceUpdate, newSequenceUpdate);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Patched cert number logic for calibrations");
