import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  FileText,
  Gauge,
  PackageCheck,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  Truck,
  Wrench,
  X,
} from 'lucide-react';
import type {
  Client,
  RentalAsset,
  RentalContract,
  RentalContractItem,
  RentalInvoice,
  RentalMovement,
  RentalReturnCondition,
  RentalService,
  RentalSettings,
} from '../types';
import type { PortalUser } from '../lib/firebase';
import {
  createRentalContract,
  dispatchRentalContract,
  generateRentalInvoice,
  returnRentalItems,
  saveRentalAsset,
  saveRentalService,
  saveRentalSettings,
  syncRentalAssets,
  syncRentalContracts,
  syncRentalInvoices,
  syncRentalMovements,
  syncRentalServices,
  syncRentalSettings,
} from '../lib/firebase';

interface RentalManagementProps {
  clients: Client[];
  currentUser?: PortalUser | { id?: string; name?: string; username?: string; [key: string]: any } | null;
  canEdit: boolean;
  companyData?: Record<string, any>;
}

type RentalTab = 'locacoes' | 'equipamentos' | 'servicos' | 'faturas' | 'configuracoes';
type PrintDocument =
  | { kind: 'invoice'; invoice: RentalInvoice; rental?: RentalContract }
  | { kind: 'movement'; movement: RentalMovement; rental?: RentalContract }
  | null;

const DEFAULT_SETTINGS: RentalSettings = {
  rentalPrefix: 'LOC-',
  nextRentalNumber: 1,
  invoicePrefix: '',
  nextInvoiceNumber: undefined,
  cnaeCode: '7739-0/99',
  cnaeDescription: 'Atividade de aluguel de outras máquinas e equipamentos comerciais e industriais não especificados anteriormente, sem operador.',
  paymentMethod: 'DEPÓSITO BANCÁRIO',
  bankInstructions: 'AG. 1051, C/C PJ-2081-3, CAIXA ECONOMICA FEDERAL.',
  taxNotes: 'ISS: Não aplicável – Locação de bem móvel (CNAE 7739-0/99)\nRegime Tributário: Simples Nacional',
  notificationRecipients: ['comercial@comanins.com.br', 'financeiro@comanins.com.br'],
  notificationDaysBefore: 3,
};

const todayIso = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const dateFromIso = (value: string) => {
  const [year, month, day] = String(value || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
};

const addDaysIso = (value: string, days: number) => {
  const date = dateFromIso(value);
  if (!date) return '';
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const formatDate = (value?: string) => {
  const date = dateFromIso(String(value || '').slice(0, 10));
  if (!date) return '-';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(date);
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const nextDueDate = (rental: RentalContract, reference = todayIso()) => {
  const first = dateFromIso(rental.firstDueDate);
  const ref = dateFromIso(reference);
  if (!first || !ref) return rental.firstDueDate;
  const diffDays = Math.floor((ref.getTime() - first.getTime()) / 86_400_000);
  if (diffDays <= 0) return rental.firstDueDate;
  const cycleIndex = Math.ceil(diffDays / 30);
  return addDaysIso(rental.firstDueDate, cycleIndex * 30);
};

const rangeText = (asset: RentalAsset) => {
  if (asset.rangeMin === undefined || asset.rangeMax === undefined || !asset.unit) return '';
  return `${asset.rangeMin} a ${asset.rangeMax} ${asset.unit}`;
};

const activeRentalItems = (rental: RentalContract) => rental.items.filter((item) => !item.returnedAt);

const nextUninvoicedCycle = (rental: RentalContract, invoices: RentalInvoice[]) => {
  const occupied = new Set(
    invoices
      .filter((invoice) => invoice.rentalId === rental.id && invoice.status !== 'cancelada')
      .map((invoice) => Number(invoice.cycleIndex))
      .filter(Number.isFinite),
  );
  let cycleIndex = 0;
  while (occupied.has(cycleIndex) && cycleIndex < 600) cycleIndex += 1;
  if (cycleIndex >= 600) return null;
  const periodStart = addDaysIso(rental.startDate, cycleIndex * 30);
  const periodEnd = addDaysIso(periodStart, 29);
  if (!periodStart || !periodEnd) return null;
  // Uma renovação só pode ser faturada quando o respectivo ciclo já começou.
  // Isso impede cliques repetidos de criarem faturas de meses futuros.
  if (periodStart > todayIso()) return null;
  const billable = rental.items.some((item) => {
    const dispatchedAt = String(item.dispatchedAt || rental.dispatchAt || rental.startDate).slice(0, 10);
    const returnedAt = String(item.returnedAt || '').slice(0, 10);
    return !!dispatchedAt && dispatchedAt <= periodEnd && (!returnedAt || returnedAt >= periodStart);
  });
  return billable ? { cycleIndex, periodStart, periodEnd } : null;
};

const normalizeText = (value: unknown) => String(value || '').trim().toLowerCase();

export default function RentalManagement({ clients, currentUser, canEdit, companyData = {} }: RentalManagementProps) {
  const [activeTab, setActiveTab] = useState<RentalTab>('locacoes');
  const [services, setServices] = useState<RentalService[]>([]);
  const [assets, setAssets] = useState<RentalAsset[]>([]);
  const [rentals, setRentals] = useState<RentalContract[]>([]);
  const [invoices, setInvoices] = useState<RentalInvoice[]>([]);
  const [movements, setMovements] = useState<RentalMovement[]>([]);
  const [settings, setSettings] = useState<RentalSettings>(DEFAULT_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [printDocument, setPrintDocument] = useState<PrintDocument>(null);

  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceDraft, setServiceDraft] = useState<Partial<RentalService>>({ active: true, monthlyPrice: 0 });
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [assetDraft, setAssetDraft] = useState<Partial<RentalAsset>>({ description: 'Manômetro com base', status: 'disponivel' });
  const [showRentalForm, setShowRentalForm] = useState(false);
  const [rentalDraft, setRentalDraft] = useState({
    clientId: '',
    startDate: todayIso(),
    firstDueDate: addDaysIso(todayIso(), 30),
    quotationRefs: '',
    purchaseOrder: '',
    processNumber: '',
    project: '',
    responsibles: '',
    paymentMethod: '',
    billingNotes: '',
  });
  const [rentalItemDrafts, setRentalItemDrafts] = useState<Array<{ assetId: string; serviceId: string }>>([]);

  const [dispatchTarget, setDispatchTarget] = useState<RentalContract | null>(null);
  const [dispatchForm, setDispatchForm] = useState({ responsibleClient: '', responsibleClientDocument: '', notes: '', date: todayIso() });
  const [returnTarget, setReturnTarget] = useState<RentalContract | null>(null);
  const [returnForm, setReturnForm] = useState({ responsibleClient: '', responsibleClientDocument: '', notes: '', date: todayIso() });
  const [returnItems, setReturnItems] = useState<Record<string, { selected: boolean; condition: RentalReturnCondition; notes: string }>>({});
  const [settingsDraft, setSettingsDraft] = useState<RentalSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const unsubs = [
      syncRentalServices(setServices),
      syncRentalAssets(setAssets),
      syncRentalContracts(setRentals),
      syncRentalInvoices(setInvoices),
      syncRentalMovements(setMovements),
      syncRentalSettings((value) => {
        const merged = { ...DEFAULT_SETTINGS, ...(value || {}) } as RentalSettings;
        setSettings(merged);
        setSettingsDraft(merged);
      }),
    ];
    return () => unsubs.forEach((unsubscribe) => unsubscribe?.());
  }, []);

  const activeServices = useMemo(() => services.filter((service) => service.active !== false), [services]);
  const availableAssets = useMemo(() => assets.filter((asset) => {
    if (asset.status !== 'disponivel') return false;
    const due = String(asset.calibrationDueDate || '').slice(0, 10);
    return !due || due >= todayIso();
  }), [assets]);

  const filteredRentals = useMemo(() => {
    const term = normalizeText(search);
    return rentals.filter((rental) => {
      if (!term) return true;
      return [rental.rentalNumber, rental.clientName, rental.clientCnpj, rental.purchaseOrder, rental.project]
        .some((value) => normalizeText(value).includes(term));
    });
  }, [rentals, search]);

  const rentalMonthlyTotal = (rental: RentalContract) =>
    activeRentalItems(rental).reduce((sum, item) => sum + Number(item.monthlyPrice || 0), 0);

  const clearMessages = () => {
    setNotice('');
    setError('');
  };

  const ensureEditable = () => {
    if (canEdit) return true;
    setError('Seu perfil possui somente permissão de visualização no módulo Locação de Instrumentos.');
    return false;
  };

  const saveService = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();
    if (!ensureEditable()) return;
    if (!String(serviceDraft.name || '').trim() || Number(serviceDraft.monthlyPrice || 0) <= 0) {
      setError('Informe o nome do serviço e um valor mensal maior que zero.');
      return;
    }
    setBusy(true);
    try {
      await saveRentalService({
        ...serviceDraft,
        name: String(serviceDraft.name || '').trim(),
        description: String(serviceDraft.description || '').trim(),
        monthlyPrice: Number(serviceDraft.monthlyPrice || 0),
        cnaeCode: serviceDraft.cnaeCode || settings.cnaeCode,
        cnaeDescription: serviceDraft.cnaeDescription || settings.cnaeDescription,
      });
      setNotice(serviceDraft.id ? 'Serviço mensal atualizado.' : 'Serviço mensal cadastrado.');
      setServiceDraft({ active: true, monthlyPrice: 0 });
      setShowServiceForm(false);
    } catch (e: any) {
      setError(e?.message || 'Não foi possível salvar o serviço.');
    } finally {
      setBusy(false);
    }
  };

  const saveAsset = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();
    if (!ensureEditable()) return;
    if (!String(assetDraft.assetCode || '').trim()) {
      setError('Informe a identificação/COMA do equipamento locável.');
      return;
    }
    if (assets.some((asset) => normalizeText(asset.assetCode) === normalizeText(assetDraft.assetCode) && asset.id !== assetDraft.id)) {
      setError('Já existe um equipamento locável com esta identificação/COMA.');
      return;
    }
    setBusy(true);
    try {
      await saveRentalAsset({ ...assetDraft, assetCode: String(assetDraft.assetCode || '').trim() });
      setNotice(assetDraft.id ? 'Equipamento locável atualizado.' : 'Equipamento locável cadastrado.');
      setAssetDraft({ description: 'Manômetro com base', status: 'disponivel' });
      setShowAssetForm(false);
    } catch (e: any) {
      setError(e?.message || 'Não foi possível salvar o equipamento.');
    } finally {
      setBusy(false);
    }
  };

  const toggleRentalAsset = (asset: RentalAsset) => {
    if (!ensureEditable()) return;
    setRentalItemDrafts((current) => {
      const existing = current.find((item) => item.assetId === asset.id);
      if (existing) return current.filter((item) => item.assetId !== asset.id);
      const serviceId = asset.defaultServiceId && activeServices.some((service) => service.id === asset.defaultServiceId)
        ? asset.defaultServiceId
        : activeServices[0]?.id || '';
      return [...current, { assetId: asset.id, serviceId }];
    });
  };

  const saveRental = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();
    if (!ensureEditable()) return;
    if (!rentalDraft.clientId || !rentalDraft.startDate || !rentalDraft.firstDueDate || rentalItemDrafts.length === 0) {
      setError('Selecione o cliente, as datas e ao menos um equipamento locável.');
      return;
    }
    if (rentalItemDrafts.some((item) => !item.serviceId)) {
      setError('Selecione o serviço mensal de cada equipamento.');
      return;
    }
    setBusy(true);
    try {
      const rental = await createRentalContract({ ...rentalDraft, items: rentalItemDrafts });
      setNotice(`Locação ${rental.rentalNumber} cadastrada. Registre a saída para iniciar o empréstimo mensal.`);
      setRentalDraft({
        clientId: '', startDate: todayIso(), firstDueDate: addDaysIso(todayIso(), 30), quotationRefs: '', purchaseOrder: '',
        processNumber: '', project: '', responsibles: '', paymentMethod: '', billingNotes: '',
      });
      setRentalItemDrafts([]);
      setShowRentalForm(false);
    } catch (e: any) {
      setError(e?.message || 'Não foi possível cadastrar a locação.');
    } finally {
      setBusy(false);
    }
  };

  const registerDispatch = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();
    if (!dispatchTarget || !ensureEditable()) return;
    if (!dispatchForm.responsibleClient.trim()) {
      setError('Informe quem recebeu o material no cliente.');
      return;
    }
    setBusy(true);
    try {
      const result = await dispatchRentalContract(dispatchTarget.id, dispatchForm);
      setNotice(`Saída da locação ${dispatchTarget.rentalNumber} registrada. Os equipamentos foram marcados como locados.`);
      setDispatchTarget(null);
      setPrintDocument({ kind: 'movement', movement: result.movement, rental: result.rental });
    } catch (e: any) {
      setError(e?.message || 'Não foi possível registrar a saída.');
    } finally {
      setBusy(false);
    }
  };

  const openReturn = (rental: RentalContract) => {
    if (!ensureEditable()) return;
    const items: Record<string, { selected: boolean; condition: RentalReturnCondition; notes: string }> = {};
    activeRentalItems(rental).forEach((item) => {
      items[item.assetId] = { selected: true, condition: 'conforme', notes: '' };
    });
    setReturnItems(items);
    setReturnForm({ responsibleClient: '', responsibleClientDocument: '', notes: '', date: todayIso() });
    setReturnTarget(rental);
  };

  const registerReturn = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();
    if (!returnTarget || !ensureEditable()) return;
    const selected = Object.entries(returnItems)
      .filter(([, value]) => value.selected)
      .map(([assetId, value]) => ({ assetId, condition: value.condition, notes: value.notes }));
    if (selected.length === 0 || !returnForm.responsibleClient.trim()) {
      setError('Selecione ao menos um item e informe quem realizou a devolução.');
      return;
    }
    setBusy(true);
    try {
      const result = await returnRentalItems(returnTarget.id, { ...returnForm, items: selected });
      setNotice(result.rental.status === 'encerrado'
        ? `Locação ${result.rental.rentalNumber} encerrada com todos os itens recebidos.`
        : `Devolução parcial da locação ${result.rental.rentalNumber} registrada.`);
      setReturnTarget(null);
      setPrintDocument({ kind: 'movement', movement: result.movement, rental: result.rental });
    } catch (e: any) {
      setError(e?.message || 'Não foi possível registrar a devolução.');
    } finally {
      setBusy(false);
    }
  };

  const issueInvoice = async (rental: RentalContract) => {
    clearMessages();
    if (!ensureEditable()) return;
    setBusy(true);
    try {
      const result = await generateRentalInvoice(rental.id);
      setNotice(`Fatura ${result.invoice.invoiceNumber} emitida e integrada ao Contas a Receber.`);
      setPrintDocument({ kind: 'invoice', invoice: result.invoice, rental });
    } catch (e: any) {
      setError(e?.message || 'Não foi possível gerar a fatura.');
    } finally {
      setBusy(false);
    }
  };

  const submitSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();
    if (!ensureEditable()) return;
    if (!settingsDraft.nextInvoiceNumber || settingsDraft.nextInvoiceNumber < 1) {
      setError('Informe o próximo número de fatura válido. Use o número imediatamente posterior à última fatura já emitida.');
      return;
    }
    setBusy(true);
    try {
      const saved = await saveRentalSettings(settingsDraft);
      setSettings(saved);
      setSettingsDraft(saved);
      setNotice('Configurações de faturamento da locação atualizadas.');
    } catch (e: any) {
      setError(e?.message || 'Não foi possível salvar as configurações.');
    } finally {
      setBusy(false);
    }
  };

  const findRental = (id: string) => rentals.find((rental) => rental.id === id);
  const logoUrl = String(localStorage.getItem('comanins_header_logo') || '/COMANINS 2026_logo_horizontal_transparente.png');

  const printNow = () => setTimeout(() => window.print(), 80);

  return (
    <div className="space-y-5">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #rental-print-root, #rental-print-root * { visibility: visible !important; }
          #rental-print-root { position: absolute !important; left: 0; top: 0; width: 100%; background: #fff; padding: 0 !important; margin: 0 !important; }
          .rental-no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Locação de Instrumentos</h2>
          <p className="text-sm text-slate-600 mt-1">Empréstimo mensal de manômetros com base. Ciclo fixo de 30 dias, sem cobrança diária ou pró-rata.</p>
        </div>
        {!canEdit && <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">Modo somente leitura</span>}
      </div>

      {(notice || error) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          {error || notice}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">
        {([
          ['locacoes', 'Locações', Truck],
          ['equipamentos', 'Equipamentos Locáveis', Gauge],
          ['servicos', 'Serviços Mensais', CircleDollarSign],
          ['faturas', 'Faturas', FileText],
          ['configuracoes', 'Configurações', Settings],
        ] as Array<[RentalTab, string, React.ComponentType<{ className?: string }>]>)
          .map(([id, label, Icon]) => (
            <button key={id} onClick={() => { setActiveTab(id); clearMessages(); }} className={`shrink-0 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${activeTab === id ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
      </div>

      {activeTab === 'locacoes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Buscar por locação, cliente, CNPJ, PC ou obra..." />
            </div>
            {canEdit && <button onClick={() => { setShowRentalForm(true); clearMessages(); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> Nova Locação</button>}
          </div>

          {filteredRentals.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">Nenhuma locação cadastrada.</div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredRentals.map((rental) => {
                const activeItems = activeRentalItems(rental);
                const due = nextDueDate(rental);
                const pendingCycle = nextUninvoicedCycle(rental, invoices);
                const canGenerateInvoice = canEdit && ['ativo', 'encerrado'].includes(rental.status) && !!pendingCycle;
                const dispatchMovement = movements.find((movement) => movement.rentalId === rental.id && movement.type === 'saida');
                const lastReturn = movements.find((movement) => movement.rentalId === rental.id && movement.type === 'devolucao');
                return (
                  <div key={rental.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded">{rental.rentalNumber}</span>
                          <span className={`text-[10px] uppercase font-black px-2 py-1 rounded-full ${rental.status === 'ativo' ? 'bg-emerald-50 text-emerald-700' : rental.status === 'encerrado' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{rental.status}</span>
                        </div>
                        <h3 className="font-extrabold text-slate-900 mt-2">{rental.clientName}</h3>
                        <p className="text-xs text-slate-500">{rental.clientCnpj}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Mensal atual</p>
                        <p className="text-lg font-black text-slate-900">{formatCurrency(rentalMonthlyTotal(rental))}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div><span className="block text-slate-400 font-bold">Início</span>{formatDate(rental.startDate)}</div>
                      <div><span className="block text-slate-400 font-bold">Próx. vencimento</span>{formatDate(due)}</div>
                      <div><span className="block text-slate-400 font-bold">Ativos</span>{activeItems.length} item(ns)</div>
                      <div><span className="block text-slate-400 font-bold">Ciclo</span>30 dias fixos</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
                      {rental.items.map((item) => (
                        <div key={item.assetId} className="flex justify-between gap-3 text-xs">
                          <div><b>{item.assetCode}</b> — {item.description}{item.baseIdentification ? ` / Base ${item.baseIdentification}` : ''}</div>
                          <div className="text-right shrink-0"><span className={item.returnedAt ? 'text-slate-400 line-through' : 'text-slate-800 font-bold'}>{formatCurrency(item.monthlyPrice)}</span>{item.returnedAt && <div className="text-[9px] text-slate-400">devolvido {formatDate(item.returnedAt)}</div>}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {rental.status === 'rascunho' && canEdit && <button onClick={() => { setDispatchTarget(rental); setDispatchForm({ responsibleClient: '', responsibleClientDocument: '', notes: '', date: todayIso() }); }} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Registrar Saída</button>}
                      {canGenerateInvoice && <button onClick={() => void issueInvoice(rental)} disabled={busy} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50"><FileText className="w-3.5 h-3.5" /> {rental.status === 'encerrado' ? 'Gerar Fatura Pendente' : 'Gerar Próxima Fatura'}</button>}
                      {rental.status === 'ativo' && canEdit && <button onClick={() => openReturn(rental)} className="px-3 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> Receber Devolução</button>}
                      {dispatchMovement && <button onClick={() => setPrintDocument({ kind: 'movement', movement: dispatchMovement, rental })} className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1"><Printer className="w-3.5 h-3.5" /> Comprovante Saída</button>}
                      {lastReturn && <button onClick={() => setPrintDocument({ kind: 'movement', movement: lastReturn, rental })} className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1"><PackageCheck className="w-3.5 h-3.5" /> Última Devolução</button>}
                    </div>
                    {(rental.purchaseOrder || rental.quotationRefs || rental.project) && <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-3">{rental.purchaseOrder && <span className="mr-3"><b>PC:</b> {rental.purchaseOrder}</span>}{rental.quotationRefs && <span className="mr-3"><b>Orçamento:</b> {rental.quotationRefs}</span>}{rental.project && <span><b>Obra:</b> {rental.project}</span>}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'equipamentos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center"><div><h3 className="font-extrabold text-slate-900">Equipamentos locáveis</h3><p className="text-xs text-slate-500">Cadastre cada conjunto físico de manômetro + base para rastrear saída, devolução e disponibilidade.</p></div>{canEdit && <button onClick={() => { setAssetDraft({ description: 'Manômetro com base', status: 'disponivel' }); setShowAssetForm(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex gap-1 items-center"><Plus className="w-4 h-4" /> Novo Equipamento</button>}</div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs"><thead className="bg-slate-50 text-slate-500 uppercase"><tr><th className="p-3 text-left">Identificação/COMA</th><th className="p-3 text-left">Descrição</th><th className="p-3 text-left">Faixa</th><th className="p-3 text-left">Base</th><th className="p-3 text-left">Calibração</th><th className="p-3 text-left">Status</th><th className="p-3"></th></tr></thead><tbody>{assets.map((asset) => {
              const calibrationExpired = !!asset.calibrationDueDate && asset.calibrationDueDate < todayIso();
              return <tr key={asset.id} className="border-t border-slate-100"><td className="p-3 font-mono font-bold">{asset.assetCode}</td><td className="p-3">{asset.description}<div className="text-[10px] text-slate-400">{[asset.brand, asset.model, asset.serialNumber].filter(Boolean).join(' • ')}</div></td><td className="p-3">{rangeText(asset) || '-'}</td><td className="p-3">{asset.baseIdentification || '-'}</td><td className="p-3">{asset.calibrationCertificateNumber || '-'}<div className={`text-[10px] ${calibrationExpired ? 'text-red-600 font-bold' : 'text-slate-400'}`}>{asset.calibrationDueDate ? `${calibrationExpired ? 'VENCIDA' : 'Validade'} ${formatDate(asset.calibrationDueDate)}` : 'Validade não informada'}</div></td><td className="p-3"><span className="px-2 py-1 rounded-full bg-slate-100 font-bold">{asset.status}</span></td><td className="p-3 text-right">{canEdit && asset.status !== 'locado' && <button onClick={() => { setAssetDraft(asset); setShowAssetForm(true); }} className="p-2 hover:bg-slate-100 rounded"><Pencil className="w-4 h-4" /></button>}</td></tr>;
            })}</tbody></table>
          </div>
        </div>
      )}

      {activeTab === 'servicos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center"><div><h3 className="font-extrabold text-slate-900">Serviços mensais de locação</h3><p className="text-xs text-slate-500">O preço é mensal por equipamento. O sistema não calcula diária.</p></div>{canEdit && <button onClick={() => { setServiceDraft({ active: true, monthlyPrice: 0 }); setShowServiceForm(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex gap-1 items-center"><Plus className="w-4 h-4" /> Novo Serviço</button>}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{services.map((service) => <div key={service.id} className={`bg-white rounded-xl border p-4 ${service.active ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}><div className="flex justify-between gap-2"><div><h4 className="font-bold text-slate-900">{service.name}</h4><p className="text-xs text-slate-500 mt-1">{service.description}</p></div>{canEdit && <button onClick={() => { setServiceDraft(service); setShowServiceForm(true); }} className="p-2 hover:bg-slate-100 rounded"><Pencil className="w-4 h-4" /></button>}</div><div className="mt-4 text-2xl font-black text-blue-700">{formatCurrency(service.monthlyPrice)}<span className="text-[10px] text-slate-400 font-bold"> / 30 dias</span></div><div className="mt-2 text-[10px] text-slate-400">CNAE {service.cnaeCode || settings.cnaeCode}</div></div>)}</div>
        </div>
      )}

      {activeTab === 'faturas' && (
        <div className="space-y-4">
          <div><h3 className="font-extrabold text-slate-900">Faturas de Locação</h3><p className="text-xs text-slate-500">Cada fatura corresponde a um ciclo integral de 30 dias e gera automaticamente um Contas a Receber.</p></div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto"><table className="w-full text-xs"><thead className="bg-slate-50 text-slate-500 uppercase"><tr><th className="p-3 text-left">Fatura</th><th className="p-3 text-left">Locação / Cliente</th><th className="p-3 text-left">Período</th><th className="p-3 text-left">Vencimento</th><th className="p-3 text-right">Valor</th><th className="p-3"></th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id} className="border-t border-slate-100"><td className="p-3 font-mono font-black">{invoice.invoiceNumber}</td><td className="p-3"><b>{invoice.rentalNumber}</b><div className="text-slate-500">{invoice.clientName}</div></td><td className="p-3">{formatDate(invoice.periodStart)} a {formatDate(invoice.periodEnd)}</td><td className="p-3">{formatDate(invoice.dueDate)}</td><td className="p-3 text-right font-black">{formatCurrency(invoice.total)}</td><td className="p-3 text-right"><button onClick={() => setPrintDocument({ kind: 'invoice', invoice, rental: findRental(invoice.rentalId) })} className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold inline-flex items-center gap-1"><Printer className="w-3.5 h-3.5" /> Fatura</button></td></tr>)}</tbody></table>{invoices.length === 0 && <div className="p-8 text-center text-slate-500 text-sm">Nenhuma fatura de locação emitida.</div>}</div>
        </div>
      )}

      {activeTab === 'configuracoes' && (
        <form onSubmit={submitSettings} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5 max-w-4xl">
          <div><h3 className="font-extrabold text-slate-900">Configuração de faturamento</h3><p className="text-xs text-slate-500 mt-1">A numeração é controlada transacionalmente para impedir faturas duplicadas. Confirme o número imediatamente posterior à última fatura já utilizada.</p></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <label className="space-y-1"><span className="font-bold text-slate-600">Próximo nº da Fatura *</span><input type="number" min="1" disabled={!canEdit} value={settingsDraft.nextInvoiceNumber ?? ''} onChange={(e) => setSettingsDraft({ ...settingsDraft, nextInvoiceNumber: e.target.value ? Number(e.target.value) : undefined })} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="Ex.: 21436 se 21435 foi a última" /></label>
            <label className="space-y-1"><span className="font-bold text-slate-600">Prefixo da locação</span><input disabled={!canEdit} value={settingsDraft.rentalPrefix} onChange={(e) => setSettingsDraft({ ...settingsDraft, rentalPrefix: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></label>
            <label className="space-y-1"><span className="font-bold text-slate-600">CNAE</span><input disabled={!canEdit} value={settingsDraft.cnaeCode} onChange={(e) => setSettingsDraft({ ...settingsDraft, cnaeCode: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></label>
            <label className="space-y-1"><span className="font-bold text-slate-600">Condição de pagamento</span><input disabled={!canEdit} value={settingsDraft.paymentMethod} onChange={(e) => setSettingsDraft({ ...settingsDraft, paymentMethod: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></label>
            <label className="space-y-1 sm:col-span-2"><span className="font-bold text-slate-600">Descrição CNAE</span><textarea disabled={!canEdit} value={settingsDraft.cnaeDescription} onChange={(e) => setSettingsDraft({ ...settingsDraft, cnaeDescription: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-20" /></label>
            <label className="space-y-1 sm:col-span-2"><span className="font-bold text-slate-600">Dados bancários / Crédito em</span><textarea disabled={!canEdit} value={settingsDraft.bankInstructions} onChange={(e) => setSettingsDraft({ ...settingsDraft, bankInstructions: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-20" /></label>
            <label className="space-y-1 sm:col-span-2"><span className="font-bold text-slate-600">Observação tributária da fatura</span><textarea disabled={!canEdit} value={settingsDraft.taxNotes} onChange={(e) => setSettingsDraft({ ...settingsDraft, taxNotes: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-24" /></label>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-xs text-blue-900"><b>Notificação automática:</b> 3 dias antes de cada vencimento de 30 dias, o backend envia alerta para <b>comercial@comanins.com.br</b> e <b>financeiro@comanins.com.br</b>. A periodicidade e os destinatários operacionais são protegidos pelo sistema.</div>
          {canEdit && <button disabled={busy} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" /> Salvar Configurações</button>}
        </form>
      )}

      {showServiceForm && (
        <Modal title={serviceDraft.id ? 'Editar Serviço Mensal' : 'Novo Serviço Mensal'} onClose={() => setShowServiceForm(false)}>
          <form onSubmit={saveService} className="space-y-4 text-sm">
            <Field label="Nome do serviço *"><input required value={serviceDraft.name || ''} onChange={(e) => setServiceDraft({ ...serviceDraft, name: e.target.value })} className="input-rental" placeholder="Ex.: Locação mensal manômetro com base 0–10 bar" /></Field>
            <Field label="Descrição"><textarea value={serviceDraft.description || ''} onChange={(e) => setServiceDraft({ ...serviceDraft, description: e.target.value })} className="input-rental min-h-20" /></Field>
            <Field label="Valor mensal por equipamento *"><input required type="number" min="0.01" step="0.01" value={serviceDraft.monthlyPrice || ''} onChange={(e) => setServiceDraft({ ...serviceDraft, monthlyPrice: Number(e.target.value) })} className="input-rental" /></Field>
            <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={serviceDraft.active !== false} onChange={(e) => setServiceDraft({ ...serviceDraft, active: e.target.checked })} /> Serviço ativo</label>
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Periodicidade fixa: <b>30 dias</b>. Não existe valor diário nem rateio proporcional.</div>
            <button disabled={busy} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold disabled:opacity-50">Salvar Serviço</button>
          </form>
        </Modal>
      )}

      {showAssetForm && (
        <Modal title={assetDraft.id ? 'Editar Equipamento Locável' : 'Novo Equipamento Locável'} onClose={() => setShowAssetForm(false)} wide>
          <form onSubmit={saveAsset} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Field label="Identificação / COMA *"><input required value={assetDraft.assetCode || ''} onChange={(e) => setAssetDraft({ ...assetDraft, assetCode: e.target.value })} className="input-rental" /></Field>
            <Field label="Descrição"><input value={assetDraft.description || ''} onChange={(e) => setAssetDraft({ ...assetDraft, description: e.target.value })} className="input-rental" /></Field>
            <Field label="Marca"><input value={assetDraft.brand || ''} onChange={(e) => setAssetDraft({ ...assetDraft, brand: e.target.value })} className="input-rental" /></Field>
            <Field label="Modelo"><input value={assetDraft.model || ''} onChange={(e) => setAssetDraft({ ...assetDraft, model: e.target.value })} className="input-rental" /></Field>
            <Field label="Nº de Série"><input value={assetDraft.serialNumber || ''} onChange={(e) => setAssetDraft({ ...assetDraft, serialNumber: e.target.value })} className="input-rental" /></Field>
            <Field label="Identificação da Base"><input value={assetDraft.baseIdentification || ''} onChange={(e) => setAssetDraft({ ...assetDraft, baseIdentification: e.target.value })} className="input-rental" /></Field>
            <Field label="Faixa mínima"><input type="number" step="any" value={assetDraft.rangeMin ?? ''} onChange={(e) => setAssetDraft({ ...assetDraft, rangeMin: e.target.value === '' ? undefined : Number(e.target.value) })} className="input-rental" /></Field>
            <Field label="Faixa máxima"><input type="number" step="any" value={assetDraft.rangeMax ?? ''} onChange={(e) => setAssetDraft({ ...assetDraft, rangeMax: e.target.value === '' ? undefined : Number(e.target.value) })} className="input-rental" /></Field>
            <Field label="Unidade"><input value={assetDraft.unit || ''} onChange={(e) => setAssetDraft({ ...assetDraft, unit: e.target.value })} className="input-rental" placeholder="bar, kgf/cm²..." /></Field>
            <Field label="Serviço mensal padrão"><select value={assetDraft.defaultServiceId || ''} onChange={(e) => setAssetDraft({ ...assetDraft, defaultServiceId: e.target.value })} className="input-rental"><option value="">Selecione</option>{activeServices.map((service) => <option value={service.id} key={service.id}>{service.name} — {formatCurrency(service.monthlyPrice)}</option>)}</select></Field>
            <Field label="Certificado de calibração"><input value={assetDraft.calibrationCertificateNumber || ''} onChange={(e) => setAssetDraft({ ...assetDraft, calibrationCertificateNumber: e.target.value })} className="input-rental" /></Field>
            <Field label="Validade da calibração"><input type="date" value={assetDraft.calibrationDueDate || ''} onChange={(e) => setAssetDraft({ ...assetDraft, calibrationDueDate: e.target.value })} className="input-rental" /></Field>
            <Field label="Status"><select value={assetDraft.status || 'disponivel'} disabled={assetDraft.status === 'locado'} onChange={(e) => setAssetDraft({ ...assetDraft, status: e.target.value as RentalAsset['status'] })} className="input-rental"><option value="disponivel">Disponível</option><option value="manutencao">Manutenção</option><option value="inativo">Inativo</option>{assetDraft.status === 'locado' && <option value="locado">Locado</option>}</select></Field>
            <Field label="Observações"><textarea value={assetDraft.notes || ''} onChange={(e) => setAssetDraft({ ...assetDraft, notes: e.target.value })} className="input-rental min-h-20" /></Field>
            <button disabled={busy} className="sm:col-span-2 py-2.5 bg-blue-600 text-white rounded-lg font-bold disabled:opacity-50">Salvar Equipamento</button>
          </form>
        </Modal>
      )}

      {showRentalForm && (
        <Modal title="Nova Locação Mensal" onClose={() => setShowRentalForm(false)} extraWide>
          <form onSubmit={saveRental} className="space-y-5 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Cliente *"><select required value={rentalDraft.clientId} onChange={(e) => setRentalDraft({ ...rentalDraft, clientId: e.target.value })} className="input-rental"><option value="">Selecione da base de clientes</option>{[...clients].sort((a,b) => a.name.localeCompare(b.name)).map((client) => <option key={client.id} value={client.id}>{client.name} — {client.cnpj}</option>)}</select></Field>
              <Field label="Data inicial da locação *"><input type="date" required value={rentalDraft.startDate} onChange={(e) => setRentalDraft({ ...rentalDraft, startDate: e.target.value, firstDueDate: addDaysIso(e.target.value, 30) })} className="input-rental" /></Field>
              <Field label="Primeiro vencimento *"><input type="date" required value={rentalDraft.firstDueDate} onChange={(e) => setRentalDraft({ ...rentalDraft, firstDueDate: e.target.value })} className="input-rental" /></Field>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900"><CalendarClock className="w-4 h-4 inline mr-1" /> Cobrança exclusivamente mensal: cada ciclo possui <b>30 dias completos</b>. O sistema não calcula diária, fração ou pró-rata.</div>
            <div>
              <div className="flex justify-between items-center mb-2"><h4 className="font-bold text-slate-700">Equipamentos disponíveis *</h4><span className="text-xs text-slate-500">{rentalItemDrafts.length} selecionado(s)</span></div>
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {availableAssets.map((asset) => {
                  const selected = rentalItemDrafts.find((item) => item.assetId === asset.id);
                  return <div key={asset.id} className={`p-3 grid grid-cols-1 md:grid-cols-[1fr_280px] gap-3 ${selected ? 'bg-blue-50' : 'bg-white'}`}><label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" className="mt-1" checked={!!selected} onChange={() => toggleRentalAsset(asset)} /><span><b>{asset.assetCode}</b> — {asset.description}{asset.baseIdentification ? ` / Base ${asset.baseIdentification}` : ''}<span className="block text-[10px] text-slate-500">{rangeText(asset)} {asset.calibrationDueDate ? `• Calibração válida até ${formatDate(asset.calibrationDueDate)}` : ''}</span></span></label>{selected && <select required value={selected.serviceId} onChange={(e) => setRentalItemDrafts((current) => current.map((item) => item.assetId === asset.id ? { ...item, serviceId: e.target.value } : item))} className="input-rental"><option value="">Serviço mensal...</option>{activeServices.map((service) => <option value={service.id} key={service.id}>{service.name} — {formatCurrency(service.monthlyPrice)}</option>)}</select>}</div>;
                })}
                {availableAssets.length === 0 && <div className="p-5 text-center text-slate-500 text-xs">Nenhum equipamento disponível com calibração válida. Cadastre/receba a devolução ou atualize a calibração vencida antes da saída.</div>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Orçamento(s)"><input value={rentalDraft.quotationRefs} onChange={(e) => setRentalDraft({ ...rentalDraft, quotationRefs: e.target.value })} className="input-rental" placeholder="Ex.: 21289/21321" /></Field>
              <Field label="Pedido de Compra (PC)"><input value={rentalDraft.purchaseOrder} onChange={(e) => setRentalDraft({ ...rentalDraft, purchaseOrder: e.target.value })} className="input-rental" placeholder="Ex.: 007842" /></Field>
              <Field label="Processo / Cotação"><input value={rentalDraft.processNumber} onChange={(e) => setRentalDraft({ ...rentalDraft, processNumber: e.target.value })} className="input-rental" /></Field>
              <Field label="Obra / Projeto"><input value={rentalDraft.project} onChange={(e) => setRentalDraft({ ...rentalDraft, project: e.target.value })} className="input-rental" /></Field>
              <Field label="Responsáveis no cliente"><input value={rentalDraft.responsibles} onChange={(e) => setRentalDraft({ ...rentalDraft, responsibles: e.target.value })} className="input-rental" /></Field>
              <Field label="Condição de pagamento"><input value={rentalDraft.paymentMethod} onChange={(e) => setRentalDraft({ ...rentalDraft, paymentMethod: e.target.value })} className="input-rental" placeholder={settings.paymentMethod} /></Field>
              <Field label="Observações para faturamento" className="md:col-span-3"><textarea value={rentalDraft.billingNotes} onChange={(e) => setRentalDraft({ ...rentalDraft, billingNotes: e.target.value })} className="input-rental min-h-20" placeholder="Texto complementar que deverá aparecer na fatura." /></Field>
            </div>
            <button disabled={busy} className="w-full py-3 bg-blue-600 text-white rounded-xl font-black disabled:opacity-50">Cadastrar Locação</button>
          </form>
        </Modal>
      )}

      {dispatchTarget && (
        <Modal title={`Registrar Saída — ${dispatchTarget.rentalNumber}`} onClose={() => setDispatchTarget(null)}>
          <form onSubmit={registerDispatch} className="space-y-4 text-sm">
            <Field label="Data de saída"><input type="date" value={dispatchForm.date} onChange={(e) => setDispatchForm({ ...dispatchForm, date: e.target.value })} className="input-rental" /></Field>
            <Field label="Recebido por (cliente) *"><input required value={dispatchForm.responsibleClient} onChange={(e) => setDispatchForm({ ...dispatchForm, responsibleClient: e.target.value })} className="input-rental" /></Field>
            <Field label="Documento / Matrícula"><input value={dispatchForm.responsibleClientDocument} onChange={(e) => setDispatchForm({ ...dispatchForm, responsibleClientDocument: e.target.value })} className="input-rental" /></Field>
            <Field label="Condição / Observações"><textarea value={dispatchForm.notes} onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })} className="input-rental min-h-20" placeholder="Ex.: material entregue em perfeito estado, manômetros com base e acessórios." /></Field>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs">A saída marcará automaticamente todos os {dispatchTarget.items.length} equipamento(s) como <b>Locado</b> e gerará o comprovante de entrega.</div>
            <button disabled={busy} className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-bold disabled:opacity-50">Confirmar Saída e Gerar Comprovante</button>
          </form>
        </Modal>
      )}

      {returnTarget && (
        <Modal title={`Receber Material Devolvido — ${returnTarget.rentalNumber}`} onClose={() => setReturnTarget(null)} wide>
          <form onSubmit={registerReturn} className="space-y-4 text-sm">
            <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">{activeRentalItems(returnTarget).map((item) => { const state = returnItems[item.assetId] || { selected: false, condition: 'conforme' as RentalReturnCondition, notes: '' }; return <div key={item.assetId} className={`p-3 grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-3 ${state.selected ? 'bg-blue-50' : ''}`}><label className="flex gap-2 items-start"><input type="checkbox" className="mt-1" checked={state.selected} onChange={(e) => setReturnItems({ ...returnItems, [item.assetId]: { ...state, selected: e.target.checked } })} /><span><b>{item.assetCode}</b> — {item.description}{item.baseIdentification ? ` / Base ${item.baseIdentification}` : ''}<input disabled={!state.selected} value={state.notes} onChange={(e) => setReturnItems({ ...returnItems, [item.assetId]: { ...state, notes: e.target.value } })} className="mt-2 w-full border border-slate-300 rounded px-2 py-1 text-xs" placeholder="Observação do item" /></span></label><select disabled={!state.selected} value={state.condition} onChange={(e) => setReturnItems({ ...returnItems, [item.assetId]: { ...state, condition: e.target.value as RentalReturnCondition } })} className="input-rental"><option value="conforme">Conforme</option><option value="avaria">Com avaria</option><option value="faltante">Item faltante</option></select></div>; })}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Field label="Data do recebimento"><input type="date" value={returnForm.date} onChange={(e) => setReturnForm({ ...returnForm, date: e.target.value })} className="input-rental" /></Field><Field label="Devolvido por (cliente) *"><input required value={returnForm.responsibleClient} onChange={(e) => setReturnForm({ ...returnForm, responsibleClient: e.target.value })} className="input-rental" /></Field><Field label="Documento / Matrícula"><input value={returnForm.responsibleClientDocument} onChange={(e) => setReturnForm({ ...returnForm, responsibleClientDocument: e.target.value })} className="input-rental" /></Field><Field label="Observações gerais"><input value={returnForm.notes} onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })} className="input-rental" /></Field></div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">Itens marcados <b>Com avaria</b> serão enviados automaticamente para status <b>Manutenção</b>. Itens conformes retornam para <b>Disponível</b>. A devolução pode ser parcial.</div>
            <button disabled={busy} className="w-full py-2.5 bg-slate-800 text-white rounded-lg font-bold disabled:opacity-50">Confirmar Recebimento e Gerar Comprovante</button>
          </form>
        </Modal>
      )}

      {printDocument && (
        <div className="fixed inset-0 z-[100] bg-black/60 p-2 sm:p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="rental-no-print bg-slate-900 text-white rounded-t-xl px-4 py-3 flex justify-between items-center"><span className="font-bold text-sm">Pré-visualização do documento</span><div className="flex gap-2"><button onClick={printNow} className="px-3 py-1.5 rounded bg-blue-600 text-xs font-bold flex items-center gap-1"><Printer className="w-4 h-4" /> Imprimir / Salvar PDF</button><button onClick={() => setPrintDocument(null)} className="p-1.5 rounded hover:bg-white/10"><X className="w-5 h-5" /></button></div></div>
            <div id="rental-print-root" className="bg-white min-h-[1120px] p-8 text-slate-950">
              {printDocument.kind === 'invoice'
                ? <InvoicePrint invoice={printDocument.invoice} rental={printDocument.rental} companyData={companyData} logoUrl={logoUrl} />
                : <MovementPrint movement={printDocument.movement} rental={printDocument.rental} companyData={companyData} logoUrl={logoUrl} />}
            </div>
          </div>
        </div>
      )}

      <style>{`.input-rental{width:100%;border:1px solid #cbd5e1;border-radius:.5rem;padding:.5rem .75rem;background:#fff;color:#0f172a;outline:none}.input-rental:focus{border-color:#2563eb;box-shadow:0 0 0 1px #2563eb}.input-rental:disabled{background:#f8fafc;color:#64748b}`}</style>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`block space-y-1 ${className}`}><span className="block text-xs font-bold text-slate-600">{label}</span>{children}</label>;
}

function Modal({ title, children, onClose, wide = false, extraWide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean; extraWide?: boolean }) {
  return <div className="fixed inset-0 z-[90] bg-slate-950/60 p-3 sm:p-6 overflow-y-auto"><div className={`${extraWide ? 'max-w-6xl' : wide ? 'max-w-3xl' : 'max-w-lg'} mx-auto bg-white rounded-2xl shadow-2xl border border-slate-200`}><div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center"><h3 className="font-extrabold text-slate-900">{title}</h3><button onClick={onClose} type="button" className="p-1.5 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button></div><div className="p-5">{children}</div></div></div>;
}

function CompanyHeader({ companyData, logoUrl }: { companyData: Record<string, any>; logoUrl: string }) {
  return <div className="grid grid-cols-[135px_1fr_220px] border border-black text-[11px] min-h-24"><div className="border-r border-black p-3 flex items-center justify-center"><img src={logoUrl} className="max-w-full max-h-16 object-contain" /></div><div className="p-3 leading-5"><b>{companyData.razaoSocial || 'COMANINS COMERCIO E MANUTENÇÃO INSTRUMENTOS LTDA'}</b><br />{companyData.endereco || 'RUA A3, N. 09, POLOPLAST - CAMAÇARI - BA'}<br />CNPJ – {companyData.cnpj || '02.401.101/0001-08'}</div><div className="p-3 text-center leading-5"><b>FINANCEIRO COMANINS</b><br />TEL {companyData.telefone || '71-3621-0311'}<br />{companyData.emailFinanceiro || 'financeiro@comanins.com.br'}</div></div>;
}

function InvoicePrint({ invoice, rental, companyData, logoUrl }: { invoice: RentalInvoice; rental?: RentalContract; companyData: Record<string, any>; logoUrl: string }) {
  const ids = invoice.lines.map((line) => line.assetCode).filter(Boolean).join('/');
  const baseIds = invoice.lines.map((line) => line.baseIdentification).filter(Boolean).join('/');
  const renewal = invoice.cycleIndex > 0 ? ' (RENOVAÇÃO)' : '';
  const descriptionLines = [
    `LOCAÇÃO${renewal} – ${String(invoice.lines.length).padStart(2, '0')} manômetro(s) com base - Identificações: ${ids || '-'}.`,
    `${invoice.cnaeCode} ${invoice.cnaeDescription}`,
    invoice.quotationRefs ? `Conforme orçamento(s) ${invoice.quotationRefs}.` : '',
    invoice.purchaseOrder ? `PC: ${invoice.purchaseOrder}.` : '',
    `Período de locação: ${formatDate(invoice.periodStart)} à ${formatDate(invoice.periodEnd)}.`,
    invoice.responsibles ? `Responsáveis: ${invoice.responsibles}.` : '',
    invoice.processNumber ? `Processo/Cotação: ${invoice.processNumber}.` : '',
    invoice.project ? `Obra/Projeto: ${invoice.project}.` : '',
    baseIds ? `Bases: ${baseIds}.` : '',
    invoice.billingNotes || '',
    invoice.bankInstructions ? `CREDITAR EM: ${invoice.bankInstructions}` : '',
    `VENCIMENTO EM ${formatDate(invoice.dueDate)}.`,
  ].filter(Boolean);
  return <div className="font-sans text-black">
    <CompanyHeader companyData={companyData} logoUrl={logoUrl} />
    <div className="border-x border-b border-black grid grid-cols-[1fr_210px] text-center"><div className="p-2 text-xl font-black">FATURA / DUPLICATA</div><div className="border-l border-black p-2 text-lg font-black">Nº: {invoice.invoiceNumber}</div></div>
    <div className="border-x border-b border-black p-5 min-h-32 text-sm leading-6"><b>CLIENTE:</b> {invoice.clientName}<br /><b>ENDEREÇO:</b> {invoice.clientAddress || '-'}<br /><b>CNPJ:</b> {invoice.clientCnpj}<div className="text-right font-bold mt-3">DATA DE EMISSÃO&nbsp;&nbsp; {formatDate(invoice.issueDate)}</div></div>
    <div className="grid grid-cols-[1fr_180px] border-x border-b border-black text-xs font-black text-center bg-slate-100"><div className="p-1 border-r border-black">DESCRIÇÃO</div><div className="p-1">VALOR</div></div>
    <div className="grid grid-cols-[1fr_180px] border-x border-b border-black min-h-[480px]"><div className="p-3 border-r border-black whitespace-pre-line text-[12px] leading-5">{descriptionLines.join('\n')}</div><div className="p-3 text-right font-bold text-sm">{formatCurrency(invoice.total)}</div></div>
    <div className="grid grid-cols-3 border-x border-b border-black text-xs text-center"><div className="border-r border-black"><div className="font-black border-b border-black p-1">VENCIMENTO</div><div className="p-3">{formatDate(invoice.dueDate)}</div></div><div className="border-r border-black"><div className="font-black border-b border-black p-1">CONDIÇÕES DE PAGAMENTO</div><div className="p-3">{invoice.paymentMethod}</div></div><div><div className="font-black border-b border-black p-1">VALOR TOTAL</div><div className="p-3 font-bold">{formatCurrency(invoice.total)}</div></div></div>
    <div className="border-x border-b border-black min-h-36 p-5 text-xs whitespace-pre-line"><b>OBSERVAÇÕES</b><br /><br />{invoice.taxNotes}</div>
    <div className="mt-3 text-[9px] text-slate-500">Locação {invoice.rentalNumber}{rental ? ` • Cliente ${rental.clientName}` : ''} • Ciclo fixo de 30 dias, sem diária.</div>
  </div>;
}

function MovementPrint({ movement, rental, companyData, logoUrl }: { movement: RentalMovement; rental?: RentalContract; companyData: Record<string, any>; logoUrl: string }) {
  const isDispatch = movement.type === 'saida';
  return <div className="font-sans text-black">
    <CompanyHeader companyData={companyData} logoUrl={logoUrl} />
    <div className="border-x border-b border-black p-3 text-center"><h1 className="text-lg font-black uppercase">{isDispatch ? 'COMPROVANTE DE SAÍDA DE MATERIAL LOCADO' : 'COMPROVANTE DE RECEBIMENTO DE MATERIAL DEVOLVIDO'}</h1><div className="text-xs mt-1">Nº {movement.movementNumber} • Locação {movement.rentalNumber}</div></div>
    <div className="border-x border-b border-black p-4 text-sm leading-6"><b>CLIENTE:</b> {movement.clientName}<br /><b>CNPJ:</b> {movement.clientCnpj}<br /><b>ENDEREÇO:</b> {movement.clientAddress || '-'}<br /><b>DATA:</b> {formatDate(movement.date)}</div>
    <table className="w-full border-collapse text-xs"><thead><tr><th className="border border-black p-2 text-left">Identificação / COMA</th><th className="border border-black p-2 text-left">Material</th><th className="border border-black p-2 text-left">Base</th><th className="border border-black p-2 text-left">Condição</th></tr></thead><tbody>{movement.items.map((item) => <tr key={item.assetId}><td className="border border-black p-2 font-mono font-bold">{item.assetCode}</td><td className="border border-black p-2">{item.description}{item.serialNumber ? ` • Série ${item.serialNumber}` : ''}</td><td className="border border-black p-2">{item.baseIdentification || '-'}</td><td className="border border-black p-2">{item.condition ? item.condition.toUpperCase() : (isDispatch ? 'ENTREGUE' : '-')}{item.notes ? ` — ${item.notes}` : ''}</td></tr>)}</tbody></table>
    <div className="border-x border-b border-black p-4 text-xs min-h-24"><b>OBSERVAÇÕES:</b><br />{movement.notes || (isDispatch ? 'Material entregue para locação mensal em condições de uso, conforme relação acima.' : 'Material recebido e conferido conforme relação acima.')}</div>
    {rental && <div className="border-x border-b border-black p-4 text-xs"><b>Regra comercial:</b> locação em ciclos fixos de 30 dias, sem cobrança diária ou pró-rata. Primeiro vencimento: {formatDate(rental.firstDueDate)}.</div>}
    <div className="grid grid-cols-2 gap-16 mt-24 text-xs text-center"><div className="border-t border-black pt-2"><b>{movement.responsibleComanins}</b><br />Responsável COMANINS</div><div className="border-t border-black pt-2"><b>{movement.responsibleClient}</b><br />Responsável Cliente{movement.responsibleClientDocument ? ` • ${movement.responsibleClientDocument}` : ''}</div></div>
    <div className="mt-16 text-[9px] text-slate-500">Documento emitido pelo Portal Interno COMANINS em {new Date(movement.createdAt).toLocaleString('pt-BR')}.</div>
  </div>;
}
