const fs = require('fs');

let content = fs.readFileSync('src/components/FieldService.tsx', 'utf-8');

// 1. Add column to COLUMNS
const colTarget = `const COLUMNS = [
  { id: 'certificate', label: 'Certificado', minW: '120px' },
  { id: 'interventionDate', label: 'Data Intervenção', minW: '120px' },`;
const colNew = `const COLUMNS = [
  { id: 'certificate', label: 'Certificado', minW: '120px' },
  { id: 'dataCalibracao', label: 'Data Calibração', minW: '120px' },
  { id: 'interventionDate', label: 'Data Intervenção', minW: '120px' },`;

content = content.replace(colTarget, colNew);

// 2. Fetch derived value
const renderTarget = `                    {COLUMNS.filter(c => visibleColumns[c.id]).map(col => {
                      const value = (record as any)[col.id];`;
const renderNew = `                    {COLUMNS.filter(c => visibleColumns[c.id]).map(col => {
                      let value = (record as any)[col.id];
                      
                      if (col.id === 'dataCalibracao') {
                        if (record.certificate) {
                          const correlatedInst = instruments.find(i => i.certificateNumber === record.certificate || (i.coma && i.coma === record.certificate));
                          if (correlatedInst && correlatedInst.lastCalibrationDate) {
                            // format date to DD/MM/YYYY
                            const dateParts = correlatedInst.lastCalibrationDate.split('-');
                            if (dateParts.length === 3) {
                              value = \`\${dateParts[2]}/\${dateParts[1]}/\${dateParts[0]}\`;
                            } else {
                              value = correlatedInst.lastCalibrationDate;
                            }
                          } else {
                            value = '-';
                          }
                        } else {
                          value = '-';
                        }
                      }`;

content = content.replace(renderTarget, renderNew);

// 3. Skip dataCalibracao from edit form inline
const inlineEditTarget = `                      const isEditing = editingCell?.rowId === record.id && editingCell?.colId === col.id;
                      if (isEditing) {`;
const inlineEditNew = `                      const isEditing = editingCell?.rowId === record.id && editingCell?.colId === col.id;
                      if (isEditing && col.id !== 'dataCalibracao') {`;

content = content.replace(inlineEditTarget, inlineEditNew);

// 4. Skip dataCalibracao in click handler for editing
const clickEditTarget = `                      // Special renderers (clickable for edit)
                      if (col.id === 'certificate' || col.id === 'tag') {
                        return <td key={col.id} className="px-4 py-3 font-medium whitespace-nowrap cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => setEditingCell({rowId: record.id, colId: col.id})} title="Clique para editar">{value || '-'}</td>;
                      }

                      return (
                        <td 
                          key={col.id} 
                          className="px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-blue-50 transition-colors"
                          onClick={() => setEditingCell({rowId: record.id, colId: col.id})}
                          title="Clique para editar"
                        >
                          {value || '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>`;
const clickEditNew = `                      // Special renderers (clickable for edit)
                      if (col.id === 'dataCalibracao') {
                        return <td key={col.id} className="px-4 py-3 whitespace-nowrap text-slate-500 italic">{value}</td>;
                      }

                      if (col.id === 'certificate' || col.id === 'tag') {
                        return <td key={col.id} className="px-4 py-3 font-medium whitespace-nowrap cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => setEditingCell({rowId: record.id, colId: col.id})} title="Clique para editar">{value || '-'}</td>;
                      }

                      return (
                        <td 
                          key={col.id} 
                          className="px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-blue-50 transition-colors"
                          onClick={() => setEditingCell({rowId: record.id, colId: col.id})}
                          title="Clique para editar"
                        >
                          {value || '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>`;

content = content.replace(clickEditTarget, clickEditNew);

// 5. Hide from create/edit modal form
const formTarget = `{COLUMNS.filter(c => c.id !== 'observacao').map(col => (`;
const formNew = `{COLUMNS.filter(c => c.id !== 'observacao' && c.id !== 'dataCalibracao').map(col => (`;

content = content.replace(formTarget, formNew);

// 6. Fix handleDownloadTemplate
const tplTarget = `  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      'Certificado': '',
      'Data de Intervenção': '',`;
const tplNew = `  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      'Certificado': '',
      'Data Calibração': '',
      'Data de Intervenção': '',`;
content = content.replace(tplTarget, tplNew);

// 7. Fix export to excel
const exportTarget = `      'Certificado': r.certificate,
      'Data de Intervenção': r.interventionDate,`;
const exportNew = `      'Certificado': r.certificate,
      'Data Calibração': (() => {
        if (!r.certificate) return '-';
        const correlatedInst = instruments.find(i => i.certificateNumber === r.certificate || (i.coma && i.coma === r.certificate));
        if (correlatedInst && correlatedInst.lastCalibrationDate) {
          const dateParts = correlatedInst.lastCalibrationDate.split('-');
          if (dateParts.length === 3) {
            return \`\${dateParts[2]}/\${dateParts[1]}/\${dateParts[0]}\`;
          }
          return correlatedInst.lastCalibrationDate;
        }
        return '-';
      })(),
      'Data de Intervenção': r.interventionDate,`;
content = content.replace(exportTarget, exportNew);

fs.writeFileSync('src/components/FieldService.tsx', content);
console.log("Patched field service date column");
