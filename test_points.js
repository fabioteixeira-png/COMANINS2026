const benchPointCount = 5;
const min = -760;
const max = 10;
const totalPointsToGenerate = benchPointCount + 1; // Since 0 is shared
const vacPointsCount = Math.floor(totalPointsToGenerate / 2);
const pressPointsCount = totalPointsToGenerate - vacPointsCount;

let vacStep = vacPointsCount > 1 ? Math.abs(min) / (vacPointsCount - 1) : Math.abs(min);
let pressStep = pressPointsCount > 1 ? max / (pressPointsCount - 1) : max;

let pts = [];

// Vacuum points (from min to 0)
for (let i = 0; i < vacPointsCount; i++) {
    pts.push({ nominal: min + (i * vacStep) });
}

// Pressure points (from 0 to max)
for (let i = 0; i < pressPointsCount; i++) {
    pts.push({ nominal: 0 + (i * pressStep) });
}

pts = pts.sort((a, b) => a.nominal - b.nominal);
pts = pts.filter((pt, index, self) => index === self.findIndex((t) => t.nominal === pt.nominal));

console.log(pts.map(p => p.nominal));
