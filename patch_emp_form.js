import fs from 'fs';
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf-8');

// Change the rendering of the password field to only show if !selectedUser (i.e. creating new)
const regex = /<label className="block text-sm font-bold text-slate-700 mb-1">Senha<\/label>\s*<input\s*type="text"\s*value=\{formData\.password \|\| ''\}\s*onChange=\{\(e\) => setFormData\(\{ \.\.\.formData, password: e\.target\.value \}\)\}\s*className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"\s*placeholder="Senha de acesso"\s*\/>/;

const replacement = `
                    {!selectedUser ? (
                      <>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Senha (Temporária)</label>
                        <input
                          type="text"
                          value={formData.password || ''}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50 font-mono"
                          placeholder="Senha de acesso temporária"
                        />
                        <p className="text-[10px] text-slate-500 mt-1 leading-tight">O usuário será forçado a criar uma nova senha forte no primeiro acesso.</p>
                      </>
                    ) : (
                      <>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Senha</label>
                        <input
                          type="text"
                          disabled
                          value="********"
                          className="w-full border border-slate-300 rounded-lg p-2 bg-slate-100 text-slate-400 font-mono cursor-not-allowed"
                          title="Senhas agora são gerenciadas via Firebase Auth por segurança. Para redefinir, recrie o usuário."
                        />
                      </>
                    )}
`;

code = code.replace(regex, replacement.trim());
fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
console.log("EmployeeManagement form updated");
