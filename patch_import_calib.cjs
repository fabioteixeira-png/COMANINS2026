const fs = require('fs');

let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

const targetStr = `            if (certNumber && onSaveCalibration) {
              await onSaveCalibration({
                instrumentId: savedInst.id,
                certNumber,
                technicianName: tech,
                observations: obs,
                referenceStandardIds: [],
                referenceStandards: [],
                points: [
                  {
                    id: "p1",
                    nominalValue: rMin,
                    standardValue: rMin,
                    instrumentValue: rMin,
                    error: 0,
                    mpe,
                    pass: true,
                  },
                  {
                    id: "p2",
                    nominalValue: (rMin + rMax) / 2,
                    standardValue: (rMin + rMax) / 2,
                    instrumentValue: (rMin + rMax) / 2,
                    error: 0,
                    mpe,
                    pass: true,
                  },
                  {
                    id: "p3",
                    nominalValue: rMax,
                    standardValue: rMax,
                    instrumentValue: rMax,
                    error: 0,
                    mpe,
                    pass: true,
                  },
                ],
              });
            }`;

const newStr = `            if (certNumber && onSaveCalibration) {
              const padroesRaw = row.padroes_utilizados || row["padrões utilizados"] || "";
              const selectedStds = padroesRaw ? padroesRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];
              const matchedStds = referenceStandards.filter((rs) => selectedStds.some((s) => rs.certificateNumber.toLowerCase().includes(s.toLowerCase()) || rs.identification?.toLowerCase().includes(s.toLowerCase())));
              
              let parsedPoints = [];
              for (let i = 1; i <= 10; i++) {
                const nom = row[\`p\${i}_nominal\`];
                const pad = row[\`p\${i}_padrao\`] || row[\`p\${i}_padrão\`];
                const instVal = row[\`p\${i}_instrumento\`];
                if (nom !== undefined && nom !== "") {
                  const n = Number(String(nom).replace(",", "."));
                  const p = pad !== undefined && pad !== "" ? Number(String(pad).replace(",", ".")) : n;
                  const v = instVal !== undefined && instVal !== "" ? Number(String(instVal).replace(",", ".")) : n;
                  parsedPoints.push({
                    id: \`p\${i}\`,
                    nominalValue: n,
                    standardValue: p,
                    instrumentValue: v,
                    error: Number((v - p).toFixed(4)),
                    mpe,
                    pass: Math.abs(v - p) <= mpe,
                  });
                }
              }

              if (parsedPoints.length === 0) {
                 parsedPoints = [
                  {
                    id: "p1",
                    nominalValue: rMin,
                    standardValue: rMin,
                    instrumentValue: rMin,
                    error: 0,
                    mpe,
                    pass: true,
                  },
                  {
                    id: "p2",
                    nominalValue: (rMin + rMax) / 2,
                    standardValue: (rMin + rMax) / 2,
                    instrumentValue: (rMin + rMax) / 2,
                    error: 0,
                    mpe,
                    pass: true,
                  },
                  {
                    id: "p3",
                    nominalValue: rMax,
                    standardValue: rMax,
                    instrumentValue: rMax,
                    error: 0,
                    mpe,
                    pass: true,
                  },
                ];
              }

              await onSaveCalibration({
                instrumentId: savedInst.id,
                certNumber,
                technicianName: tech,
                observations: obs,
                referenceStandardIds: matchedStds.map(s => s.id),
                referenceStandards: matchedStds,
                points: parsedPoints,
              });
            }`;

content = content.replace(targetStr, newStr);

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Patched logic for points in import calibrations");
