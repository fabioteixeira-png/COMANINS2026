const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target = `    if (availableCount >= totalAllowed && totalAllowed > 0) {
      return {
        label: "Disponível para Retirada",`;

const replacement = `    const deliveredCount = matching.filter(
      (i) => i.status === "Entregue",
    ).length;

    if (deliveredCount >= totalAllowed && totalAllowed > 0) {
      return {
        label: "Entregue",
        badgeClass:
          "bg-teal-50 text-teal-700 border border-teal-200 font-bold",
        badgeDarkClass:
          "bg-teal-500/10 text-teal-400 border border-teal-500/30 font-bold",
        registeredCount,
        totalAllowed,
      };
    }

    if (availableCount >= totalAllowed && totalAllowed > 0) {
      return {
        label: "Disponível para Retirada",`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/InternalPortal.tsx', code);
