import fs from 'fs';
let code = fs.readFileSync('src/components/LoginScreen.tsx', 'utf-8');

// For client form
code = code.replace(
  `                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>`,
  `                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end mt-1">
                <button type="button" onClick={() => setShowForgotPassword(true)} className="text-[10px] text-royal-blue hover:underline font-semibold">Esqueceu a senha?</button>
              </div>
            </div>`
);

// For internal form
code = code.replace(
  `                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <button 
              type="submit"`,
  `                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end mt-1">
                <button type="button" onClick={() => setShowForgotPassword(true)} className="text-[10px] text-royal-blue hover:underline font-semibold">Esqueceu a senha?</button>
              </div>
            </div>
            
            <button 
              type="submit"`
);

// Add the forgot password view right before CLIENT LOGIN FORM
const forgotPwdView = `
        {showForgotPassword && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 text-center mb-2">Recuperação de Senha</h3>
            <p className="text-xs text-slate-600 text-center mb-4">
              Digite seu e-mail cadastrado. Se ele existir em nossa base, enviaremos um link para redefinir a senha.
            </p>
            {resetSuccess ? (
               <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-xs text-center">
                 E-mail de recuperação enviado! Verifique sua caixa de entrada (e pasta de spam).
               </div>
            ) : (
               <div className="space-y-1.5">
                 <label className="text-[10px] uppercase font-mono font-bold text-slate-600 block tracking-wider">Seu E-mail</label>
                 <input 
                   type="email"
                   required
                   value={resetEmail}
                   onChange={(e) => setResetEmail(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-royal-blue"
                   placeholder="Ex: seu.email@empresa.com"
                 />
               </div>
            )}
            {!resetSuccess && (
               <button 
                 type="submit"
                 className="w-full py-3 bg-royal-blue hover:bg-royal-light text-white font-bold text-xs rounded-xl uppercase tracking-wider transition-colors shadow-lg mt-2"
               >
                 Enviar Link de Recuperação
               </button>
            )}
            <button 
              type="button"
              onClick={() => { setShowForgotPassword(false); setResetSuccess(false); setErrorMsg(''); }}
              className="w-full py-3 bg-white text-slate-600 font-bold text-xs rounded-xl uppercase tracking-wider transition-colors border border-slate-200 mt-2 hover:bg-slate-50"
            >
              Voltar ao Login
            </button>
          </form>
        )}
`;

code = code.replace(
  "{/* CLIENT LOGIN FORM */}",
  forgotPwdView + "\n        {/* CLIENT LOGIN FORM */}"
);

// Wrap CLIENT and INTERNAL forms so they don't show when forgot pwd is true
code = code.replace(
  "{/* CLIENT LOGIN FORM */}\n        {activeTab === 'client' && (",
  "{/* CLIENT LOGIN FORM */}\n        {activeTab === 'client' && !showForgotPassword && ("
);

code = code.replace(
  "{/* INTERNAL LABORATORY LOGIN FORM */}\n        {activeTab === 'internal' && (",
  "{/* INTERNAL LABORATORY LOGIN FORM */}\n        {activeTab === 'internal' && !showForgotPassword && ("
);

fs.writeFileSync('src/components/LoginScreen.tsx', code);
