const fs = require('fs');

let content = fs.readFileSync('src/components/FieldService.tsx', 'utf-8');

// 1. Add Edit2 to lucide imports
content = content.replace(
  "import { Upload, FileSpreadsheet, Plus, Save, X, Camera, RefreshCw, Trash2, Search, Download, ChevronLeft, ChevronRight, FileDown, Columns } from 'lucide-react';",
  "import { Upload, FileSpreadsheet, Plus, Save, X, Camera, RefreshCw, Trash2, Search, Download, ChevronLeft, ChevronRight, FileDown, Columns, Edit2 } from 'lucide-react';"
);

// 2. Add deleteFieldServiceRecord to firebase imports
content = content.replace(
  "clearAllFieldServiceRecords",
  "clearAllFieldServiceRecords, deleteFieldServiceRecord"
);

// 3. Add states and handlers
const handlers = `
  const [editingCell, setEditingCell] = useState<{rowId: string, colId: string} | null>(null);

  const handleInlineSave = async (record: FieldServiceRecord, colId: string, newVal: string) => {
    setEditingCell(null);
    if (String((record as any)[colId] || '') === newVal) return;
    try {
      await updateFieldServiceRecord(record.id, { [colId]: newVal });
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar célula.");
    }
  };

  const handleDeleteRecord = async (id: string) => {
    const pwd = prompt("Digite a senha de administrador para excluir este registro:");
    if (pwd === "comanins123" || pwd === "admin123" || pwd === "admin") {
      if (confirm("Tem certeza que deseja excluir?")) {
        try {
          await deleteFieldServiceRecord(id);
        } catch (e) {
          console.error(e);
          alert("Erro ao excluir.");
        }
      }
    } else if (pwd !== null) {
      alert("Senha incorreta!");
    }
  };
`;
content = content.replace(
  "const [showAddModal, setShowAddModal] = useState(false);",
  handlers + "\n  const [showAddModal, setShowAddModal] = useState(false);"
);

// 4. Fix colspan on loading
content = content.replace(/colSpan=\{17\}/g, "colSpan={18}");

// 5. Add Ações column header
content = content.replace(
  `                  </th>
                ))}
              </tr>`,
  `                  </th>
                ))}
                <th className="px-4 py-3 min-w-[80px]">Ações</th>
              </tr>`
);

// 6. Update row rendering to handle inline editing
const newTr = `
                paginatedRecords.map(record => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    {COLUMNS.filter(c => visibleColumns[c.id]).map(col => {
                      const value = (record as any)[col.id];
                      
                      const isEditing = editingCell?.rowId === record.id && editingCell?.colId === col.id;
                      if (isEditing) {
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
                      }

                      // Special renderers (clickable for edit)
                      if (col.id === 'certificate' || col.id === 'tag') {
                        return <td key={col.id} className="px-4 py-3 font-medium whitespace-nowrap cursor-pointer hover:bg-blue-50 transition-colors" onClick={() => setEditingCell({rowId: record.id, colId: col.id})} title="Clique para editar">{value || '-'}</td>;
                      }
                      
                      if (col.id === 'observacao') {
                        return <td key={col.id} className="px-4 py-3 max-w-[200px] truncate cursor-pointer hover:bg-slate-100 transition-colors" title="Clique para editar" onClick={() => setEditingCell({rowId: record.id, colId: col.id})}>{value || '-'}</td>;
                      }

                      return <td key={col.id} className="px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors" title="Clique para editar" onClick={() => setEditingCell({rowId: record.id, colId: col.id})}>{value || '-'}</td>;
                    })}
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button onClick={() => { setFormData(record); setShowAddModal(true); }} className="text-slate-400 hover:text-royal-blue mr-3" title="Editar Formulário">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteRecord(record.id)} className="text-slate-400 hover:text-red-500" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
`;

content = content.replace(/paginatedRecords\.map\(record => \([\s\S]*?\)\)[\s]*\)/, newTr + "              )");

fs.writeFileSync('src/components/FieldService.tsx', content);
console.log("Patched FieldService successfully.");
