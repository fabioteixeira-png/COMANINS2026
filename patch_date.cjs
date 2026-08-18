const fs = require('fs');
let code = fs.readFileSync('src/components/FieldService.tsx', 'utf8');

const target = "interventionDate: String(normalizedRow['data'] || normalizedRow['date'] || normalizedRow['dataintervencao'] || normalizedRow['datadeinterveno'] || ''),";
const replacement = "interventionDate: String(normalizedRow['data'] || normalizedRow['date'] || normalizedRow['datadeintervencao'] || normalizedRow['dataintervencao'] || normalizedRow['datadeinterveno'] || normalizedRow['datadeint'] || ''),";

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/FieldService.tsx', code);
  console.log('Date mapping patched.');
} else {
  console.log('Target not found.');
  // fallback search
  const regex = /interventionDate: String\(.*?\),/;
  if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/FieldService.tsx', code);
    console.log('Date mapping patched via regex.');
  }
}
