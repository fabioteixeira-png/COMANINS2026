import * as XLSX from 'xlsx';

type ParseRequest = { buffer: ArrayBuffer };
type ParseResponse =
  | { type: 'parsed'; rows: Record<string, unknown>[] }
  | { type: 'error'; message: string };

self.onmessage = (event: MessageEvent<ParseRequest>) => {
  try {
    const workbook = XLSX.read(event.data.buffer, { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error('A planilha não possui abas para importação.');

    const worksheet = workbook.Sheets[firstSheetName];
    const parsedRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      raw: false,
      defval: '',
    });

    // __rowNum__ é não enumerável no retorno do SheetJS. Torná-lo explícito
    // preserva exatamente a linha de origem após o structured clone do Worker.
    const rows = parsedRows.map((row) => ({
      ...row,
      __rowNum__: Number.isFinite(Number((row as any).__rowNum__)) ? Number((row as any).__rowNum__) : undefined,
    }));

    const response: ParseResponse = { type: 'parsed', rows };
    self.postMessage(response);
  } catch (error) {
    const response: ParseResponse = {
      type: 'error',
      message: error instanceof Error ? error.message : 'Erro desconhecido ao interpretar a planilha Excel.',
    };
    self.postMessage(response);
  }
};
