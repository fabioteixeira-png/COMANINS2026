const fs = require('fs');
let code = fs.readFileSync('src/components/NotificationBellPopover.tsx', 'utf8');

const targetStr = `          {/* Quota Quick Summary Bar */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <Database className="w-3.5 h-3.5 text-royal-blue" />
              <span>Cota Firebase: <strong>{telemetry.dailyReads.toLocaleString('pt-BR')} / 50.000</strong></span>
            </div>
            {onOpenFirebaseUsage && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenFirebaseUsage();
                }}
                className="text-royal-blue font-bold hover:underline flex items-center gap-0.5 text-[11px]"
              >
                Detalhes
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>`;

code = code.replace(targetStr, "");
fs.writeFileSync('src/components/NotificationBellPopover.tsx', code);
