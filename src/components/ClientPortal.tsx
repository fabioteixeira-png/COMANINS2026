import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import ComaninsLogo from './ComaninsLogo';
import { 
  Building, 
  LogOut, 
  CheckCircle, 
  AlertTriangle, 
  Gauge, 
  Thermometer, 
  FileText, 
  Search, 
  Printer, 
  Award, 
  TrendingUp, 
  ShieldCheck,
  ShieldAlert,
  X,
  Key,
  Copy,
  Check
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine 
} from 'recharts';
import { Client, Instrument, CalibrationReport, RncReport } from '../types';

import { syncFieldServiceRecords, FieldServiceRecord } from '../lib/firebase';
import { PrivacyPolicyModal } from './LGPDPrivacy';
import { getReportAuthKey } from '../utils/authKey';
import { syncClientIntakes, SavedIntake, syncRncReports } from '../lib/firebase';


const formatDateBR = (dateStr: string | undefined): string => {
  if (!dateStr) return '—';
  const clean = String(dateStr).trim();
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD -> DD/MM/AAAA
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return `${parts[0]}/${parts[1]}/${parts[2]}`;
    }
  }
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // DD/MM/AAAA -> DD/MM/AAAA
        return clean;
      }
      return `${parts[1]}/${parts[0]}/${parts[2]}`;
    }
  }
  return clean;
};

interface ClientPortalProps {
  client: Client;
  instruments: Instrument[];
  reports: CalibrationReport[];
  customLogo?: string;
  onLogout: () => void;
}

export default function ClientPortal({ client, instruments, reports, customLogo, onLogout }: ClientPortalProps) {
  const [clientIntakes, setClientIntakes] = useState<SavedIntake[]>([]);

  const [fieldServiceRecords, setFieldServiceRecords] = useState<FieldServiceRecord[]>([]);

  useEffect(() => {
    if (client?.isFieldService) {
      const unsub = syncFieldServiceRecords((records) => {
        setFieldServiceRecords(records);
      });
      return () => {
        unsub.then(u => u());
      }
    }
  }, [client?.isFieldService]);

  
  useEffect(() => {
    if (client?.id) {
      const unsub = syncClientIntakes(client.id, (list) => {
        setClientIntakes(list);
      });
      return () => unsub.then(fn => fn());
    }
  }, [client?.id]);

  const getClientStatus = (inst: Instrument, allInsts: Instrument[]) => {
    if (inst.status === 'Disponível para Retirada' || inst.status === 'Entregue') {
      if (!inst.numeroDaEntrada) return inst.status;
      
      const numEntrada = inst.numeroDaEntrada.trim().toLowerCase();
      const intake = clientIntakes.find(i => (i.numEntrada || '').trim().toLowerCase() === numEntrada);
      
      let expectedCount = 0;
      if (intake && intake.rows) {
         expectedCount = intake.rows.reduce((sum, r) => sum + (Number(r.quant) || 0), 0);
      }
      
      const intakeInstruments = allInsts.filter(i => (i.numeroDaEntrada || '').trim().toLowerCase() === numEntrada);
      const readyCount = intakeInstruments.filter(i => 
        i.status === 'Disponível para Retirada' || 
        i.status === 'Entregue' || 
        i.status === 'Não Conforme'
      ).length;
      
      // Se não sabemos a quantidade esperada (sem intake salvo), baseamos apenas no que está lançado.
      const allReady = expectedCount > 0 ? (readyCount >= expectedCount) : intakeInstruments.every(i => 
        i.status === 'Disponível para Retirada' || 
        i.status === 'Entregue' || 
        i.status === 'Não Conforme'
      );
      
      if (!allReady) {
        return inst.status === 'Entregue' ? 'Entregue' : 'Aguardando Calibração'; // se já foi entregue, mantem.
      }
    }
    return inst.status;
  };

  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedReport, setSelectedReport] = useState<CalibrationReport | null>(null);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [fsTag, setFsTag] = useState<string>("");
  const [fsEquip, setFsEquip] = useState<string>("");
  const [rncReports, setRncReports] = useState<RncReport[]>([]);
  const [selectedRncReport, setSelectedRncReport] = useState<RncReport | null>(null);
  const [showRncViewModal, setShowRncViewModal] = useState<boolean>(false);

  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    let unsubscribeRnc: any = null;
    syncRncReports((list) => {
      setRncReports(list);
    }).then(unsub => {
      unsubscribeRnc = unsub;
    }).catch(console.error);

    return () => {
      if (unsubscribeRnc) unsubscribeRnc();
    };
  }, []);

  // Read URL query string for ?chave=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chaveParam = params.get('chave');
    if (chaveParam) {
      setSearchTerm(chaveParam);
    }
  }, []);

  
  // Filter instruments belonging to this client
  const clientInstruments = instruments.filter(inst => inst.clientId === client.id);

  const displayStatuses = new Map<string, string>();
  clientInstruments.forEach(inst => {
    displayStatuses.set(inst.id, getClientStatus(inst, clientInstruments));
  });

  // Stats calculation
  const totalInstruments = clientInstruments.length;
  const pendingInstruments = clientInstruments.filter(inst => {
    const s = displayStatuses.get(inst.id);
    return s === 'Aguardando Triagem' || s === 'Em Calibração' || s === 'Aguardando Calibração' || s === 'Aguardando Emissão de Certificado';
  }).length;
  const completedInstruments = clientInstruments.filter(inst => {
    const s = displayStatuses.get(inst.id);
    return s === 'Calibrado' || s === 'Entregue' || s === 'Disponível para Retirada' || s === 'Não Conforme';
  }).length;


  // Filter and search including authKey & certNumber
  const filteredInstruments = clientInstruments.filter(inst => {
    const query = searchTerm.trim().toLowerCase();
    
    const instReports = reports.filter(r => r.instrumentId === inst.id);
    const authKeys = instReports.map(r => getReportAuthKey(r, inst.id).toLowerCase());
    const certNumbers = instReports.map(r => (r.certNumber || '').toLowerCase());

    const matchesSearch = !query || 
                          inst.tag.toLowerCase().includes(query) || 
                          (inst.coma || "").toLowerCase().includes(query) || 
                          inst.description.toLowerCase().includes(query) || 
                          (inst.serialNumber && inst.serialNumber.toLowerCase().includes(query)) ||
                          (inst.model && inst.model.toLowerCase().includes(query)) ||
                          certNumbers.some(cn => cn.includes(query)) ||
                          authKeys.some(ak => ak.includes(query));
    
    const dStatus = displayStatuses.get(inst.id);
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'pending') {
      return matchesSearch && (dStatus === 'Aguardando Triagem' || dStatus === 'Em Calibração' || dStatus === 'Aguardando Calibração' || dStatus === 'Aguardando Emissão de Certificado');
    }
    if (statusFilter === 'completed') {
      return matchesSearch && (dStatus === 'Calibrado' || dStatus === 'Entregue' || dStatus === 'Disponível para Retirada' || dStatus === 'Não Conforme');
    }
    return matchesSearch;
  }).sort((a, b) => {
    // 1. Status 'Entregue' goes to the bottom
    const isAEntregue = a.status === "Entregue";
    const isBEntregue = b.status === "Entregue";

    if (isAEntregue && !isBEntregue) return 1;
    if (!isAEntregue && isBEntregue) return -1;

    // 2. Both are Entregue or both NOT Entregue: Order by Entry Order (Ordem da Entrada)
    const numEntradaA = (a.numeroDaEntrada || "").trim();
    const numEntradaB = (b.numeroDaEntrada || "").trim();
    if (numEntradaA && numEntradaB) {
      const cmp = numEntradaA.localeCompare(numEntradaB, undefined, { numeric: true, sensitivity: "base" });
      if (cmp !== 0) return cmp;
    } else if (numEntradaA && !numEntradaB) {
      return -1;
    } else if (!numEntradaA && numEntradaB) {
      return 1;
    }

    const dateA = a.dataEntrada || "";
    const dateB = b.dataEntrada || "";
    if (dateA && dateB) {
      const normDateA = dateA.includes("/") ? dateA.split("/").reverse().join("-") : dateA;
      const normDateB = dateB.includes("/") ? dateB.split("/").reverse().join("-") : dateB;
      const cmp = normDateA.localeCompare(normDateB);
      if (cmp !== 0) return cmp;
    } else if (dateA && !dateB) {
      return -1;
    } else if (!dateA && dateB) {
      return 1;
    }

    const certA = (a.certificateNumber || a.coma || "").trim();
    const certB = (b.certificateNumber || b.coma || "").trim();
    if (certA && certB) {
      const cmp = certA.localeCompare(certB, undefined, { numeric: true, sensitivity: "base" });
      if (cmp !== 0) return cmp;
    }

    const idA = (a.id || "").trim();
    const idB = (b.id || "").trim();
    return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: "base" });
  });

  const handleOpenCertificate = (instrument: Instrument) => {
    // Find the latest calibration report for this instrument
    const reportList = reports.filter(r => r.instrumentId === instrument.id);
    if (reportList.length > 0) {
      // Sort by date or pick latest
      const latestReport = reportList[reportList.length - 1];
      setSelectedReport(latestReport);
      setSelectedInstrument(instrument);
    } else {
      // Just in case no report exists but status is calibrated, let's alert gently
      alert('Certificado em processamento ou indisponível.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12 print:min-h-0 print:h-auto print:block print:pb-0 print:bg-white">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 text-slate-900 shadow-sm sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <ComaninsLogo size={140} src={customLogo} className="max-h-10 w-auto" />
              <div>
                <span className="font-display font-extrabold text-sm tracking-wider text-slate-900 block">COMANINS Portal</span>
                <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Área do Cliente</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-slate-900 block">{client.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">CNPJ: {client.cnpj}</span>
              </div>
              <button
                onClick={onLogout}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 border border-slate-200 shadow-sm"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 print:hidden">
        {client.isFieldService ? (
          <>
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Building className="w-40 h-40 text-royal-blue" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 bg-blue-50 text-royal-blue text-[10px] font-bold rounded uppercase tracking-wider font-mono border border-blue-100">
                    Acesso Serviço de Campo
                  </span>
                  <span className="text-xs text-slate-500 font-mono">• {client.city}</span>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-display font-extrabold text-slate-900">{client.name}</h1>
                  <p className="text-slate-600 text-xs mt-1 max-w-2xl leading-relaxed">
                    Bem-vindo ao portal de Serviço de Campo. Abaixo estão listados os certificados disponíveis vinculados aos serviços realizados.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Certificados Disponíveis</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <th className="p-4 font-semibold">Certificado</th>
                      <th className="p-4 font-semibold">TAG</th>
                      <th className="p-4 font-semibold">Equipamento</th>
                      <th className="p-4 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const extractNum = (s: string) => String(s || '').replace(/\D/g, '');
                      const correlatedRecords = fieldServiceRecords.map(fsRecord => {
                        const recNum = extractNum(fsRecord.certificate);
                        const inst = instruments.find(i => extractNum(i.certificateNumber) === recNum);
                        if (inst) {
                           return {
                             fsRecord,
                             inst
                           };
                        }
                        return null;
                      }).filter(Boolean);

                      if (correlatedRecords.length === 0) {
                        return (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-500">
                              Nenhum certificado disponível no momento.
                            </td>
                          </tr>
                        );
                      }

                      return correlatedRecords.map(({ fsRecord, inst }: any, idx: number) => {
                        const report = reports.find(r => r.instrumentId === inst.id);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-4 font-mono font-medium">{fsRecord.certificate || inst.certificateNumber}</td>
                            <td className="p-4">{fsRecord.tag || inst.tag || '-'}</td>
                            <td className="p-4">{fsRecord.equipamento || '-'}</td>
                            <td className="p-4 text-right">
                              <button 
                                onClick={() => {
                                  if (report) {
                                    setSelectedReport(report);
                                    setSelectedInstrument(inst);
                                    setFsTag(fsRecord.tag || '');
                                    setFsEquip(fsRecord.equipamento || '');
                                  } else {
                                    alert('Certificado oficial ainda não emitido para este instrumento.');
                                  }
                                }}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center space-x-1.5 ml-auto"
                              >
                                <Printer className="w-4 h-4" />
                                <span>Imprimir</span>
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>

        {/* Welcome and client info card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Building className="w-40 h-40 text-royal-blue" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-blue-50 text-royal-blue text-[10px] font-bold rounded uppercase tracking-wider font-mono border border-blue-100">
                Planta Conectada
              </span>
              <span className="text-xs text-slate-500 font-mono">• {client.city}</span>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-extrabold text-slate-900">{client.name}</h1>
              <p className="text-slate-600 text-xs mt-1 max-w-2xl leading-relaxed">
                Bem-vindo ao seu painel exclusivo de metrologia. Aqui sua empresa tem acesso instantâneo a todos os instrumentos cadastrados, histórico de manutenções, status de calibração em tempo real e download de certificados oficiais com rastreabilidade metrológica. Seus dados cadastrais e de contato estão protegidos sob rígida conformidade com a{' '}
                <button 
                  onClick={() => setIsPrivacyOpen(true)}
                  className="text-royal-blue hover:text-blue-800 font-bold underline transition-colors focus:outline-none cursor-pointer"
                >
                  LGPD / Política de Privacidade
                </button>.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block font-semibold">Instrumentos Ativos</span>
              <span className="text-3xl font-display font-extrabold text-royal-blue">{totalInstruments}</span>
            </div>
            <div className="p-3.5 bg-blue-50 text-royal-blue rounded-xl border border-blue-100">
              <Gauge className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-amber-600 font-mono uppercase tracking-widest block font-semibold">Aguardando / Em Calibração</span>
              <span className="text-3xl font-display font-extrabold text-amber-600">{pendingInstruments}</span>
            </div>
            <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-emerald-600 font-mono uppercase tracking-widest block font-semibold">Calibrados & Prontos</span>
              <span className="text-3xl font-display font-extrabold text-emerald-600">{completedInstruments}</span>
            </div>
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <CheckCircle className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Instruments Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
          {/* Header & Controls */}
          <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-base text-slate-900">Inventário de Ativos Industriais</h2>
              <p className="text-[11px] text-slate-500">Relação de todos os manômetros, termômetros e transmissores de sua empresa.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Category selector */}
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${
                    statusFilter === 'all' 
                      ? 'bg-royal-blue text-white shadow-md' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${
                    statusFilter === 'pending' 
                      ? 'bg-royal-blue text-white shadow-md' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Pendentes
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${
                    statusFilter === 'completed' 
                      ? 'bg-royal-blue text-white shadow-md' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Certificados
                </button>
              </div>

              {/* Search bar */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="Pesquisar tag, modelo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-royal-blue focus:border-royal-blue w-full sm:w-56"
                />
              </div>
            </div>
          </div>

          {/* Instruments Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-mono text-[10px] uppercase tracking-wider">
                  <th className="p-4">N. Certificado</th>
                  <th className="p-4">Descrição do Instrumento</th>
                  <th className="p-4">Tag do Cliente</th>
                  <th className="p-4">Faixa de Operação</th>
                  <th className="p-4">Status de Calibração</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInstruments.map(inst => {
                  const dStatus = displayStatuses.get(inst.id) || inst.status;
                  const hasCertificate = dStatus === 'Calibrado' || dStatus === 'Entregue' || dStatus === 'Disponível para Retirada';
                  const isRnc = dStatus === 'RNC' || inst.status === 'RNC' || inst.hasRnc;
                  return (
                    <tr key={inst.id} className="hover:bg-slate-55 transition-colors">
                      <td className="p-4">
                        <span className="font-mono bg-slate-100 text-slate-800 px-2.5 py-1 rounded border border-slate-200 font-bold text-xs">
                          {inst.certificateNumber || inst.coma || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{inst.description}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{inst.model || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-600">
                        <span className="text-xs font-semibold">{inst.tag || 'N/A'}</span>
                      </td>
                      <td className="p-4 text-slate-600">
                        <span className="font-mono text-xs">{inst.rangeMin}/{inst.rangeMax} {inst.unit}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col space-y-1">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold text-[9px] w-fit uppercase ${
                            dStatus === 'Aguardando Triagem' 
                              ? 'bg-slate-100 text-slate-600 border border-slate-200' 
                              : (dStatus === 'Em Calibração' || dStatus === 'Aguardando Calibração') 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {dStatus}
                          </span>
                          {inst.lastCalibrationDate && (
                            <span className="text-[9px] text-slate-500 block font-mono">Calibração: {inst.lastCalibrationDate}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {isRnc ? (
                          <button
                            onClick={() => {
                              const report = rncReports.find(r => r.instrumentId === inst.id);
                              if (report) {
                                setSelectedRncReport(report);
                                setSelectedInstrument(inst);
                                setShowRncViewModal(true);
                              } else {
                                alert("Relatório de RNC não encontrado para este instrumento.");
                              }
                            }}
                            className="inline-flex items-center justify-center px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[11px] transition-all shadow-sm hover:shadow"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Visualizar Relatório de RNC
                          </button>
                        ) : hasCertificate ? (
                          <button
                            onClick={() => handleOpenCertificate(inst)}
                            className="inline-flex items-center justify-center px-3 py-1.5 bg-royal-blue hover:bg-royal-light text-white rounded font-bold text-[11px] transition-all shadow-sm hover:shadow"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Ver Certificado
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic font-mono font-medium">Aguardando Ensaio</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredInstruments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500 font-sans text-xs">
                      Nenhum instrumento encontrado para este filtro ou pesquisa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
                </>
        )}
      </main>

      {/* RNC Modal */}
      {showRncViewModal && selectedRncReport && selectedInstrument && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-6 text-slate-900 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:m-0 print:w-full">
            {/* Header Modal Bar */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0 print:hidden">
              <div className="flex items-center space-x-3">
                <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0" />
                <h3 className="font-display font-extrabold text-sm text-white">
                  Relatório de Não Conformidade (RNC) - {selectedRncReport.rncNumber}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <Printer className="h-4 w-4" />
                  <span>Imprimir RNC</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRncViewModal(false);
                    setSelectedRncReport(null);
                    setSelectedInstrument(null);
            setFsTag("");
            setFsEquip("");
                  }}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-8 overflow-y-auto space-y-6 text-slate-900 font-sans text-xs bg-white print:p-0 print:overflow-visible">
              {/* Document Header */}
              <div className="border-b-2 border-rose-600 pb-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {customLogo ? (
                    <img
                      src={customLogo}
                      alt="COMANINS Logo"
                      className="h-12 object-contain"
                    />
                  ) : (
                    <ComaninsLogo className="h-12 w-auto" />
                  )}
                  <div>
                    <h1 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">
                      COMANINS - SERVIÇOS DE METROLOGIA E MANUTENÇÃO
                    </h1>
                    <p className="text-[10px] text-slate-600">
                      Laboratório de Calibração Industrial & Ensaios Metrológicos
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-rose-100 text-rose-900 font-mono font-extrabold text-sm rounded border border-rose-300">
                    {selectedRncReport.rncNumber}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    Data de Emissão:{" "}
                    {selectedRncReport.date
                      ? selectedRncReport.date.split("-").reverse().join("/")
                      : new Date().toLocaleDateString("pt-BR")}
                  </div>
                </div>
              </div>

              {/* Document Title Banner */}
              <div className="bg-rose-50 border-l-4 border-rose-600 p-3 rounded-r-lg">
                <h2 className="text-sm font-extrabold text-rose-900 uppercase tracking-wide flex items-center space-x-2">
                  <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>RELATÓRIO DE NÃO CONFORMIDADE METROLÓGICA (RNC)</span>
                </h2>
                <p className="text-[11px] text-rose-800 mt-0.5 font-medium">
                  Status: <span className="font-extrabold underline uppercase">NÃO CONFORME / REPROVADO PARA USO</span>
                </p>
              </div>

              {/* Instrument Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1 border border-slate-200 rounded p-3">
                  <h3 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">
                    Dados do Equipamento
                  </h3>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="grid grid-cols-3">
                      <span className="font-semibold text-slate-500">Descrição:</span>
                      <span className="col-span-2 text-slate-800">{selectedInstrument.description}</span>
                    </div>
                    <div className="grid grid-cols-3">
                      <span className="font-semibold text-slate-500">Fabricante:</span>
                      <span className="col-span-2 text-slate-800">{selectedInstrument.brand}</span>
                    </div>
                    <div className="grid grid-cols-3">
                      <span className="font-semibold text-slate-500">Modelo:</span>
                      <span className="col-span-2 text-slate-800">{selectedInstrument.model}</span>
                    </div>
                    <div className="grid grid-cols-3">
                      <span className="font-semibold text-slate-500">Nº de Série:</span>
                      <span className="col-span-2 text-slate-800">{selectedInstrument.serialNumber || "-"}</span>
                    </div>
                  </div>
                </div>
                <div className="col-span-2 md:col-span-1 border border-slate-200 rounded p-3">
                  <h3 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">
                    Identificação & Controle
                  </h3>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="grid grid-cols-3">
                      <span className="font-semibold text-slate-500">TAG do Cliente:</span>
                      <span className="col-span-2 font-mono text-slate-800 font-bold">{selectedInstrument.tag}</span>
                    </div>
                    <div className="grid grid-cols-3">
                      <span className="font-semibold text-slate-500">Certificado Nº:</span>
                      <span className="col-span-2 font-mono text-slate-800">{selectedInstrument.certificateNumber}</span>
                    </div>
                    <div className="grid grid-cols-3">
                      <span className="font-semibold text-slate-500">Cliente:</span>
                      <span className="col-span-2 text-slate-800 line-clamp-1">{client.name}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RNC Details */}
              <div className="border-l-4 border-rose-500 pl-4 py-1">
                <h3 className="font-bold text-slate-900 mb-2 uppercase text-[11px] tracking-wider">
                  Descrição do Defeito / Motivo da Reprovação
                </h3>
                <div className="text-slate-800 font-mono text-sm leading-relaxed p-3 bg-slate-50 border border-slate-200 rounded-md whitespace-pre-wrap">
                  {selectedRncReport.reason}
                </div>
              </div>

              <div className="border-l-4 border-amber-500 pl-4 py-1">
                <h3 className="font-bold text-slate-900 mb-2 uppercase text-[11px] tracking-wider">
                  Análise Técnica e Impacto
                </h3>
                <div className="text-slate-800 font-sans text-[11px] leading-relaxed p-3 bg-amber-50/50 border border-amber-100 rounded-md whitespace-pre-wrap">
                  {selectedRncReport.aiAnalysis || "O instrumento não atende aos requisitos metrológicos e normativos devido à anomalia reportada acima, impossibilitando sua calibração ou uso contínuo com exatidão."}
                </div>
              </div>

              <div className="pt-8">
                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div className="text-center border-t border-slate-300 pt-2">
                    <div className="font-bold text-slate-800 mb-0.5">
                      {selectedRncReport.technicianName}
                    </div>
                    <div className="text-slate-500 text-[9px]">
                      Técnico Metrologista / Responsável
                    </div>
                    <div className="text-slate-400 text-[9px]">
                      COMANINS Metrologia
                    </div>
                  </div>
                  <div className="text-center border-t border-slate-300 pt-2">
                    <div className="font-bold text-slate-800 mb-0.5">
                      Ciente / Responsável
                    </div>
                    <div className="text-slate-500 text-[9px]">
                      Aprovação do Cliente
                    </div>
                    <div className="text-slate-400 text-[9px]">
                      {client.name}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER EXTREMELY HIGH QUALITY CALIBRATION REPORT OVERLAY (MODAL) */}
      {selectedReport && selectedInstrument && (
        <div 
          onClick={() => {
            setSelectedReport(null);
            setSelectedInstrument(null);
            setFsTag("");
            setFsEquip("");
          }}
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 overflow-y-auto p-2 sm:p-6 md:p-8 flex justify-center items-start print:static print:block print:overflow-visible print:p-0 print:bg-white print:text-black print:backdrop-blur-none"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="printable-area bg-white text-slate-900 rounded-2xl max-w-4xl w-full my-4 p-6 sm:p-10 space-y-6 shadow-2xl relative border border-slate-200 print:rounded-none print:shadow-none print:border-none print:p-0 print:my-0"
          >
            
            {/* Modal actions - HIDDEN in printing */}
            <div className="sticky -top-6 sm:-top-10 -mx-6 sm:-mx-10 -mt-6 sm:-mt-10 p-3 sm:p-4 px-6 bg-slate-900/90 text-white backdrop-blur-md flex items-center justify-between print:hidden z-30 mb-4 rounded-t-2xl">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold font-mono tracking-wider text-slate-200 uppercase">Certificado de Calibração Nº {selectedReport.certNumber || selectedInstrument.certificateNumber || 'OFICIAL'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrint}
                  className="p-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all flex items-center text-xs font-bold gap-1.5 shadow-sm cursor-pointer"
                  title="Imprimir Certificado de Calibração"
                >
                  <Printer className="h-4 w-4" />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedReport(null);
                    setSelectedInstrument(null);
            setFsTag("");
            setFsEquip("");
                  }}
                  className="p-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-all flex items-center text-xs font-bold gap-1 shadow-sm border border-slate-700 cursor-pointer"
                  title="Fechar Certificado"
                >
                  <X className="h-4 w-4" />
                  <span>Fechar</span>
                </button>
              </div>
            </div>

            {/* Certificate content */}
            {(() => {
              const inst = selectedInstrument;
              const certNumber = selectedReport?.certNumber || (inst?.certificateNumber ? inst.certificateNumber : `COMA-${inst?.id.substring(0,4).toUpperCase()}`);
              const certAuthKey = getReportAuthKey(selectedReport, inst?.id + certNumber);
              const points = selectedReport?.points || (inst as any)?.calibrationPoints || [];
              
              let maxHysteresis = 0;
              let maxRepeatability = 0;
              let maxAbsError = 0;
              let span = Math.abs((inst?.rangeMax || 0) - (inst?.rangeMin || 0)) || 1;
              const mpeVal = (selectedReport?.mpe !== undefined && selectedReport?.mpe !== null && (selectedReport as any)?.mpe !== '') 
                ? Number((selectedReport as any).mpe) 
                : (inst?.mpe !== undefined && inst?.mpe !== null && (inst?.mpe as any) !== '') 
                  ? Number(inst.mpe) 
                  : 0;

              const formattedPoints = points.map((p: any) => {
                 const nominal = p.nominal !== undefined ? p.nominal : p.nominalValue;
                 const rawA1 = p.refAsc1 !== undefined ? p.refAsc1 : (p.instrumentAscending !== undefined ? p.instrumentAscending : p.instrumentValue);
                 const rawD1 = p.refDesc1 !== undefined ? p.refDesc1 : (p.instrumentDescending !== undefined ? p.instrumentDescending : (p.standardValue !== undefined ? p.standardValue : p.instrumentValue));
                 const rawA2 = p.refAsc2;
                 const rawD2 = p.refDesc2;

                 const a1 = (rawA1 !== '' && rawA1 !== undefined && rawA1 !== null) ? Number(rawA1) : null;
                 const d1 = (rawD1 !== '' && rawD1 !== undefined && rawD1 !== null) ? Number(rawD1) : null;
                 const a2 = (rawA2 !== '' && rawA2 !== undefined && rawA2 !== null) ? Number(rawA2) : null;
                 const d2 = (rawD2 !== '' && rawD2 !== undefined && rawD2 !== null) ? Number(rawD2) : null;

                 const validVals = [a1, d1, a2, d2].filter((v): v is number => v !== null && !isNaN(v));
                 const count = validVals.length;
                 const sum = validVals.reduce((acc, curr) => acc + curr, 0);
                 const avg = count > 0 ? sum / count : 0;
                 const absErr = count > 0 ? Math.abs(nominal - avg) : (p.error !== undefined ? Math.abs(p.error) : 0);
                 let normalizedAbsErr = absErr;
                 if (inst?.typeSpec === 'manovacuometro' && nominal < 0) {
                    const minVal = inst?.rangeMin || 0;
                    if (minVal <= -700) normalizedAbsErr = absErr / 760;
                    else if (minVal <= -25) normalizedAbsErr = absErr / 29.92;
                 }
                 if (count > 0 && normalizedAbsErr > maxAbsError) {
                    maxAbsError = normalizedAbsErr;
                 }
                 const err = count > 0 ? Number((nominal - avg).toFixed(2)) : (p.error !== undefined ? p.error : 0);
                 
                 // Histerese Metrológica (Diferença entre descida e subida no mesmo ciclo)
                 let localHyst = 0;
                 if (a1 !== null && d1 !== null) {
                    let hyst1 = Math.abs(d1 - a1);
                    let normalizedHyst1 = hyst1;
                    if (inst?.typeSpec === 'manovacuometro' && nominal < 0) {
                       const minVal = inst?.rangeMin || 0;
                       if (minVal <= -700) normalizedHyst1 = hyst1 / 760;
                       else if (minVal <= -25) normalizedHyst1 = hyst1 / 29.92;
                    }
                    if (normalizedHyst1 > maxHysteresis) maxHysteresis = normalizedHyst1;
                    localHyst = Math.max(localHyst, hyst1);
                 } else if (p.hysteresis !== undefined) {
                    localHyst = p.hysteresis;
                    if (p.hysteresis > maxHysteresis) maxHysteresis = p.hysteresis;
                 }
                 if (a2 !== null && d2 !== null) {
                    let hyst2 = Math.abs(d2 - a2);
                    let normalizedHyst2 = hyst2;
                    if (inst?.typeSpec === 'manovacuometro' && nominal < 0) {
                       const minVal = inst?.rangeMin || 0;
                       if (minVal <= -700) normalizedHyst2 = hyst2 / 760;
                       else if (minVal <= -25) normalizedHyst2 = hyst2 / 29.92;
                    }
                    if (normalizedHyst2 > maxHysteresis) maxHysteresis = normalizedHyst2;
                    localHyst = Math.max(localHyst, hyst2);
                 }

                 // Repetitividade Metrológica (Diferença entre medições no mesmo sentido entre ciclos)
                 if (a1 !== null && a2 !== null) {
                    const repAsc = Math.abs(a2 - a1);
                    if (repAsc > maxRepeatability) maxRepeatability = repAsc;
                 }
                 if (d1 !== null && d2 !== null) {
                    const repDesc = Math.abs(d2 - d1);
                    if (repDesc > maxRepeatability) maxRepeatability = repDesc;
                 }

                 // Incerteza Expandida
                 let uA = 0;
                 if (count > 1) {
                   const variance = validVals.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / (count - 1);
                   uA = Math.sqrt(variance) / Math.sqrt(count);
                 }

                 const decimals = String(nominal).includes('.') ? String(nominal).split('.')[1].length : 2;
                 const res = Math.pow(10, -Math.max(1, Math.min(decimals, 3)));
                 const uB_res = (res / 2) / Math.sqrt(3);

                 const uB_hist = localHyst / (2 * Math.sqrt(3));

                 const stdErrorOrMpe = mpeVal > 0 ? ((mpeVal * span / 100) / 4) : (span * 0.0025);
                 const uB_std = stdErrorOrMpe / 2;

                 const uc = Math.sqrt(Math.pow(uA, 2) + Math.pow(uB_res, 2) + Math.pow(uB_hist, 2) + Math.pow(uB_std, 2));
                 const expandedUncertainty = count > 0 ? Number((uc * 2.00).toFixed(2)) : 0.05;

                 return { nominal, avg, err, a1: a1 ?? 0, d1: d1 ?? 0, a2: a2 ?? 0, d2: d2 ?? 0, count, expandedUncertainty, refAsc1: p.refAsc1, refDesc1: p.refDesc1, refAsc2: p.refAsc2, refDesc2: p.refDesc2 };
              });
              
              const classPct = span > 0 ? (maxAbsError / span) * 100 : 0;
              const hysteresisPct = span > 0 ? (maxHysteresis / span) * 100 : 0;
              const repPct = span > 0 ? (maxRepeatability / span) * 100 : 0;

              return (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="border-b border-slate-300 pb-2">
                    <div className="flex items-start justify-between gap-4">
                      {customLogo ? (
                        <img src={customLogo} alt="Logo" className="h-16 object-contain" />
                      ) : (
                        <ComaninsLogo size={180} />
                      )}
                      <div className="flex-1 text-center mt-2">
                        <h1 className="font-bold text-sm text-slate-900 leading-tight">
                          Laboratório de Calibração Rastreada de acordo com a ABNT NBR ISO/ IEC 17025
                        </h1>
                        <h2 className="font-bold text-lg text-slate-900 mt-1 uppercase">CERTIFICADO DE CALIBRAÇÃO Nº {certNumber}</h2>
                        <p className="text-[10px] font-bold mt-1 font-mono text-slate-800">
                          Chave de Autenticidade (QRCode): <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 font-extrabold text-blue-900 tracking-wider select-all">{certAuthKey}</span>
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <div className="p-1 bg-white border border-slate-300 rounded shadow-xs inline-block">
                          <QRCodeSVG value={`https://www.comanins.com.br?chave=${certAuthKey}`} size={56} level="M" />
                        </div>
                        <p className="text-[8px] font-mono font-bold text-slate-700 mt-0.5">www.comanins.com.br</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">Pág. 1/1</p>
                      </div>
                    </div>
                    <div className="text-center mt-2 text-[8px] text-slate-500">
                      Rua A3, N° 09, Poloplast, Camaçari-BA - CEP: 42801-581 - Fone: (71) 3621-0311 - comercial@comanins.com.br
                    </div>
                  </div>

                  <div className="space-y-4 text-[11px] leading-relaxed">
                    <div>
                      <p className="font-bold text-sm uppercase mb-1">1. Cliente:</p>
                      <div className="pl-4">
                        <p><span className="font-bold">Nome:</span> {client?.name || 'Cliente Padrão'}</p>
                        <p><span className="font-bold">Endereço:</span> {client?.city || 'Endereço não informado'}</p>
                        <p><span className="font-bold">Contato:</span> {client?.phone || 'Não informado'} / {client?.email}</p>
                      </div>
                    </div>

                    <div>
                      <p className="font-bold text-sm uppercase mb-1">2. Instrumento Calibrado:</p>
                      <div className="pl-4 grid grid-cols-2 gap-1">
                        <p><span className="font-bold">Descrição:</span> {inst?.description}</p>
                        <p><span className="font-bold">TAG do Cliente:</span> {fsTag || inst?.tag || '—'}</p>
                        {fsEquip && <p><span className="font-bold">Equipamento:</span> {fsEquip}</p>}
                        <p><span className="font-bold">Marca:</span> {inst?.brand || 'Não Consta'}</p>
                        <p><span className="font-bold">Modelo:</span> {inst?.model || 'Não Consta'}</p>
                        <p><span className="font-bold">Nº Série:</span> {inst?.serialNumber || 'NAO CONSTA'}</p>
                        <p><span className="font-bold">Tipo:</span> ANALOGICO</p>
                        <p><span className="font-bold">Faixa:</span> {inst?.rangeMin} {inst?.typeSpec === 'manovacuometro' || (inst?.description || '').toLowerCase().includes('manovacu') ? (inst?.unitNegative || 'mmHg') : ''} a {inst?.rangeMax} {inst?.unit}</p>
                        <p><span className="font-bold">Tolerância (MPE):</span> ±{inst?.mpe} {inst?.unit}</p>
                      </div>
                    </div>

                    <div>
                      <p className="font-bold text-sm uppercase mb-1">3. Identificação da Calibração:</p>
                      <div className="pl-4 grid grid-cols-3 gap-1">
                        <p><span className="font-bold">Data de recebimento:</span> {(() => {
                          const raw = inst?.dataEntrada || (inst as any)?.dateOfIntake || (inst as any)?.dataDaEntrada;
                          if (!raw) return 'Não informada';
                          if (raw.includes('-')) {
                            const p = raw.split('-');
                            if (p.length === 3 && p[0].length === 4) return `${p[2]}/${p[1]}/${p[0]}`;
                          }
                          return raw;
                        })()}</p>
                        <p><span className="font-bold">Data de calibração:</span> {(() => {
                          const raw = selectedReport?.date || (inst as any)?.calibrationDate || inst?.lastCalibrationDate;
                          if (!raw) return new Date().toLocaleDateString('pt-BR');
                          if (raw.includes('-')) {
                            const p = raw.split('-');
                            if (p.length === 3 && p[0].length === 4) return `${p[2]}/${p[1]}/${p[0]}`;
                          }
                          return raw;
                        })()}</p>
                        <p><span className="font-bold">Data de emissão:</span> {new Date().toLocaleDateString('pt-BR')}</p>
                      </div>
                      <p className="pl-4 mt-1"><span className="font-bold">Local de calibração:</span> Instalação Permanente do Laboratório Comanins</p>
                    </div>

                    <div>
                      <p className="font-bold text-sm uppercase mb-1">4. Condições Ambientais:</p>
                      <div className="pl-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="font-bold text-center">Temperatura Ambiente</p>
                            <p className="text-center">20ºC ± 5ºC</p>
                          </div>
                          <div>
                            <p className="font-bold text-center">Umidade Relativa do Ar</p>
                            <p className="text-center">50% ± 10%</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="font-bold text-sm uppercase mb-1">5. Resumo do Método de Calibração:</p>
                      <div className="pl-4">
                        <p><span className="font-bold">Método de Calibração:</span> conforme procedimento PR-001-2017 Rev. 4</p>
                        <p><span className="font-bold">Descrição do Método:</span> A Calibração foi realizada conforme procedimento PR-001-2017 Rev. 4 comparando-se o instrumento com o padrão listado no item 7. A série de medições estão definidas nas tabelas de valores encontrados.</p>
                      </div>
                    </div>

                    <div>
                      <p className="font-bold text-sm uppercase mb-1">6. Comentários:</p>
                      <p className="pl-4 text-justify">
                        {selectedReport?.observations || (inst as any)?.calibrationObs || 'A reprodução deste documento somente poderá ser feita integralmente. Os resultados apresentados referem-se exclusivamente ao equipamento em questão.'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="font-bold text-sm uppercase mb-1">7. Equipamentos Auxiliares e Padrões:</p>
                      <div className="pl-4 space-y-0.5 font-mono text-[10px]">
                        {selectedReport?.referenceStandards && selectedReport.referenceStandards.length > 0 ? (
                          selectedReport.referenceStandards.map((std: any, idx: number) => (
                            <p key={std.id || idx}>
                              <span className="font-bold">Padrão {String.fromCharCode(65 + idx)}:</span> {std.identification ? `[${std.identification}] ` : ''}Certificado Nº {std.certificateNumber} - Tipo: {std.instrumentType} - Faixa: {std.range || '—'} - Validade: {formatDateBR(std.expirationDate)} - Lab RBC: {std.rbcLab}
                            </p>
                          ))
                        ) : (
                          <p className="text-slate-500 italic">Padrões de referência rastreados RBC/Inmetro utilizados conforme PR-001-2017.</p>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-300">
                      <p className="font-bold text-sm uppercase mb-2">8. Valores Encontrados:</p>
                      <table className="w-full text-center border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-slate-100 font-bold border border-slate-300">
                            <th className="p-1 border border-slate-300" rowSpan={2}>VI<br/>(Nominal)</th>
                            <th className="p-1 border border-slate-300" colSpan={2}>VRef Primeiro Ciclo</th>
                            <th className="p-1 border border-slate-300" colSpan={2}>VRef Segundo Ciclo</th>
                            <th className="p-1 border border-slate-300" rowSpan={2}>VRef Média<br/>de Leituras</th>
                            <th className="p-1 border border-slate-300" rowSpan={2}>Erro</th>
                            <th className="p-1 border border-slate-300" rowSpan={2}>Unidade<br/>de Medida</th>
                          </tr>
                          <tr className="bg-slate-100 font-bold border border-slate-300">
                            <th className="p-1 border border-slate-300">Crescente</th>
                            <th className="p-1 border border-slate-300">Decrescente</th>
                            <th className="p-1 border border-slate-300">Crescente</th>
                            <th className="p-1 border border-slate-300">Decrescente</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formattedPoints.map((p: any, idx: number) => (
                            <tr key={idx}>
                              <td className="p-1 border border-slate-300 font-bold">{p.nominal}</td>
                              <td className="p-1 border border-slate-300">{p.refAsc1 !== undefined ? p.refAsc1 : (p.a1 !== 0 ? p.a1 : '-')}</td>
                              <td className="p-1 border border-slate-300">{p.refDesc1 !== undefined ? p.refDesc1 : (p.d1 !== 0 ? p.d1 : '-')}</td>
                              <td className="p-1 border border-slate-300">{p.refAsc2 !== undefined ? p.refAsc2 : (p.a2 !== 0 ? p.a2 : '-')}</td>
                              <td className="p-1 border border-slate-300">{p.refDesc2 !== undefined ? p.refDesc2 : (p.d2 !== 0 ? p.d2 : '-')}</td>
                              <td className="p-1 border border-slate-300">{p.count > 0 ? p.avg.toFixed(2) : '-'}</td>
                              <td className="p-1 border border-slate-300">{p.count > 0 ? (p.err > 0 ? `+${p.err}` : p.err) : '-'}</td>
                              <td className="p-1 border border-slate-300">
                                {(inst?.typeSpec === 'manovacuometro' || (inst?.description || '').toLowerCase().includes('manovacu')) && p.nominal < 0
                                  ? (inst?.unitNegative || (inst?.rangeMin && inst.rangeMin <= -700 ? 'mmHg' : inst?.rangeMin && inst.rangeMin <= -25 ? 'inHg' : inst?.unit || 'mmHg'))
                                  : inst?.unit}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      <div className="mt-4 font-bold text-[10px]">
                        <p>Índice de Classe (%): {classPct.toFixed(2)}</p>
                        <p>Repetitividade (%): {repPct.toFixed(3)}</p>
                        <p>Histerese (%): {hysteresisPct.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="mt-16 grid grid-cols-2 gap-8 px-12">
                      <div className="text-center border-t border-slate-400 pt-2">
                        <p className="font-bold">Técnico Executante</p>
                      </div>
                      <div className="text-center border-t border-slate-400 pt-2">
                        <p className="font-bold">Responsável Técnico</p>
                      </div>
                    </div>
                    
                    <div className="text-center text-[8px] text-slate-400 mt-8">
                      Este documento foi produzido e assinado eletronicamente no Portal COMANINS.
                    </div>

                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
}
