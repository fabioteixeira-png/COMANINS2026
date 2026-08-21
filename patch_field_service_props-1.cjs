const fs = require('fs');

let content = fs.readFileSync('src/components/FieldService.tsx', 'utf-8');

// 1. Add props interface
const propsInterface = `
interface FieldServiceProps {
  onPrintCertificate?: (instId: string, equipmentData: string) => void;
}
`;
content = content.replace("export default function FieldService() {", propsInterface + "export default function FieldService({ onPrintCertificate }: FieldServiceProps = {}) {");

// 2. Add Instrument and Printer imports
content = content.replace(
  "import { Upload, FileSpreadsheet, Plus, Save, X, Camera, RefreshCw, Trash2, Search, Download, ChevronLeft, ChevronRight, FileDown, Columns, Edit2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';",
  "import { Upload, FileSpreadsheet, Plus, Save, X, Camera, RefreshCw, Trash2, Search, Download, ChevronLeft, ChevronRight, FileDown, Columns, Edit2, ChevronUp, ChevronDown, ChevronsUpDown, Printer } from 'lucide-react';"
);
content = content.replace(
  "syncPortalUsers, PortalUser",
  "syncPortalUsers, PortalUser, syncInstruments"
);

// We must also import Instrument from types, but FieldService is in components
content = content.replace(
  "import { \n  FieldServiceRecord,",
  "import { Instrument } from '../types';\nimport { \n  FieldServiceRecord,"
);

// 3. Add instruments state and effect
const stateToAdd = `  const [instruments, setInstruments] = useState<Instrument[]>([]);`;
content = content.replace("const [internalUsers, setInternalUsers] = useState<PortalUser[]>([]);", "const [internalUsers, setInternalUsers] = useState<PortalUser[]>([]);\n" + stateToAdd);

content = content.replace(
  "const unsubscribeUsers = syncPortalUsers((users) => setInternalUsers(users));",
  "const unsubscribeUsers = syncPortalUsers((users) => setInternalUsers(users));\n    const unsubscribeInst = syncInstruments((data) => setInstruments(data));"
);
content = content.replace(
  "unsubscribeUsers.then(u => u());",
  "unsubscribeUsers.then(u => u());\n      unsubscribeInst.then(u => u());"
);

// 4. Update the Table Actions to include Printer button
const oldActions = `                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button onClick={() => { setFormData(record); setShowAddModal(true); }} className="text-slate-400 hover:text-royal-blue mr-3" title="Editar Formulário">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteRecord(record.id)} className="text-slate-400 hover:text-red-500" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>`;

const newActions = `                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {(() => {
                        const matchingInst = instruments.find(i => i.tag && record.tag && i.tag.toLowerCase() === record.tag.toLowerCase());
                        if (matchingInst && onPrintCertificate) {
                          return (
                            <button 
                              onClick={() => onPrintCertificate(matchingInst.id, record.equipamento || '')} 
                              className="text-emerald-500 hover:text-emerald-600 mr-3" 
                              title="Imprimir Certificado (Calibração)"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          );
                        }
                        return null;
                      })()}
                      <button onClick={() => { setFormData(record); setShowAddModal(true); }} className="text-slate-400 hover:text-royal-blue mr-3" title="Editar Formulário">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteRecord(record.id)} className="text-slate-400 hover:text-red-500" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>`;
content = content.replace(oldActions, newActions);

fs.writeFileSync('src/components/FieldService.tsx', content);
console.log("Patched FieldService.tsx successfully.");
