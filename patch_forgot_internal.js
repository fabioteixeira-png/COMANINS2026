import fs from 'fs';
let code = fs.readFileSync('src/components/LoginScreen.tsx', 'utf-8');

code = code.replace(
  `                </button>
              </div>
            </div>

            <button 
              type="submit"`,
  `                </button>
              </div>
              <div className="flex justify-end mt-1">
                <button type="button" onClick={() => setShowForgotPassword(true)} className="text-[10px] text-royal-blue hover:underline font-semibold">Esqueceu a senha?</button>
              </div>
            </div>

            <button 
              type="submit"`
);

fs.writeFileSync('src/components/LoginScreen.tsx', code);
