import React, { useRef, useState } from "react";
import {
  Download,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Gauge,
  Thermometer,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Info,
  Layers,
} from "lucide-react";
import ComaninsLogo from "./ComaninsLogo";
import { downloadCertificateDomAsPdf, printCertificateDomOnly } from "../utils/certificateDomPdf";

interface CalibrationFieldSheetsTabProps {
  customLogo?: string;
  clients?: Array<{ id: string; name: string }>;
}

type SheetType = "transmissor" | "manometro" | "psv";

export default function CalibrationFieldSheetsTab({
  customLogo,
  clients = [],
}: CalibrationFieldSheetsTabProps) {
  const [selectedSheet, setSelectedSheet] = useState<SheetType>("transmissor");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Campos opcionais pré-preenchidos se o técnico quiser adiantar na ficha em branco
  const [clientName, setClientName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [fieldDate, setFieldDate] = useState(() => new Date().toISOString().split("T")[0]);

  const sheetRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    if (!sheetRef.current || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setFeedbackMessage(null);

    try {
      const fileName =
        selectedSheet === "transmissor"
          ? `Ficha_Campo_Transmissor_Em_Branco_${new Date().toISOString().slice(0, 10)}.pdf`
          : selectedSheet === "manometro"
          ? `Ficha_Campo_Manometro_Termometro_Em_Branco_${new Date().toISOString().slice(0, 10)}.pdf`
          : `Ficha_Campo_Valvula_PSV_Em_Branco_${new Date().toISOString().slice(0, 10)}.pdf`;

      await downloadCertificateDomAsPdf(sheetRef.current, fileName);
      setFeedbackMessage("Ficha em PDF gerada com sucesso!");
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      console.error("Erro ao gerar PDF da ficha:", err);
      setFeedbackMessage("Erro ao gerar PDF da ficha. Tente novamente ou use a opção de impressão.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = async () => {
    if (!sheetRef.current) return;
    const title =
      selectedSheet === "transmissor"
        ? "Ficha de Campo - Transmissor (Pressão / Temperatura)"
        : selectedSheet === "manometro"
        ? "Ficha de Campo - Manômetro e Termômetro"
        : "Ficha de Campo - Válvula de Segurança e Alívio (PSV)";
    await printCertificateDomOnly(sheetRef.current, title);
  };

  const handleResetHeader = () => {
    setClientName("");
    setOrderNumber("");
    setTechnicianName("");
    setFieldDate(new Date().toISOString().split("T")[0]);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-blue-50 text-royal-blue rounded-xl border border-blue-100">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-extrabold text-slate-950">
                Fichas de Calibração em Campo
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Emissão e download de folhas de coleta de dados em branco padronizadas para anotação a caneta durante calibrações em área industrial.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-4 py-2 bg-royal-blue hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Gerando PDF...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Baixar Ficha em PDF</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-300 shadow-sm transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4 text-slate-600" />
            <span>Imprimir Ficha</span>
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 print:hidden">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Control Panel: Model selection & quick optional header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Selecione o Modelo da Ficha em Branco:
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetHeader}
            className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Limpar cabeçalho rápido</span>
          </button>
        </div>

        {/* Sheet Model Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setSelectedSheet("transmissor")}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
              selectedSheet === "transmissor"
                ? "bg-blue-50/80 border-royal-blue text-royal-blue shadow-xs"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white"
            }`}
          >
            <div className={`p-2 rounded-lg ${selectedSheet === "transmissor" ? "bg-royal-blue text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
              <Gauge className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-xs">Transmissor (Pressão / Temp.)</p>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                Sinal 4-20 mA DC (HART), 0-10V, 1-5V, malha de ensaio 5 pontos (0 a 100%).
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedSheet("manometro")}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
              selectedSheet === "manometro"
                ? "bg-blue-50/80 border-royal-blue text-royal-blue shadow-xs"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white"
            }`}
          >
            <div className={`p-2 rounded-lg ${selectedSheet === "manometro" ? "bg-royal-blue text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
              <Thermometer className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-xs">Manômetros & Termômetros</p>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                Instrumentos analógicos e digitais de leitura direta (NBR 14105 / NBR 13881).
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedSheet("psv")}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
              selectedSheet === "psv"
                ? "bg-blue-50/80 border-royal-blue text-royal-blue shadow-xs"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-white"
            }`}
          >
            <div className={`p-2 rounded-lg ${selectedSheet === "psv" ? "bg-royal-blue text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-xs">Válvulas de Segurança (PSV / PCV)</p>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                Abertura/Pop, fechamento/reseat, estanqueidade e ensaio de bancada/campo (NR-13).
              </p>
            </div>
          </button>
        </div>

        {/* Quick Optional Pre-fill for Header */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-bold mb-2">
            <Info className="h-3.5 w-3.5 text-blue-600" />
            <span>Dados Opcionais no Cabeçalho (se desejar que a folha já saia identificada antes de imprimir):</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-500 text-[10px] font-bold mb-1">CLIENTE / PLANTA</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: Suzano, Braskem, Acelen..."
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-[10px] font-bold mb-1">Nº DA O.S. / FICHA DE CAMPO</label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Ex: OS-2026-0891"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-[10px] font-bold mb-1">TÉCNICO EXECUTANTE</label>
              <input
                type="text"
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                placeholder="Nome do Técnico de Campo"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-[10px] font-bold mb-1">DATA DA CALIBRAÇÃO</label>
              <input
                type="date"
                value={fieldDate}
                onChange={(e) => setFieldDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900 font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sheet Preview Container (Rendered to PDF via html2canvas/jsPDF) */}
      <div className="bg-slate-200/80 p-4 sm:p-8 rounded-2xl flex justify-center overflow-x-auto print:p-0 print:bg-white">
        <div
          ref={sheetRef}
          className="bg-white text-slate-900 font-sans shadow-xl print:shadow-none mx-auto print:m-0"
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "10mm",
            boxSizing: "border-box",
            backgroundColor: "#ffffff",
          }}
        >
          {/* HEADER PADRÃO COMANINS */}
          <div className="border-b-2 border-slate-800 pb-2 mb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="shrink-0">
                <ComaninsLogo size={150} customLogo={customLogo} />
              </div>
              <div className="flex-1 text-center">
                <h1 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
                  COMANINS ENGENHARIA & METROLOGIA INDUSTRIAL
                </h1>
                <p className="text-[9px] text-slate-600 font-medium">
                  Laboratório de Calibração e Serviços de Campo em Conformidade com a ABNT NBR ISO/IEC 17025
                </p>
                <div className="mt-1 inline-block bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider px-3 py-0.5 rounded">
                  {selectedSheet === "transmissor"
                    ? "FOLHA DE COLETA DE DADOS DE CAMPO — TRANSMISSORES (PRESSÃO / TEMP.)"
                    : selectedSheet === "manometro"
                    ? "FOLHA DE COLETA DE DADOS DE CAMPO — MANÔMETROS / TERMÔMETROS"
                    : "FOLHA DE COLETA DE DADOS DE CAMPO — VÁLVULAS DE SEGURANÇA (PSV / PCV)"}
                </div>
              </div>
              <div className="shrink-0 text-right text-[9px] font-mono border border-slate-300 rounded p-1.5 bg-slate-50">
                <p><span className="font-bold">Nº Ficha:</span> {orderNumber || "________________"}</p>
                <p><span className="font-bold">Data:</span> {fieldDate ? fieldDate.split("-").reverse().join("/") : "__/__/____"}</p>
                <p><span className="font-bold">Página:</span> 1 de 1</p>
              </div>
            </div>
            <div className="mt-1 text-center text-[7.5px] text-slate-500">
              Rua A3, Nº 09, Poloplast, Camaçari - BA — CEP 42801-581 — Fone: (71) 3621-0311 — lab@comanins.com.br
            </div>
          </div>

          {/* DADOS DE IDENTIFICAÇÃO DO CLIENTE E ORDEM DE SERVIÇO */}
          <div className="border border-slate-400 rounded mb-2.5 text-[9.5px]">
            <div className="bg-slate-100 font-bold px-2 py-0.5 border-b border-slate-300 uppercase tracking-wider text-[9px]">
              1. Identificação do Cliente & Serviço de Campo
            </div>
            <div className="p-2 grid grid-cols-3 gap-x-3 gap-y-1">
              <p className="col-span-2">
                <span className="font-bold">Cliente / Planta:</span>{" "}
                <span className="font-mono">{clientName || "_________________________________________________________________"}</span>
              </p>
              <p>
                <span className="font-bold">O.S. / R.T.:</span>{" "}
                <span className="font-mono">{orderNumber || "______________________"}</span>
              </p>
              <p>
                <span className="font-bold">Área / Unidade Operacional:</span>{" "}
                <span className="font-mono">____________________________</span>
              </p>
              <p>
                <span className="font-bold">Equipamento / Malha:</span>{" "}
                <span className="font-mono">____________________________</span>
              </p>
              <p>
                <span className="font-bold">Técnico Responsável:</span>{" "}
                <span className="font-mono">{technicianName || "______________________"}</span>
              </p>
            </div>
          </div>

          {/* DADOS ESPECÍFICOS: TRANSMISSORES */}
          {selectedSheet === "transmissor" && (
            <>
              {/* ITEM 2: IDENTIFICAÇÃO DO TRANSMISSOR */}
              <div className="border border-slate-400 rounded mb-2.5 text-[9.5px]">
                <div className="bg-slate-100 font-bold px-2 py-0.5 border-b border-slate-300 uppercase tracking-wider text-[9px]">
                  2. Identificação do Transmissor sob Calibração
                </div>
                <div className="p-2 grid grid-cols-4 gap-x-3 gap-y-1.5">
                  <div className="col-span-2">
                    <span className="font-bold">TAG do Instrumento:</span>{" "}
                    <span className="font-mono font-bold">____________________________________</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold">Nº de Série:</span>{" "}
                    <span className="font-mono">____________________________________</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold">Fabricante / Marca:</span>{" "}
                    <span className="font-mono">____________________________________</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold">Modelo:</span>{" "}
                    <span className="font-mono">____________________________________</span>
                  </div>
                  <div className="col-span-4">
                    <span className="font-bold">Descrição / Serviço:</span>{" "}
                    <span className="font-mono">__________________________________________________________________________________________</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold">Grandeza Física:</span>{" "}
                    <span className="font-mono">[ &nbsp; ] Pressão Relativa &nbsp; [ &nbsp; ] Pressão Diferencial (dP) &nbsp; [ &nbsp; ] Temperatura</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold">Elemento Sensor:</span>{" "}
                    <span className="font-mono">[ &nbsp; ] Piezoresistivo &nbsp; [ &nbsp; ] Capacitivo &nbsp; [ &nbsp; ] RTD Pt100 &nbsp; [ &nbsp; ] TC: _____</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold">Faixa Nominal do Sensor (URL/LRL):</span>{" "}
                    <span className="font-mono">_______ a _______ [ &nbsp; ] bar [ &nbsp; ] psi [ &nbsp; ] °C [ &nbsp; ] Outra: _____</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold">Faixa Calibrada de Trabalho (URV/LRV):</span>{" "}
                    <span className="font-mono font-bold">_______ a _______ [ &nbsp; ] bar [ &nbsp; ] psi [ &nbsp; ] °C</span>
                  </div>
                </div>
              </div>

              {/* ITEM 3: PARÂMETROS ELÉTRICOS E METROLÓGICOS */}
              <div className="border border-slate-400 rounded mb-2.5 text-[9.5px]">
                <div className="bg-slate-100 font-bold px-2 py-0.5 border-b border-slate-300 uppercase tracking-wider text-[9px]">
                  3. Parâmetros Elétricos & Tolerância Admissível
                </div>
                <div className="p-2 grid grid-cols-4 gap-x-3 gap-y-1">
                  <div className="col-span-2">
                    <span className="font-bold">Sinal de Saída:</span>{" "}
                    <span className="font-mono font-bold">[ &nbsp; ] 4 a 20 mA DC (HART) &nbsp; [ &nbsp; ] 0 a 10 VDC &nbsp; [ &nbsp; ] 1 a 5 VDC</span>
                  </div>
                  <div>
                    <span className="font-bold">Alimentação:</span>{" "}
                    <span className="font-mono">24 VDC (Loop Power)</span>
                  </div>
                  <div>
                    <span className="font-bold">Curva / Ação:</span>{" "}
                    <span className="font-mono">[ &nbsp; ] Linear &nbsp; [ &nbsp; ] Raiz Quad. (√)</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold">Erro Máximo Admissível (EMA / MPE):</span>{" "}
                    <span className="font-mono font-bold">[ &nbsp; ] ± 0,1% &nbsp; [ &nbsp; ] ± 0,2% &nbsp; [ &nbsp; ] ± 0,5% &nbsp; [ &nbsp; ] ± _____ % Span</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold">Tolerância em Corrente (mA):</span>{" "}
                    <span className="font-mono">± _________ mA &nbsp; (Span: 16,000 mA)</span>
                  </div>
                </div>
              </div>

              {/* ITEM 4: PADRÕES RASTREADOS UTILIZADOS NO CAMPO */}
              <div className="border border-slate-400 rounded mb-2.5 text-[9.5px]">
                <div className="bg-slate-100 font-bold px-2 py-0.5 border-b border-slate-300 uppercase tracking-wider text-[9px]">
                  4. Padrões de Referência Utilizados em Campo
                </div>
                <div className="p-2 grid grid-cols-2 gap-3">
                  <div className="border border-slate-200 p-1.5 rounded bg-slate-50">
                    <p className="font-bold text-slate-800 border-b border-slate-200 pb-0.5 mb-1">
                      Padrão 1 (Pressão / Temperatura)
                    </p>
                    <p><span className="font-bold">Descrição / Modelo:</span> <span className="font-mono">____________________________</span></p>
                    <p><span className="font-bold">TAG / Patrimônio Comanins:</span> <span className="font-mono">____________________________</span></p>
                    <p><span className="font-bold">Nº Certificado RBC:</span> <span className="font-mono">____________________________</span></p>
                    <p><span className="font-bold">Validade da Calibração:</span> <span className="font-mono">____ / ____ / ________</span></p>
                  </div>
                  <div className="border border-slate-200 p-1.5 rounded bg-slate-50">
                    <p className="font-bold text-slate-800 border-b border-slate-200 pb-0.5 mb-1">
                      Padrão 2 (Medição Elétrica — Multímetro / Calibrador)
                    </p>
                    <p><span className="font-bold">Descrição / Modelo:</span> <span className="font-mono">____________________________</span></p>
                    <p><span className="font-bold">TAG / Patrimônio Comanins:</span> <span className="font-mono">____________________________</span></p>
                    <p><span className="font-bold">Nº Certificado RBC:</span> <span className="font-mono">____________________________</span></p>
                    <p><span className="font-bold">Validade da Calibração:</span> <span className="font-mono">____ / ____ / ________</span></p>
                  </div>
                </div>
              </div>

              {/* ITEM 5: CONDIÇÕES AMBIENTAIS */}
              <div className="border border-slate-400 rounded mb-2.5 text-[9.5px]">
                <div className="bg-slate-100 font-bold px-2 py-0.5 border-b border-slate-300 uppercase tracking-wider text-[9px]">
                  5. Condições Ambientais no Ponto de Coleta
                </div>
                <div className="p-2 grid grid-cols-3 gap-x-4">
                  <p><span className="font-bold">Temperatura Ambiente:</span> <span className="font-mono">________ ºC &nbsp; (± 5 ºC)</span></p>
                  <p><span className="font-bold">Umidade Relativa do Ar:</span> <span className="font-mono">________ % &nbsp; (± 15 %)</span></p>
                  <p><span className="font-bold">Local Instalação:</span> <span className="font-mono">[ &nbsp; ] Área Abrigada &nbsp; [ &nbsp; ] Tempo / Sol</span></p>
                </div>
              </div>

              {/* ITEM 6: TABELA METROLÓGICA DE ENSAIO - 5 PONTOS */}
              <div className="border border-slate-400 rounded mb-2.5 text-[9.5px]">
                <div className="bg-slate-100 font-bold px-2 py-0.5 border-b border-slate-300 uppercase tracking-wider text-[9px] flex items-center justify-between">
                  <span>6. Registro dos Ensaios de Calibração (Ciclos Ascendente e Descendente)</span>
                  <span className="font-mono font-normal text-[8px] text-slate-600">Norma Referência: IEC 60770 / ABNT NBR ISO/IEC 17025</span>
                </div>
                <div className="p-1">
                  <table className="w-full text-center border-collapse text-[9px]">
                    <thead>
                      <tr className="bg-slate-100 font-bold border border-slate-400">
                        <th className="p-1 border border-slate-300" rowSpan={2} style={{ width: "9%" }}>% Faixa</th>
                        <th className="p-1 border border-slate-300" rowSpan={2} style={{ width: "16%" }}>PV Nominal Entrada<br/>(Padrão)</th>
                        <th className="p-1 border border-slate-300" rowSpan={2} style={{ width: "13%" }}>Saída Teórica<br/>(mA)</th>
                        <th className="p-1 border border-slate-300" colSpan={2} style={{ width: "22%" }}>1º Ciclo Medido (mA)</th>
                        <th className="p-1 border border-slate-300" colSpan={2} style={{ width: "22%" }}>2º Ciclo Medido (mA)</th>
                        <th className="p-1 border border-slate-300" rowSpan={2} style={{ width: "9%" }}>Erro Máx.<br/>(% Span)</th>
                        <th className="p-1 border border-slate-300" rowSpan={2} style={{ width: "9%" }}>Status<br/>(C / NC)</th>
                      </tr>
                      <tr className="bg-slate-100 font-bold border border-slate-400">
                        <th className="p-1 border border-slate-300">Subida (Asc.)</th>
                        <th className="p-1 border border-slate-300">Descida (Desc.)</th>
                        <th className="p-1 border border-slate-300">Subida (Asc.)</th>
                        <th className="p-1 border border-slate-300">Descida (Desc.)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { pct: "0%", teo: "4,000 mA" },
                        { pct: "25%", teo: "8,000 mA" },
                        { pct: "50%", teo: "12,000 mA" },
                        { pct: "75%", teo: "16,000 mA" },
                        { pct: "100%", teo: "20,000 mA" },
                      ].map((row, idx) => (
                        <tr key={idx} className="border border-slate-300 h-8">
                          <td className="p-1 border border-slate-300 font-bold bg-slate-50 font-mono text-center">
                            {row.pct}
                          </td>
                          <td className="p-1 border border-slate-300 font-mono text-slate-400">
                            &nbsp;
                          </td>
                          <td className="p-1 border border-slate-300 font-mono font-bold text-slate-800">
                            {row.teo}
                          </td>
                          <td className="p-1 border border-slate-300 font-mono text-slate-300">
                            &nbsp;
                          </td>
                          <td className="p-1 border border-slate-300 font-mono text-slate-300">
                            &nbsp;
                          </td>
                          <td className="p-1 border border-slate-300 font-mono text-slate-300">
                            &nbsp;
                          </td>
                          <td className="p-1 border border-slate-300 font-mono text-slate-300">
                            &nbsp;
                          </td>
                          <td className="p-1 border border-slate-300 font-mono text-slate-300">
                            &nbsp;
                          </td>
                          <td className="p-1 border border-slate-300 font-mono text-slate-300">
                            [ &nbsp; ]
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ITEM 7: CHECKLIST FÍSICO / FUNCIONAL */}
              <div className="border border-slate-400 rounded mb-2.5 text-[9px]">
                <div className="bg-slate-100 font-bold px-2 py-0.5 border-b border-slate-300 uppercase tracking-wider text-[8.5px]">
                  7. Inspeção Física, Elétrica & Funcional
                </div>
                <div className="p-1.5 grid grid-cols-3 gap-x-4 gap-y-1">
                  <p><span className="font-bold">Invólucro / Pintura / Vidro:</span> [ &nbsp; ] Conforme &nbsp; [ &nbsp; ] NC</p>
                  <p><span className="font-bold">Vedação Tampas / Prensa-Cabo:</span> [ &nbsp; ] Conforme &nbsp; [ &nbsp; ] NC</p>
                  <p><span className="font-bold">Display Local LCD:</span> [ &nbsp; ] Conforme &nbsp; [ &nbsp; ] NC &nbsp; [ &nbsp; ] N/A</p>
                  <p><span className="font-bold">Conexão Processo / Manifold:</span> [ &nbsp; ] Conforme &nbsp; [ &nbsp; ] NC</p>
                  <p><span className="font-bold">Aterramento / Blindagem (Shield):</span> [ &nbsp; ] Conforme &nbsp; [ &nbsp; ] NC</p>
                  <p><span className="font-bold">Ajuste de Zero (Zero Trim) Realizado?</span> [ &nbsp; ] Não &nbsp; [ &nbsp; ] Sim</p>
                </div>
              </div>
            </>
          )}

          {/* DADOS ESPECÍFICOS: MANÔMETROS E TERMÔMETROS */}
          {selectedSheet === "manometro" && (
            <>
              <div className="border border-slate-400 rounded mb-2.5 text-[9.5px]">
                <div className="bg-slate-100 font-bold px-2 py-0.5 border-b border-slate-300 uppercase tracking-wider text-[9px]">
                  2. Identificação do Instrumento (Manômetro / Termômetro)
                </div>
                <div className="p-2 grid grid-cols-4 gap-x-3 gap-y-1.5">
                  <div className="col-span-2">
                    <span className="font-bold">TAG do Cliente:</span>{" "}
                    <span className="font-mono font-bold">____________________________________</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold">Nº de Série:</span>{" "}
                    <span className="font-mono">____________________________________</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold">Fabricante / Marca:</span>{" "}
                    <span className="font-mono">____________________________________</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold">Modelo:</span>{" "}
                    <span className="font-mono">____________________________________</span>
                  </div>
                  <div className="col-span-4">
                    <span className="font-bold">Descrição / Serviço:</span>{" "}
                    <span className="font-mono">__________________________________________________________________________________________</span>
                  </div>
                  <div>
                    <span className="font-bold">Tipo:</span>{" "}
                    <span className="font-mono">[ &nbsp; ] Manômetro &nbsp; [ &nbsp; ] Manovácuo &nbsp; [ &nbsp; ] Termômetro</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold">Faixa Nominal:</span>{" "}
                    <span className="font-mono font-bold">_______ a _______ [ &nbsp; ] bar &nbsp; [ &nbsp; ] psi &nbsp; [ &nbsp; ] °C &nbsp; [ &nbsp; ] Outra: _____</span>
                  </div>
                  <div>
                    <span className="font-bold">Subdivisão (Escala):</span>{" "}
                    <span className="font-mono font-bold">_________ [unid]</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold">Classe de Exatidão / Tolerância (EMA):</span>{" "}
                    <span className="font-mono font-bold">[ &nbsp; ] A (±1,0%) &nbsp; [ &nbsp; ] B (±2,0%) &nbsp; [ &nbsp; ] ± _______ %</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold">Diâmetro do Mostrador:</span>{" "}
                    <span className="font-mono">[ &nbsp; ] 63 mm &nbsp; [ &nbsp; ] 100 mm &nbsp; [ &nbsp; ] 160 mm &nbsp; [ &nbsp; ] Outro: _____</span>
                  </div>
                </div>
              </div>

              {/* ITEM 3: PADRÕES */}
              <div className="border border-slate-400 rounded mb-2.5 text-[9.5px]">
                <div className="bg-slate-100 font-bold px-2 py-0.5 border-b border-slate-300 uppercase tracking-wider text-[9px]">
                  3. Padrão de Referência Utilizado
                </div>
                <div className="p-2 grid grid-cols-2 gap-3">
                  <div>
                    <p><span className="font-bold">Descrição do Padrão:</span> <span className="font-mono">____________________________</span></p>
                    <p><span className="font-bold">TAG / Identificação:</span> <span className="font-mono">____________________________</span></p>
                  </div>
                  <div>
                    <p><span className="font-bold">Certificado de Calibração:</span> <span className="font-mono">____________________________</span></p>
                    <p><span className="font-bold">Validade:</span> <span className="font-mono">____ / ____ / ________</span></p>
                  </div>
                </div>
              </div>

              {/* ITEM 4: TABELA MANÔMETRO */}
              <div className="border border-slate-400 rounded mb-2.5 text-[9.5px]">
                <div className="bg-slate-100 font-bold px-2 py-0.5 border-b border-slate-300 uppercase tracking-wider text-[9px] flex items-center justify-between">
                  <span>4. Registro das Leituras Metrológicas (Comparação Direta)</span>
                  <span className="font-mono font-normal text-[8px] text-slate-600">Norma: ABNT NBR 14105 / NBR 13881</span>
                </div>
                <div className="p-1">
                  <table className="w-full text-center border-collapse text-[9px]">
                    <thead>
                      <tr className="bg-slate-100 font-bold border border-slate-400">
                        <th className="p-1 border border-slate-300" rowSpan={2} style={{ width: "15%" }}>VI (Nominal)<br/>Instrumento</th>
                        <th className="p-1 border border-slate-300" colSpan={2} style={{ width: "28%" }}>VRef 1º Ciclo (Padrão)</th>
                        <th className="p-1 border border-slate-300" colSpan={2} style={{ width: "28%" }}>VRef 2º Ciclo (Padrão)</th>
                        <th className="p-1 border border-slate-300" rowSpan={2} style={{ width: "15%" }}>Média VRef</th>
                        <th className="p-1 border border-slate-300" rowSpan={2} style={{ width: "14%" }}>Erro (VI - VRef)</th>
                      </tr>
                      <tr className="bg-slate-100 font-bold border border-slate-400">
                        <th className="p-1 border border-slate-300">Crescente (Asc.)</th>
                        <th className="p-1 border border-slate-300">Decrescente (Desc.)</th>
                        <th className="p-1 border border-slate-300">Crescente (Asc.)</th>
                        <th className="p-1 border border-slate-300">Decrescente (Desc.)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4, 5, 6].map((idx) => (
                        <tr key={idx} className="border border-slate-300 h-8">
                          <td className="p-1 border border-slate-300 font-mono text-center font-bold bg-slate-50">
                            Ponto {idx}
                          </td>
                          <td className="p-1 border border-slate-300">&nbsp;</td>
                          <td className="p-1 border border-slate-300">&nbsp;</td>
                          <td className="p-1 border border-slate-300">&nbsp;</td>
                          <td className="p-1 border border-slate-300">&nbsp;</td>
                          <td className="p-1 border border-slate-300">&nbsp;</td>
                          <td className="p-1 border border-slate-300">&nbsp;</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* DADOS ESPECÍFICOS: VÁLVULAS PSV */}
          {selectedSheet === "psv" && (
            <>
              <div className="border border-slate-400 rounded mb-2.5 text-[9.5px]">
                <div className="bg-slate-100 font-bold px-2 py-0.5 border-b border-slate-300 uppercase tracking-wider text-[9px]">
                  2. Identificação da Válvula de Segurança e Alívio (PSV / PCV)
                </div>
                <div className="p-2 grid grid-cols-4 gap-x-3 gap-y-1.5">
                  <div className="col-span-2">
                    <span className="font-bold">TAG da Válvula:</span>{" "}
                    <span className="font-mono font-bold">____________________________________</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold">Nº de Série:</span>{" "}
                    <span className="font-mono">____________________________________</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold">Fabricante / Modelo:</span>{" "}
                    <span className="font-mono">____________________________________</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold">Pressão de Ajuste (Set Point):</span>{" "}
                    <span className="font-mono font-bold">_________ [ &nbsp; ] kgf/cm² &nbsp; [ &nbsp; ] bar &nbsp; [ &nbsp; ] psi</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold">Tolerância Admissível (EMA):</span>{" "}
                    <span className="font-mono">[ &nbsp; ] ± 3% (ASME/NR-13) &nbsp; [ &nbsp; ] ± _____ %</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold">Fluido de Processo:</span>{" "}
                    <span className="font-mono">____________________________________</span>
                  </div>
                </div>
              </div>

              {/* TABELA DE DISPAROS PSV */}
              <div className="border border-slate-400 rounded mb-2.5 text-[9.5px]">
                <div className="bg-slate-100 font-bold px-2 py-0.5 border-b border-slate-300 uppercase tracking-wider text-[9px]">
                  3. Ensaios de Disparo (Pressão de Abertura e Fechamento)
                </div>
                <div className="p-1">
                  <table className="w-full text-center border-collapse text-[9px]">
                    <thead>
                      <tr className="bg-slate-100 font-bold border border-slate-400">
                        <th className="p-1.5 border border-slate-300">Corrida / Ensaio</th>
                        <th className="p-1.5 border border-slate-300">Pressão de Abertura (Pop)</th>
                        <th className="p-1.5 border border-slate-300">Pressão de Fechamento (Reseat)</th>
                        <th className="p-1.5 border border-slate-300">Erro em Relação ao Set Point</th>
                        <th className="p-1.5 border border-slate-300">Blowdown Calculado (%)</th>
                        <th className="p-1.5 border border-slate-300">Conformidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3].map((run) => (
                        <tr key={run} className="border border-slate-300 h-9">
                          <td className="p-1 border border-slate-300 font-bold bg-slate-50 font-mono">1º Ciclo - Disparo {run}</td>
                          <td className="p-1 border border-slate-300">&nbsp;</td>
                          <td className="p-1 border border-slate-300">&nbsp;</td>
                          <td className="p-1 border border-slate-300">&nbsp;</td>
                          <td className="p-1 border border-slate-300">&nbsp;</td>
                          <td className="p-1 border border-slate-300">[ &nbsp; ] Aprovado &nbsp; [ &nbsp; ] Reprovado</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ESTANQUEIDADE DA SEDE */}
              <div className="border border-slate-400 rounded mb-2.5 text-[9.5px]">
                <div className="bg-slate-100 font-bold px-2 py-0.5 border-b border-slate-300 uppercase tracking-wider text-[9px]">
                  4. Ensaio de Estanqueidade da Sede (API Std 527)
                </div>
                <div className="p-2 grid grid-cols-3 gap-3">
                  <p><span className="font-bold">Pressão de Teste (90% do Set):</span> <span className="font-mono">_________ [unid]</span></p>
                  <p><span className="font-bold">Tempo de Observação:</span> <span className="font-mono">________ minutos</span></p>
                  <p><span className="font-bold">Vazamento Observado:</span> <span className="font-mono">[ &nbsp; ] Zero bolhas / Sem vazamento &nbsp; [ &nbsp; ] Vazamento detectado</span></p>
                </div>
              </div>
            </>
          )}

          {/* ITEM COMUM: OBSERVAÇÕES E NOTAS DE CAMPO */}
          <div className="border border-slate-400 rounded mb-3 text-[9.5px]">
            <div className="bg-slate-100 font-bold px-2 py-0.5 border-b border-slate-300 uppercase tracking-wider text-[9px]">
              Observações Gerais & Informações Complementares de Campo
            </div>
            <div className="p-2 space-y-2">
              <div className="border-b border-dashed border-slate-300 h-4"></div>
              <div className="border-b border-dashed border-slate-300 h-4"></div>
              <div className="border-b border-dashed border-slate-300 h-4"></div>
            </div>
          </div>

          {/* ITEM COMUM: ASSINATURAS E RESPONSABILIDADE */}
          <div className="border border-slate-400 rounded p-2 text-[9px]">
            <div className="grid grid-cols-2 gap-8 text-center pt-8">
              <div className="border-t border-slate-800 pt-1">
                <p className="font-bold font-mono text-[9.5px]">
                  {technicianName || "Técnico de Campo — COMANINS"}
                </p>
                <p className="text-[8px] text-slate-600">Assinatura do Técnico Executante / CFT</p>
              </div>
              <div className="border-t border-slate-800 pt-1">
                <p className="font-bold font-mono text-[9.5px]">
                  Fiscal / Responsável da Planta
                </p>
                <p className="text-[8px] text-slate-600">Assinatura / Visto do Cliente / Matrícula</p>
              </div>
            </div>
          </div>

          {/* RODAPÉ DO DOCUMENTO */}
          <div className="mt-3 text-center text-[7.5px] text-slate-500 font-mono flex items-center justify-between border-t border-slate-200 pt-1">
            <span>COMANINS ENGENHARIA — Procedimento Metrológico PR-001 / IEC 60770</span>
            <span>Documento primário de calibração em campo — Arquivamento obrigatório</span>
            <span>Rastreabilidade RBC / Inmetro</span>
          </div>
        </div>
      </div>
    </div>
  );
}
