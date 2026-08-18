const fs = require('fs');

let content = fs.readFileSync('src/components/FieldService.tsx', 'utf-8');

// Patch import check
const oldImportCheck = `          const cert = normalizedRow['certificado'] || normalizedRow['cert'] || '';
          if (!cert) continue; 
          
          if (existingCerts.has(String(cert))) {
            duplicates++;
            continue;
          }
          existingCerts.add(String(cert));`;

const newImportCheck = `          const cert = normalizedRow['certificado'] || normalizedRow['cert'] || '';
          const strCert = String(cert).trim();
          
          if (strCert !== '' && existingCerts.has(strCert)) {
            duplicates++;
            continue;
          }
          if (strCert !== '') {
            existingCerts.add(strCert);
          }`;

content = content.replace(oldImportCheck, newImportCheck);

// Patch manual form check
const oldFormCheck = `    if (!formData.certificate) {
      alert("O campo Certificado é obrigatório.");
      return;
    }

    const isDuplicate = records.some(r => r.certificate === formData.certificate && r.id !== formData.id);
    if (isDuplicate) {
      alert("Erro: Este Certificado já está registrado na planilha!");
      return;
    }`;

const newFormCheck = `    const isDuplicate = formData.certificate && formData.certificate.trim() !== '' && records.some(r => r.certificate === formData.certificate && r.id !== formData.id);
    if (isDuplicate) {
      alert("Erro: Este Certificado já está registrado na planilha!");
      return;
    }`;

content = content.replace(oldFormCheck, newFormCheck);

// Patch form required attr
const oldInput = `<label className="block text-xs font-semibold text-slate-700 mb-1">Certificado *</label>
                  <input
                    type="text"
                    required`;

const newInput = `<label className="block text-xs font-semibold text-slate-700 mb-1">Certificado</label>
                  <input
                    type="text"`;

content = content.replace(oldInput, newInput);


fs.writeFileSync('src/components/FieldService.tsx', content);
console.log("Patched FieldService.tsx to allow blank certs");
