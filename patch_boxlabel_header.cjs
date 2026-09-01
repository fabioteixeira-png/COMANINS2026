const fs = require('fs');
let content = fs.readFileSync('src/components/BoxLabelSheet.tsx', 'utf8');

const target = `<div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 mb-1">
            <LayoutGrid className="w-4 h-4" /> Recepção
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold text-slate-900">Etiqueta Caixa</h1>
          <p className="text-sm text-slate-600 mt-2 max-w-3xl">
            Pimaco A4363 • 14 etiquetas por folha • 2 colunas × 7 linhas • 99,0 × 38,1 mm.
            Digite o certificado diretamente na posição física que ainda existe na folha.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50"
          >
            <Settings2 className="w-4 h-4" /> Ajustar impressão
          </button>
          <button
            type="button"
            onClick={handleNewSheet}
            disabled={!canEdit || isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white font-bold hover:bg-blue-800 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Nova folha
          </button>
        </div>
      </div>`;

const replacement = `<div className="space-y-6 print:space-y-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-slate-950">
            Etiqueta Caixa
          </h2>
          <p className="text-sm text-slate-600 mt-2 max-w-3xl">
            Pimaco A4363 • 14 etiquetas por folha • 2 colunas × 7 linhas • 99,0 × 38,1 mm.<br className="hidden md:block" /> Digite o certificado diretamente na posição física que ainda existe na folha.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 sm:px-4 sm:py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 text-xs uppercase tracking-wider transition-colors"
          >
            <Settings2 className="w-4 h-4" /> Ajustar impressão
          </button>
          <button
            type="button"
            onClick={handleNewSheet}
            disabled={!canEdit || isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-3 bg-royal-blue hover:bg-blue-700 text-white font-bold rounded-xl shadow-md uppercase tracking-wider text-xs transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Nova folha
          </button>
        </div>
      </div>`;

content = content.replace(target, replacement);

fs.writeFileSync('src/components/BoxLabelSheet.tsx', content);
