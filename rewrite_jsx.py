import re

with open('src/components/BoxLabelSheet.tsx', 'r') as f:
    code = f.read()

# Find the start of the return block
match = re.search(r'  const temporarySheetCode = [^\n]+\n\n  return \(\n', code)
if not match:
    print("Not found!")
    exit(1)

start_idx = match.end() - 11 # index of "return (\n"

# The new return block JSX
new_return = """  return (
    <div className="space-y-6 print:space-y-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 mb-1">
            <LayoutGrid className="w-4 h-4" /> Recepção
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold text-slate-900">Etiqueta Caixa</h1>
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
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <div className="font-bold">Modo simplificado ativado</div>
        <div className="mt-1">
          Esta tela funciona somente de forma temporária neste navegador. Não arquiva folhas nem grava histórico de etiquetas.
        </div>
      </div>

      {/* Ações em faixa única — não ocupa uma segunda coluna/tela */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
             <button
               type="button"
               onClick={() => setBatchOpen((value) => !value)}
               disabled={!canEdit}
               className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50 text-xs"
             >
               Preenchimento em lote ({selectedPositions.size})
             </button>
             <button
               type="button"
               onClick={() => setPreviewOpen(true)}
               disabled={!validData.length}
               className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50 text-xs"
             >
               Visualizar folha
             </button>
             <button
               type="button"
               onClick={handleGeneratePdf}
               disabled={!canEdit || isSaving || !validData.length}
               className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-royal-blue text-white font-bold hover:bg-royal-blue-hover disabled:opacity-50 text-xs"
             >
               <Printer className="w-4 h-4" /> Gerar PDF A4363
             </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-[10px] sm:text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <FileText className="w-4 h-4 shrink-0 text-slate-500" />
              <span className="truncate"><b>Arquivo:</b> {TEMP_SHEET_FILE_NAME}</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center shrink-0">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
                <div className="text-sm font-extrabold text-slate-900">{availableCount}</div>
                <div className="text-[9px] uppercase font-bold text-slate-500">Disponíveis</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
                <div className="text-sm font-extrabold text-slate-900">{unavailableCount}</div>
                <div className="text-[9px] uppercase font-bold text-slate-500">Indisponíveis</div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5">
                <div className="text-sm font-extrabold text-blue-800">{validData.length}</div>
                <div className="text-[9px] uppercase font-bold text-blue-600">Prontas</div>
              </div>
            </div>
          </div>
        </div>

        {batchOpen && (
          <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 mt-4">
            <div className="font-bold text-blue-900">Preenchimento em lote</div>
            <p className="text-xs text-blue-800 mt-1">
              Marque as posições desejadas na folha e informe exatamente a mesma quantidade de certificados, um por linha. A associação seguirá a ordem crescente das posições.
            </p>
            <textarea
              value={batchText}
              onChange={(event) => setBatchText(event.target.value)}
              rows={5}
              placeholder={'260845\\n260846\\n260847'}
              className="mt-3 w-full border border-blue-200 rounded-lg p-3 font-mono text-sm bg-white"
            />
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={applyBatch} className="px-3 py-2 bg-blue-700 text-white font-bold rounded-lg text-xs">Aplicar certificados</button>
              <button type="button" onClick={() => setBatchOpen(false)} className="px-3 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg text-xs">Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* Grade ocupa toda a largura. A rolagem vertical é a da página principal do portal. */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-w-0">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-slate-900">Grade da folha</div>
            <div className="text-xs text-slate-500">Preencha as posições existentes. Role a página para acessar todas as 14 etiquetas.</div>
          </div>
          <button
            type="button"
            onClick={resetTemporarySheet}
            disabled={!canEdit || isSaving}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50 text-xs shrink-0"
          >
            <RotateCcw className="w-4 h-4" /> Limpar tela
          </button>
        </div>
        
        <div className="overflow-x-auto p-4 sm:p-5">
          <div className="min-w-[760px] grid grid-cols-2 gap-4">
            {slots.map((slot) => {
              const resolved = resolvedByPosition.get(slot.position) || { state: 'empty' as LookupState };
              const selected = selectedPositions.has(slot.position);
              const isAvailable = slot.status === 'available';
              return (
                <div
                  key={slot.position}
                  className={`border rounded-lg p-3 transition-all ${slotClass(slot, resolved)} ${selected ? 'ring-2 ring-blue-300' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-extrabold text-slate-700">{String(slot.position).padStart(2, '0')}</span>
                      {isAvailable && (
                        <label className="inline-flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelectedPosition(slot.position)}
                            disabled={!canEdit}
                          />
                          lote
                        </label>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleUnavailable(slot.position)}
                      disabled={!canEdit || isSaving}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-800 disabled:opacity-50"
                      title={slot.status === 'unavailable' ? 'Tornar disponível' : 'Marcar como etiqueta já removida/indisponível'}
                    >
                      {slot.status === 'unavailable' ? 'Tornar disponível' : 'Marcar indisponível'}
                    </button>
                  </div>

                  {slot.status === 'unavailable' ? (
                    <div className="text-center py-5 text-[11px] text-slate-400 font-semibold">Posição sem etiqueta física</div>
                  ) : (
                    <div className="space-y-1.5">
                      <input
                        value={drafts[slot.position]?.certificateNumber || ''}
                        onChange={(event) => setCertificate(slot.position, event.target.value)}
                        placeholder="Nº certificado"
                        disabled={!canEdit}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-200"
                      />
                      {resolved.state === 'valid' && resolved.data && (
                        <div className="grid grid-cols-[36px_1fr] gap-2 items-center">
                          <img src="/comanins-box-label-logo.png" alt="COMANINS" className="w-8 h-8 object-contain" />
                          <div className="min-w-0 leading-tight">
                            <div className="text-[9px] font-extrabold text-blue-900 truncate">CERT. Nº {resolved.data.certificateNumber}</div>
                            <div className="text-[8px] font-bold text-slate-800 truncate">{resolved.data.clientName}</div>
                            <div className="text-[8px] text-slate-600 truncate">{resolved.data.range} {resolved.data.unit}</div>
                            <div className="text-[8px] text-slate-600 truncate">Ø {resolved.data.diameter} • {resolved.data.connection}</div>
                            <div className="text-[8px] text-slate-600">CAL. {resolved.data.calibrationDate}</div>
                          </div>
                        </div>
                      )}
                      {resolved.state === 'searching' && (
                        <div className="text-[9px] font-bold text-sky-700">Buscando certificado...</div>
                      )}
                      {resolved.state === 'not_found' && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-red-700"><XCircle className="w-3 h-3" /> Certificado não encontrado</div>
                      )}
                      {resolved.state === 'incomplete' && (
                        <div className="flex items-start gap-1 text-[9px] font-bold text-amber-700"><AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> Faltando: {resolved.missing?.join(', ')}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/65 backdrop-blur-sm p-4 overflow-y-auto flex items-start justify-center">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-6 p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Pré-visualização da folha A4363</h2>
                <p className="text-xs text-slate-500 mt-1">Somente as posições com certificado válido receberão conteúdo no PDF.</p>
              </div>
              <button type="button" onClick={() => setPreviewOpen(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-slate-100 p-4 overflow-auto max-h-[75vh]">
              <div className="bg-white border border-slate-300 min-w-[620px] mx-auto p-5 grid grid-cols-2 gap-x-2 gap-y-0" style={{ aspectRatio: '210 / 297' }}>
                {Array.from({ length: A4363.labelsPerSheet }, (_, index) => index + 1).map((position) => {
                  const data = resolvedByPosition.get(position)?.state === 'valid' ? resolvedByPosition.get(position)?.data : undefined;
                  return (
                    <div key={position} className="border border-dashed border-slate-200 p-2 flex items-center" style={{ aspectRatio: '99 / 38.1' }}>
                      {data ? (
                        <div className="grid grid-cols-[44px_1fr] gap-2 w-full items-center">
                          <img src="/comanins-box-label-logo.png" alt="COMANINS" className="w-10 h-10 object-contain" />
                          <div className="text-[9px] leading-tight min-w-0">
                            <div className="font-extrabold text-blue-900 truncate">CERT. Nº {data.certificateNumber}</div>
                            <div className="font-bold truncate">{data.clientName}</div>
                            <div className="truncate">RANGE: {data.range} {data.unit}</div>
                            <div className="truncate">Ø {data.diameter} • CONEX. {data.connection}</div>
                            <div>CAL. {data.calibrationDate}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[9px] text-slate-300">{String(position).padStart(2, '0')}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/65 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Configurar impressão A4363</h2>
                <p className="text-xs text-slate-500 mt-1">O ajuste é salvo apenas neste navegador, pois depende da impressora utilizada.</p>
              </div>
              <button type="button" onClick={() => setSettingsOpen(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <label className="text-sm font-semibold text-slate-700">
                Ajuste horizontal (mm)
                <input
                  type="number"
                  min="-10"
                  max="-10"
                  step="0.1"
                  value={calibration.offsetXmm}
                  onChange={(event) => saveCalibration({ ...calibration, offsetXmm: Number(event.target.value) })}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Ajuste vertical (mm)
                <input
                  type="number"
                  min="-10"
                  max="10"
                  step="0.1"
                  value={calibration.offsetYmm}
                  onChange={(event) => saveCalibration({ ...calibration, offsetYmm: Number(event.target.value) })}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </label>
            </div>
            <div className="mt-4 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
              Geometria nominal: margem esquerda 4,7 mm; margem superior 15,15 mm; etiqueta 99,0 × 38,1 mm; intervalo entre colunas 2,6 mm.
            </div>
            <div className="flex flex-wrap gap-2 mt-5">
              <button type="button" onClick={generateTest} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-700 text-white font-bold rounded-lg"><Printer className="w-4 h-4" /> Folha de teste</button>
              <button type="button" onClick={() => saveCalibration({ offsetXmm: 0, offsetYmm: 0 })} className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 bg-white text-slate-700 font-semibold rounded-lg"><RotateCcw className="w-4 h-4" /> Zerar ajustes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"""

with open('src/components/BoxLabelSheet.tsx', 'w') as f:
    f.write(code[:start_idx] + new_return)
