const fs = require('fs');
let content = fs.readFileSync('src/components/FieldService.tsx', 'utf-8');

content = content.replace(
  /bulkAddFieldServiceRecords,/g,
  'bulkAddFieldServiceRecords,\n  bulkUpsertFieldServiceRecords,'
);

const oldImport = `        let duplicates = 0;
        const newRecordsToImport: Omit<FieldServiceRecord, 'id'>[] = [];
        const existingCerts = new Set(records.map(r => r.certificate));

        for (const row of data as any[]) {
          const normalizedRow = Object.keys(row).reduce((acc, key) => {
             acc[normalizeKey(key)] = row[key];
             return acc;
          }, {} as Record<string, any>);

          const cert = normalizedRow['certificado'] || normalizedRow['cert'] || '';
          const strCert = String(cert).trim();
          
          if (strCert !== '' && existingCerts.has(strCert)) {
            duplicates++;
            continue;
          }
          if (strCert !== '') {
            existingCerts.add(strCert);
          }

          newRecordsToImport.push({
            cliente: String(normalizedRow['cliente'] || ''),
            tag: String(normalizedRow['tag'] || ''),
            equipamento: String(normalizedRow['equipamento'] || normalizedRow['descrio'] || ''),
            localizacao: String(normalizedRow['localizacao'] || normalizedRow['localizao'] || normalizedRow['local'] || normalizedRow['serie'] || normalizedRow['srie'] || ''),
            certificate: String(cert),
            interventionDate: String(normalizedRow['data'] || normalizedRow['date'] || normalizedRow['datadeintervencao'] || normalizedRow['dataintervencao'] || normalizedRow['datadeinterveno'] || normalizedRow['datadeint'] || ''),
            technician: String(normalizedRow['tecnico'] || normalizedRow['tcnico'] || normalizedRow['technician'] || ''),
            area: String(normalizedRow['area'] || normalizedRow['rea'] || ''),
            range: String(normalizedRow['range'] || normalizedRow['faixa'] || ''),
            operacao: String(normalizedRow['operacao'] || normalizedRow['operao'] || ''),
            unidadeMedida: String(normalizedRow['unidadedemedida'] || normalizedRow['um'] || ''),
            categoria: String(normalizedRow['categoria'] || ''),
            emissaoPdf: String(normalizedRow['emissaopdf'] || normalizedRow['emissopdf'] || ''),
            ordemServico: String(normalizedRow['ordemdeservico'] || normalizedRow['os'] || normalizedRow['ordemservico'] || ''),
            tipoServico: String(normalizedRow['tipodeservico'] || normalizedRow['tiposervico'] || ''),
            observacao: String(normalizedRow['observacao'] || normalizedRow['observao'] || normalizedRow['notas'] || ''),
            unidade: String(normalizedRow['unidade'] || normalizedRow['und'] || '')
          });
        }
        
        if (newRecordsToImport.length > 0) {
          await bulkAddFieldServiceRecords(newRecordsToImport);
        }
        
        alert(\`Importação concluída!\\n\${newRecordsToImport.length} novos registros adicionados.\\n\${duplicates} ignorados (certificado já existente).\`);`;


const newImport = `        let addedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        const newRecordsToImport: Omit<FieldServiceRecord, 'id'>[] = [];
        const recordsToUpdate: {id: string, data: Partial<FieldServiceRecord>}[] = [];

        // Track what we process in this batch to avoid duplicates within the Excel file itself
        const processedCerts = new Set();
        const processedTags = new Set();

        for (const row of data as any[]) {
          const normalizedRow = Object.keys(row).reduce((acc, key) => {
             acc[normalizeKey(key)] = row[key];
             return acc;
          }, {} as Record<string, any>);

          const cert = normalizedRow['certificado'] || normalizedRow['cert'] || '';
          const strCert = String(cert).trim();
          
          const tagRaw = normalizedRow['tag'] || '';
          const strTag = String(tagRaw).trim();

          // Excel rows must have either a cert or a tag to be useful
          if (strCert === '' && strTag === '') {
            continue;
          }

          // If the Excel itself has duplicates, we just skip the subsequent ones
          if ((strCert !== '' && processedCerts.has(strCert)) || (strTag !== '' && processedTags.has(strTag))) {
            skippedCount++;
            continue;
          }

          if (strCert !== '') processedCerts.add(strCert);
          if (strTag !== '') processedTags.add(strTag);

          const interventionDateRaw = String(normalizedRow['data'] || normalizedRow['date'] || normalizedRow['datadeintervencao'] || normalizedRow['dataintervencao'] || normalizedRow['datadeinterveno'] || normalizedRow['datadeint'] || '');
          const formattedInterventionDate = dateMask(interventionDateRaw);

          const parsedRecord = {
            cliente: String(normalizedRow['cliente'] || ''),
            tag: strTag,
            equipamento: String(normalizedRow['equipamento'] || normalizedRow['descrio'] || ''),
            localizacao: String(normalizedRow['localizacao'] || normalizedRow['localizao'] || normalizedRow['local'] || normalizedRow['serie'] || normalizedRow['srie'] || ''),
            certificate: strCert,
            interventionDate: formattedInterventionDate,
            technician: String(normalizedRow['tecnico'] || normalizedRow['tcnico'] || normalizedRow['technician'] || ''),
            area: String(normalizedRow['area'] || normalizedRow['rea'] || ''),
            range: String(normalizedRow['range'] || normalizedRow['faixa'] || ''),
            operacao: String(normalizedRow['operacao'] || normalizedRow['operao'] || ''),
            unidadeMedida: String(normalizedRow['unidadedemedida'] || normalizedRow['um'] || ''),
            categoria: String(normalizedRow['categoria'] || ''),
            emissaoPdf: String(normalizedRow['emissaopdf'] || normalizedRow['emissopdf'] || ''),
            ordemServico: String(normalizedRow['ordemdeservico'] || normalizedRow['os'] || normalizedRow['ordemservico'] || ''),
            tipoServico: String(normalizedRow['tipodeservico'] || normalizedRow['tiposervico'] || ''),
            observacao: String(normalizedRow['observacao'] || normalizedRow['observao'] || normalizedRow['notas'] || ''),
            unidade: String(normalizedRow['unidade'] || normalizedRow['und'] || '')
          };

          // Find existing match
          let existingMatch = null;
          if (strCert !== '') {
            existingMatch = records.find(r => r.certificate === strCert);
          } else if (strTag !== '') {
            existingMatch = records.find(r => r.tag === strTag);
          }

          if (existingMatch) {
            // Check if there are differences
            let hasDifferences = false;
            for (const key of Object.keys(parsedRecord)) {
              if ((parsedRecord as any)[key] !== (existingMatch as any)[key]) {
                hasDifferences = true;
                break;
              }
            }

            if (hasDifferences) {
              recordsToUpdate.push({ id: existingMatch.id, data: parsedRecord });
              updatedCount++;
            } else {
              skippedCount++;
            }
          } else {
            newRecordsToImport.push(parsedRecord);
            addedCount++;
          }
        }
        
        if (newRecordsToImport.length > 0 || recordsToUpdate.length > 0) {
          await bulkUpsertFieldServiceRecords(recordsToUpdate, newRecordsToImport);
        }
        
        alert(\`Importação concluída!\\n\\n\${addedCount} novos registros adicionados.\\n\${updatedCount} registros atualizados.\\n\${skippedCount} ignorados (já estavam idênticos ou duplicados no arquivo).\`);`;

content = content.replace(oldImport, newImport);

fs.writeFileSync('src/components/FieldService.tsx', content);
console.log("Patched Excel import");
