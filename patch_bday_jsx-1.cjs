const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const targetStr = `  return (
    <div className="min-h-screen bg-slate-50 flex">`;

const jsx = `  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Birthday Modal */}
      {showBirthdayModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-600"></div>
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-4 relative">
                <span className="text-4xl">🎉</span>
              </div>
              <h2 className="text-2xl font-display font-extrabold text-slate-900">
                Feliz Aniversário!
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed italic">
                "{birthdayMessage}"
              </p>
              <button
                onClick={() => setShowBirthdayModal(false)}
                className="mt-6 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Muito obrigado!
              </button>
            </div>
          </div>
        </div>
      )}`;

code = code.replace(targetStr, jsx);
fs.writeFileSync('src/components/InternalPortal.tsx', code);
