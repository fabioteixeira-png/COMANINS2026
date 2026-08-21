const fs = require('fs');
let content = fs.readFileSync('src/components/FieldService.tsx', 'utf-8');

const dateMaskFunc = `
  const dateMask = (value) => {
    if (!value) return '';
    return value
      .replace(/\\D/g, "")
      .replace(/(\\d{2})(\\d)/, "$1/$2")
      .replace(/(\\d{2})(\\d)/, "$1/$2")
      .replace(/(\\d{4})\\d+?$/, "$1");
  };
`;

// Insert dateMask before handleSaveRecord
content = content.replace(
  /const handleSaveRecord = async \(\) => {/g,
  dateMaskFunc + '\n  const handleSaveRecord = async () => {'
);

const oldSave = `  const handleSaveRecord = async () => {
    const isDuplicate = formData.certificate && formData.certificate.trim() !== '' && records.some(r => r.certificate === formData.certificate && r.id !== formData.id);
    if (isDuplicate) {
      alert("Erro: Este Certificado já está registrado na planilha!");
      return;
    }`;

const newSave = `  const handleSaveRecord = async () => {
    const duplicateCert = formData.certificate && formData.certificate.trim() !== '' && records.some(r => r.certificate === formData.certificate && r.id !== formData.id);
    const duplicateTag = formData.tag && formData.tag.trim() !== '' && records.some(r => r.tag === formData.tag && r.id !== formData.id);
    if (duplicateCert) {
      alert("Erro: Este Certificado já está registrado na planilha!");
      return;
    }
    if (duplicateTag) {
      alert("Erro: Esta TAG já está registrada na planilha!");
      return;
    }`;

content = content.replace(oldSave, newSave);

const oldInlineEdit = `                      if (editingCell?.rowId === record.id && editingCell?.colId === col.id) {
                        return (
                          <td key={col.id} className="px-4 py-3 whitespace-nowrap min-w-[120px]">
                            <input
                              type="text"
                              autoFocus
                              defaultValue={value}
                              onBlur={(e) => handleInlineEdit(record.id, col.id, e.target.value, value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineEdit(record.id, col.id, e.currentTarget.value, value);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className="w-full px-2 py-1 text-sm border border-royal-blue rounded outline-none shadow-sm"
                            />
                          </td>
                        );
                      }`;

const newInlineEdit = `                      if (editingCell?.rowId === record.id && editingCell?.colId === col.id) {
                        return (
                          <td key={col.id} className="px-4 py-3 whitespace-nowrap min-w-[120px]">
                            <input
                              type="text"
                              autoFocus
                              defaultValue={value}
                              onChange={(e) => {
                                if (col.id === 'interventionDate') {
                                  e.target.value = dateMask(e.target.value);
                                }
                              }}
                              onBlur={(e) => handleInlineEdit(record.id, col.id, e.target.value, value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineEdit(record.id, col.id, e.currentTarget.value, value);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className="w-full px-2 py-1 text-sm border border-royal-blue rounded outline-none shadow-sm"
                            />
                          </td>
                        );
                      }`;

content = content.replace(oldInlineEdit, newInlineEdit);

const oldModalInput = `                    <input 
                       type="text"
                       value={(formData as any)[col.id] || ''}
                       onChange={e => setFormData({...formData, [col.id]: e.target.value})}
                       className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none" 
                     />`;

const newModalInput = `                    <input 
                       type="text"
                       value={(formData as any)[col.id] || ''}
                       onChange={e => {
                         let val = e.target.value;
                         if (col.id === 'interventionDate') val = dateMask(val);
                         setFormData({...formData, [col.id]: val});
                       }}
                       className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-royal-blue outline-none" 
                     />`;

content = content.replace(oldModalInput, newModalInput);


// Wait, we also need to enforce duplicate check in handleInlineEdit
const oldHandleInlineEdit = `  const handleInlineEdit = async (id: string, field: string, newValue: string, oldValue: string) => {
    if (newValue === oldValue) {
      setEditingCell(null);
      return;
    }`;

const newHandleInlineEdit = `  const handleInlineEdit = async (id: string, field: string, newValue: string, oldValue: string) => {
    if (newValue === oldValue) {
      setEditingCell(null);
      return;
    }
    
    if (field === 'certificate' && newValue.trim() !== '') {
      const isDup = records.some(r => r.certificate === newValue && r.id !== id);
      if (isDup) {
        alert("Erro: Este Certificado já está registrado na planilha!");
        setEditingCell(null);
        return;
      }
    }

    if (field === 'tag' && newValue.trim() !== '') {
      const isDup = records.some(r => r.tag === newValue && r.id !== id);
      if (isDup) {
        alert("Erro: Esta TAG já está registrada na planilha!");
        setEditingCell(null);
        return;
      }
    }
`;

content = content.replace(oldHandleInlineEdit, newHandleInlineEdit);

fs.writeFileSync('src/components/FieldService.tsx', content);
console.log("Patched FieldService.tsx");
