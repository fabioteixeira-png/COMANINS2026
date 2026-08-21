const fs = require('fs');
let content = fs.readFileSync('src/components/FieldService.tsx', 'utf-8');

const oldHandleInlineSave = `  const handleInlineSave = async (record: FieldServiceRecord, colId: string, newVal: string) => {
    setEditingCell(null);
    if (String((record as any)[colId] || '') === newVal) return;
    try {
      await updateFieldServiceRecord(record.id, { [colId]: newVal });`;

const newHandleInlineSave = `  const handleInlineSave = async (record: FieldServiceRecord, colId: string, newVal: string) => {
    setEditingCell(null);
    if (String((record as any)[colId] || '') === newVal) return;
    
    if (colId === 'certificate' && newVal.trim() !== '') {
      const isDup = records.some(r => r.certificate === newVal && r.id !== record.id);
      if (isDup) {
        alert("Erro: Este Certificado já está registrado na planilha!");
        return;
      }
    }

    if (colId === 'tag' && newVal.trim() !== '') {
      const isDup = records.some(r => r.tag === newVal && r.id !== record.id);
      if (isDup) {
        alert("Erro: Esta TAG já está registrada na planilha!");
        return;
      }
    }

    try {
      await updateFieldServiceRecord(record.id, { [colId]: newVal });`;

content = content.replace(oldHandleInlineSave, newHandleInlineSave);

const oldInlineInput = `                      if (isEditing && col.id !== 'dataCalibracao') {
                        return (
                          <td key={col.id} className="px-4 py-2">
                            <input 
                               autoFocus
                              defaultValue={value}
                              onBlur={e => handleInlineSave(record, col.id, e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditingCell(null); }}
                              className="w-full px-2 py-1 text-sm border border-royal-blue rounded outline-none shadow-sm"
                            />
                          </td>
                        );
                      }`;

const newInlineInput = `                      if (isEditing && col.id !== 'dataCalibracao') {
                        return (
                          <td key={col.id} className="px-4 py-2">
                            <input 
                               autoFocus
                              defaultValue={value}
                              onChange={e => {
                                if (col.id === 'interventionDate') {
                                  e.target.value = dateMask(e.target.value);
                                }
                              }}
                              onBlur={e => handleInlineSave(record, col.id, e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditingCell(null); }}
                              className="w-full px-2 py-1 text-sm border border-royal-blue rounded outline-none shadow-sm"
                            />
                          </td>
                        );
                      }`;

content = content.replace(oldInlineInput, newInlineInput);

// Wait, I messed up the modal input replace in previous patch.
// The previous replace for modal input had the old code, which didn't match.
// Let's replace the modal input directly.
const modalOld = `                {COLUMNS.filter(c => c.id !== 'observacao' && c.id !== 'dataCalibracao').map(col => (
                  <div key={col.id}>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{col.label}</label>
                    <input 
                       type="text"
                       value={(formData as any)[col.id] || ''}
                       onChange={e => setFormData({...formData, [col.id]: e.target.value})}
                       className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none" 
                     />
                  </div>
                ))}`;

const modalNew = `                {COLUMNS.filter(c => c.id !== 'observacao' && c.id !== 'dataCalibracao').map(col => (
                  <div key={col.id}>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{col.label}</label>
                    <input 
                       type="text"
                       value={(formData as any)[col.id] || ''}
                       onChange={e => {
                         let val = e.target.value;
                         if (col.id === 'interventionDate') val = dateMask(val);
                         setFormData({...formData, [col.id]: val});
                       }}
                       className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none" 
                     />
                  </div>
                ))}`;

content = content.replace(modalOld, modalNew);

fs.writeFileSync('src/components/FieldService.tsx', content);
console.log("Patched FieldService.tsx inline/modal editing");
