import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CircleDollarSign,
  FileText,
  Filter,
  Gauge,
  PackageCheck,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  Settings,
  Truck,
  Trash2,
  X,
} from 'lucide-react';
import type {
  Client,
  RentalAsset,
  RentalContract,
  RentalInvoice,
  RentalMovement,
  RentalReturnCondition,
  RentalService,
  RentalSettings,
} from '../types';
import type { PortalUser } from '../lib/firebase';
import { uploadRentalAttachment } from '../lib/firebase';
import { isAdministratorAccess } from '../access-control';
import { verifyCurrentAdminPassword } from '../utils/authApi';
import {
  createRentalContract,
  deleteRentalAsset,
  deleteRentalContract,
  deleteRentalInvoice,
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
  updateRentalContract,
  updateRentalInvoice,
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

type InvoicePricingMode =
  | 'renewal_service'
  | 'select_service'
  | 'fixed_unit'
  | 'initial_contract'
  | 'custom_per_item';

interface InvoiceLineDraft {
  assetId: string;
  assetCode: string;
  description: string;
  baseIdentification: string;
  serviceId: string;
  serviceName: string;
  initialPrice: number;
  serviceRenewalPrice?: number;
  monthlyPrice: number;
}

interface InvoiceModalFormState {
  mode: 'create' | 'edit';
  rentalId: string;
  rentalNumber: string;
  clientName: string;
  clientCnpj: string;
  invoiceId?: string;
  cycleIndex: number;
  isRenewal: boolean;
  invoiceNumber: string;
  issueDate: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  pricingMode: InvoicePricingMode;
  selectedBulkServiceId: string;
  selectedBulkServicePriceBasis: 'renewal' | 'monthly';
  fixedUnitPrice: string;
  quotationRefs: string;
  purchaseOrder: string;
  processNumber: string;
  project: string;
  responsibles: string;
  paymentMethod: string;
  clientAddress: string;
  cnaeCode: string;
  cnaeDescription: string;
  bankInstructions: string;
  billingNotes: string;
  taxNotes: string;
  updateContractDefaults: boolean;
  lines: InvoiceLineDraft[];
}

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

const nextDueDate = (rental: RentalContract, invoicesOrRef: RentalInvoice[] | string = []) => {
  if (Array.isArray(invoicesOrRef)) {
    const rentalInvoices = invoicesOrRef
      .filter((invoice) => invoice.rentalId === rental.id && invoice.status !== 'cancelada')
      .sort((a, b) => {
        const cycleDiff = Number(a.cycleIndex || 0) - Number(b.cycleIndex || 0);
        if (cycleDiff !== 0) return cycleDiff;
        return String(a.issueDate || '').localeCompare(String(b.issueDate || ''));
      });
    const lastInvoice = rentalInvoices.length > 0 ? rentalInvoices[rentalInvoices.length - 1] : null;
    if (lastInvoice) {
      const lastIssueIso = String(lastInvoice.issueDate || '').slice(0, 10);
      if (lastIssueIso) {
        return addDaysIso(lastIssueIso, 30) || lastInvoice.dueDate;
      }
      if (lastInvoice.dueDate) return lastInvoice.dueDate;
    }
  }

  const contractLastIssue = String((rental as any).lastInvoiceIssueDate || '').slice(0, 10);
  if (contractLastIssue) {
    return addDaysIso(contractLastIssue, 30);
  }

  const baseEmissionDate = String(rental.dispatchAt || rental.startDate || '').slice(0, 10);
  if (baseEmissionDate) {
    return addDaysIso(baseEmissionDate, 30) || rental.firstDueDate;
  }
  return rental.firstDueDate;
};

const rangeText = (asset: RentalAsset) => {
  if (asset.rangeMin === undefined || asset.rangeMax === undefined || !asset.unit) return '';
  return `${asset.rangeMin} a ${asset.rangeMax} ${asset.unit}`;
};

const activeRentalItems = (rental: RentalContract) => rental.items.filter((item) => !item.returnedAt);

const nextUninvoicedCycle = (rental: RentalContract, invoices: RentalInvoice[], issueDateRef = todayIso()) => {
  const rentalInvoices = invoices
    .filter((invoice) => invoice.rentalId === rental.id && invoice.status !== 'cancelada')
    .sort((a, b) => Number(a.cycleIndex || 0) - Number(b.cycleIndex || 0));
  const occupied = new Set(
    rentalInvoices
      .map((invoice) => Number(invoice.cycleIndex))
      .filter(Number.isFinite),
  );
  let cycleIndex = 0;
  while (occupied.has(cycleIndex) && cycleIndex < 600) cycleIndex += 1;
  if (cycleIndex >= 600) return null;

  const emissionIso = String(issueDateRef || todayIso()).slice(0, 10);
  const entryIso = String(rental.dispatchAt || rental.startDate || emissionIso).slice(0, 10);
  const isRenewal = cycleIndex > 0;
  const periodStart = isRenewal ? emissionIso : entryIso;
  const periodEnd = addDaysIso(periodStart, 30);
  const dueDate = addDaysIso(emissionIso, 30);
  if (!periodStart || !periodEnd || !dueDate) return null;

  const hasActiveOrBillableItems = rental.items.some((item) => {
    if (!item.returnedAt) return true;
    const dispatchedAt = String(item.dispatchedAt || rental.dispatchAt || rental.startDate).slice(0, 10);
    const returnedAt = String(item.returnedAt || '').slice(0, 10);
    return !!dispatchedAt && dispatchedAt <= periodEnd && (!returnedAt || returnedAt >= periodStart);
  });
  return hasActiveOrBillableItems ? { cycleIndex, periodStart, periodEnd, dueDate } : null;
};

const normalizeText = (value: unknown) => String(value || '').trim().toLowerCase();

export default function RentalManagement({ clients, currentUser, canEdit, companyData = {} }: RentalManagementProps) {
  const isAdmin = isAdministratorAccess(currentUser as any);
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
  const [rentalStatusFilter, setRentalStatusFilter] = useState<'todos' | 'ativo' | 'rascunho' | 'encerrado'>('todos');
  const [printDocument, setPrintDocument] = useState<PrintDocument>(null);

  // Estado do Modal Completo de Emissão de Fatura / Renovação e Edição de Fatura
  const [invoiceModal, setInvoiceModal] = useState<InvoiceModalFormState | null>(null);

  // Estado do Modal de Edição de Dados Comerciais da Locação
  const [editingContractTarget, setEditingContractTarget] = useState<RentalContract | null>(null);
  const [contractEditDraft, setContractEditDraft] = useState({
    quotationRefs: '',
    purchaseOrder: '',
    processNumber: '',
    project: '',
    responsibles: '',
    paymentMethod: '',
    billingNotes: '',
  });

  // Estados de Pesquisa e Filtro para Equipamentos Locáveis
  const [assetSearch, setAssetSearch] = useState('');
  const [assetStatusFilter, setAssetStatusFilter] = useState<'todos' | 'disponivel' | 'locado' | 'manutencao' | 'inativo'>('todos');
  const [assetCalibrationFilter, setAssetCalibrationFilter] = useState<'todos' | 'em_dia' | 'vencendo_30d' | 'vencida' | 'sem_validade'>('todos');
  const [assetRangeFilter, setAssetRangeFilter] = useState<string>('todos');

  // Estado de Pesquisa para Faturas
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<'todas' | 'locacao_inicial' | 'renovacao'>('todas');

  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceDraft, setServiceDraft] = useState<Partial<RentalService>>({ active: true, monthlyPrice: 0 });
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [assetDraft, setAssetDraft] = useState<Partial<RentalAsset>>({ description: 'Manômetro com base', status: 'disponivel' });
  const [showRentalForm, setShowRentalForm] = useState(false);
  const [availableAssetSearch, setAvailableAssetSearch] = useState('');
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
  const [returnForm, setReturnForm] = useState({ responsibleClient: '', responsibleClientDocument: '', notes: '', date: todayIso(), attachments: [] as File[] });
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
  const serviceMap = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

  const availableAssets = useMemo(() => assets.filter((asset) => {
    if (asset.status !== 'disponivel') return false;
    const due = String(asset.calibrationDueDate || '').slice(0, 10);
    return !due || due >= todayIso();
  }), [assets]);

  const filteredAvailableAssets = useMemo(() => {
    const term = normalizeText(availableAssetSearch);
    if (!term) return availableAssets;
    return availableAssets.filter((asset) => [
      asset.assetCode,
      asset.tag,
      asset.description,
      asset.brand,
      asset.model,
      asset.serialNumber,
      asset.baseIdentification,
      asset.calibrationCertificateNumber,
      rangeText(asset),
    ].some((value) => normalizeText(value).includes(term)));
  }, [availableAssets, availableAssetSearch]);

  // Opções únicas de faixa/unidade para filtro de equipamentos locáveis
  const assetRangeOptions = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((asset) => {
      const r = rangeText(asset);
      if (r) set.add(r);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  }, [assets]);

  // Contadores rápidos de equipamentos locáveis
  const assetCounts = useMemo(() => {
    const today = todayIso();
    const in30Days = addDaysIso(today, 30);
    let disponivel = 0;
    let locado = 0;
    let manutencao = 0;
    let inativo = 0;
    let vencida = 0;
    let vencendo30d = 0;
    assets.forEach((asset) => {
      if (asset.status === 'disponivel') disponivel += 1;
      else if (asset.status === 'locado') locado += 1;
      else if (asset.status === 'manutencao') manutencao += 1;
      else if (asset.status === 'inativo') inativo += 1;

      const due = String(asset.calibrationDueDate || '').slice(0, 10);
      if (due) {
        if (due < today) vencida += 1;
        else if (due <= in30Days) vencendo30d += 1;
      }
    });
    return { total: assets.length, disponivel, locado, manutencao, inativo, vencida, vencendo30d };
  }, [assets]);

  // Lista filtrada de equipamentos locáveis na aba "Equipamentos Locáveis"
  const filteredAssets = useMemo(() => {
    const term = normalizeText(assetSearch);
    const today = todayIso();
    const in30Days = addDaysIso(today, 30);

    return assets.filter((asset) => {
      if (assetStatusFilter !== 'todos' && asset.status !== assetStatusFilter) {
        return false;
      }
      if (assetRangeFilter !== 'todos' && rangeText(asset) !== assetRangeFilter) {
        return false;
      }
      if (assetCalibrationFilter !== 'todos') {
        const due = String(asset.calibrationDueDate || '').slice(0, 10);
        if (assetCalibrationFilter === 'sem_validade' && due) return false;
        if (assetCalibrationFilter === 'vencida' && (!due || due >= today)) return false;
        if (assetCalibrationFilter === 'vencendo_30d' && (!due || due < today || due > in30Days)) return false;
        if (assetCalibrationFilter === 'em_dia' && (!due || due < today)) return false;
      }
      if (!term) return true;
      return [
        asset.assetCode,
        asset.tag,
        asset.description,
        asset.brand,
        asset.model,
        asset.serialNumber,
        asset.baseIdentification,
        asset.calibrationCertificateNumber,
        rangeText(asset),
        asset.notes,
        asset.status,
      ].some((value) => normalizeText(value).includes(term));
    });
  }, [assets, assetSearch, assetStatusFilter, assetCalibrationFilter, assetRangeFilter]);

  const filteredRentals = useMemo(() => {
    const term = normalizeText(search);
    return rentals.filter((rental) => {
      if (rentalStatusFilter !== 'todos' && rental.status !== rentalStatusFilter) return false;
      if (!term) return true;
      const itemCodes = (rental.items || []).map((i) => `${i.assetCode} ${i.baseIdentification || ''} ${i.description || ''}`).join(' ');
      return [
        rental.rentalNumber,
        rental.clientName,
        rental.clientCnpj,
        rental.purchaseOrder,
        rental.quotationRefs,
        rental.processNumber,
        rental.project,
        rental.responsibles,
        itemCodes,
      ].some((value) => normalizeText(value).includes(term));
    });
  }, [rentals, search, rentalStatusFilter]);

  const filteredInvoices = useMemo(() => {
    const term = normalizeText(invoiceSearch);
    return invoices.filter((invoice) => {
      const isRenewalInvoice = invoice.isRenewal ?? (Number(invoice.cycleIndex || 0) > 0);
      if (invoiceTypeFilter === 'renovacao' && !isRenewalInvoice) return false;
      if (invoiceTypeFilter === 'locacao_inicial' && isRenewalInvoice) return false;
      if (!term) return true;
      const lineCodes = (invoice.lines || []).map((l) => `${l.assetCode} ${l.baseIdentification || ''}`).join(' ');
      return [
        invoice.invoiceNumber,
        invoice.rentalNumber,
        invoice.clientName,
        invoice.clientCnpj,
        invoice.purchaseOrder,
        invoice.quotationRefs,
        invoice.processNumber,
        invoice.project,
        formatDate(invoice.periodStart),
        formatDate(invoice.periodEnd),
        formatDate(invoice.dueDate),
        lineCodes,
      ].some((value) => normalizeText(value).includes(term));
    });
  }, [invoices, invoiceSearch, invoiceTypeFilter]);

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

  // Abre o modal completo para emitir a próxima fatura / renovação de uma locação
  const openIssueInvoiceModal = (rental: RentalContract) => {
    clearMessages();
    if (!ensureEditable()) return;
    const issueDate = todayIso();
    const pendingCycle = nextUninvoicedCycle(rental, invoices, issueDate);
    const cycleIndex = pendingCycle ? pendingCycle.cycleIndex : 0;
    const isRenewal = cycleIndex > 0;
    const baseEntryIso = String(rental.dispatchAt || rental.startDate || issueDate).slice(0, 10);
    const periodStart = isRenewal ? issueDate : (pendingCycle?.periodStart || baseEntryIso);
    const periodEnd = addDaysIso(periodStart, 30) || pendingCycle?.periodEnd || issueDate;
    const dueDate = addDaysIso(issueDate, 30) || addDaysIso(periodStart, 30);

    const billableSource = rental.items.filter((item) => {
      if (!item.returnedAt) return true;
      const dispatchedAt = String(item.dispatchedAt || rental.dispatchAt || rental.startDate).slice(0, 10);
      const returnedAt = String(item.returnedAt || '').slice(0, 10);
      return !!dispatchedAt && dispatchedAt <= periodEnd && (!returnedAt || returnedAt >= periodStart);
    });
    const itemsToBill = billableSource.length > 0 ? billableSource : rental.items;

    const lines: InvoiceLineDraft[] = itemsToBill.map((item) => {
      const linkedService = serviceMap.get(item.serviceId);
      const initialPrice = Number(item.monthlyPrice || linkedService?.monthlyPrice || 0);
      const serviceRenewalPrice = item.renewalPrice !== undefined
        ? Number(item.renewalPrice)
        : linkedService?.renewalPrice !== undefined
          ? Number(linkedService.renewalPrice)
          : undefined;
      const defaultPrice = isRenewal
        ? Number((serviceRenewalPrice !== undefined && serviceRenewalPrice > 0 ? serviceRenewalPrice : initialPrice).toFixed(2))
        : Number(initialPrice.toFixed(2));

      return {
        assetId: item.assetId,
        assetCode: item.assetCode,
        description: item.description || 'Manômetro com base',
        baseIdentification: item.baseIdentification || '',
        serviceId: item.serviceId || '',
        serviceName: item.serviceName || linkedService?.name || '',
        initialPrice,
        serviceRenewalPrice,
        monthlyPrice: defaultPrice,
      };
    });

    const defaultBulkServiceId = lines[0]?.serviceId || activeServices[0]?.id || '';
    const defaultFixedUnit = lines[0]?.monthlyPrice ? String(lines[0].monthlyPrice) : '';
    const suggestedInvoiceNumber = settings.nextInvoiceNumber
      ? `${settings.invoicePrefix || ''}${settings.nextInvoiceNumber}`
      : (rental.processNumber || '');

    setInvoiceModal({
      mode: 'create',
      rentalId: rental.id,
      rentalNumber: rental.rentalNumber,
      clientName: rental.clientName,
      clientCnpj: rental.clientCnpj,
      cycleIndex,
      isRenewal,
      invoiceNumber: suggestedInvoiceNumber,
      issueDate: todayIso(),
      periodStart,
      periodEnd,
      dueDate,
      pricingMode: isRenewal ? 'renewal_service' : 'initial_contract',
      selectedBulkServiceId: defaultBulkServiceId,
      selectedBulkServicePriceBasis: isRenewal ? 'renewal' : 'monthly',
      fixedUnitPrice: defaultFixedUnit,
      quotationRefs: rental.quotationRefs || '',
      purchaseOrder: rental.purchaseOrder || '',
      processNumber: rental.processNumber || '',
      project: rental.project || '',
      responsibles: rental.responsibles || '',
      paymentMethod: rental.paymentMethod || settings.paymentMethod || 'DEPÓSITO BANCÁRIO',
      clientAddress: rental.clientAddress || '',
      cnaeCode: settings.cnaeCode || DEFAULT_SETTINGS.cnaeCode,
      cnaeDescription: settings.cnaeDescription || DEFAULT_SETTINGS.cnaeDescription,
      bankInstructions: settings.bankInstructions || DEFAULT_SETTINGS.bankInstructions,
      billingNotes: rental.billingNotes || '',
      taxNotes: settings.taxNotes || DEFAULT_SETTINGS.taxNotes,
      updateContractDefaults: isRenewal,
      lines,
    });
  };

  // Abre o modal completo para editar uma fatura já emitida
  const openEditInvoiceModal = (invoice: RentalInvoice) => {
    clearMessages();
    if (!ensureEditable()) return;
    const rental = findRental(invoice.rentalId);
    const isRenewal = invoice.isRenewal ?? (Number(invoice.cycleIndex || 0) > 0);

    const lines: InvoiceLineDraft[] = (invoice.lines || []).map((line) => {
      const contractItem = rental?.items?.find((i) => i.assetId === line.assetId);
      const linkedService = serviceMap.get(line.serviceId);
      const initialPrice = Number(contractItem?.monthlyPrice || linkedService?.monthlyPrice || line.monthlyPrice || 0);
      const serviceRenewalPrice = line.renewalPrice !== undefined
        ? Number(line.renewalPrice)
        : contractItem?.renewalPrice !== undefined
          ? Number(contractItem.renewalPrice)
          : linkedService?.renewalPrice !== undefined
            ? Number(linkedService.renewalPrice)
            : undefined;
      return {
        assetId: line.assetId,
        assetCode: line.assetCode,
        description: line.description || 'Manômetro com base',
        baseIdentification: line.baseIdentification || '',
        serviceId: line.serviceId || '',
        serviceName: line.serviceName || linkedService?.name || '',
        initialPrice,
        serviceRenewalPrice,
        monthlyPrice: Number(line.monthlyPrice || 0),
      };
    });

    setInvoiceModal({
      mode: 'edit',
      rentalId: invoice.rentalId,
      rentalNumber: invoice.rentalNumber,
      clientName: invoice.clientName,
      clientCnpj: invoice.clientCnpj,
      invoiceId: invoice.id,
      cycleIndex: Number(invoice.cycleIndex || 0),
      isRenewal,
      invoiceNumber: invoice.invoiceNumber || '',
      issueDate: invoice.issueDate || todayIso(),
      periodStart: invoice.periodStart || todayIso(),
      periodEnd: invoice.periodEnd || addDaysIso(todayIso(), 29),
      dueDate: invoice.dueDate || addDaysIso(todayIso(), 30),
      pricingMode: 'custom_per_item',
      selectedBulkServiceId: lines[0]?.serviceId || activeServices[0]?.id || '',
      selectedBulkServicePriceBasis: isRenewal ? 'renewal' : 'monthly',
      fixedUnitPrice: lines[0]?.monthlyPrice ? String(lines[0].monthlyPrice) : '',
      quotationRefs: invoice.quotationRefs || '',
      purchaseOrder: invoice.purchaseOrder || '',
      processNumber: invoice.processNumber || '',
      project: invoice.project || '',
      responsibles: invoice.responsibles || '',
      paymentMethod: invoice.paymentMethod || settings.paymentMethod || 'DEPÓSITO BANCÁRIO',
      clientAddress: invoice.clientAddress || rental?.clientAddress || '',
      cnaeCode: invoice.cnaeCode || settings.cnaeCode || DEFAULT_SETTINGS.cnaeCode,
      cnaeDescription: invoice.cnaeDescription || settings.cnaeDescription || DEFAULT_SETTINGS.cnaeDescription,
      bankInstructions: invoice.bankInstructions || settings.bankInstructions || DEFAULT_SETTINGS.bankInstructions,
      billingNotes: invoice.billingNotes || '',
      taxNotes: invoice.taxNotes || settings.taxNotes || DEFAULT_SETTINGS.taxNotes,
      updateContractDefaults: false,
      lines,
    });
  };

  // Aplica a regra da caixa de seleção de modo de precificação da renovação/fatura
  const applyPricingModeChange = (
    mode: InvoicePricingMode,
    options?: { bulkServiceId?: string; bulkBasis?: 'renewal' | 'monthly'; fixedUnit?: string },
  ) => {
    setInvoiceModal((prev) => {
      if (!prev) return null;
      const bulkServiceId = options?.bulkServiceId !== undefined ? options.bulkServiceId : prev.selectedBulkServiceId;
      const bulkBasis = options?.bulkBasis !== undefined ? options.bulkBasis : prev.selectedBulkServicePriceBasis;
      const fixedUnit = options?.fixedUnit !== undefined ? options.fixedUnit : prev.fixedUnitPrice;

      let nextLines = prev.lines;
      if (mode === 'renewal_service') {
        nextLines = prev.lines.map((line) => {
          const svc = serviceMap.get(line.serviceId);
          const renewalVal = line.serviceRenewalPrice !== undefined && line.serviceRenewalPrice > 0
            ? line.serviceRenewalPrice
            : svc?.renewalPrice !== undefined && svc.renewalPrice > 0
              ? Number(svc.renewalPrice)
              : line.initialPrice;
          return { ...line, monthlyPrice: Number(renewalVal.toFixed(2)) };
        });
      } else if (mode === 'initial_contract') {
        nextLines = prev.lines.map((line) => ({
          ...line,
          monthlyPrice: Number(line.initialPrice.toFixed(2)),
        }));
      } else if (mode === 'select_service') {
        const chosenService = serviceMap.get(bulkServiceId);
        if (chosenService) {
          const unitPrice = bulkBasis === 'renewal' && chosenService.renewalPrice && chosenService.renewalPrice > 0
            ? Number(chosenService.renewalPrice)
            : Number(chosenService.monthlyPrice || 0);
          nextLines = prev.lines.map((line) => ({
            ...line,
            serviceId: chosenService.id,
            serviceName: chosenService.name,
            serviceRenewalPrice: chosenService.renewalPrice ? Number(chosenService.renewalPrice) : line.serviceRenewalPrice,
            monthlyPrice: Number(unitPrice.toFixed(2)),
          }));
        }
      } else if (mode === 'fixed_unit') {
        const parsed = Number(String(fixedUnit).replace(',', '.'));
        if (Number.isFinite(parsed) && parsed >= 0) {
          nextLines = prev.lines.map((line) => ({
            ...line,
            monthlyPrice: Number(parsed.toFixed(2)),
          }));
        }
      }

      return {
        ...prev,
        pricingMode: mode,
        selectedBulkServiceId: bulkServiceId,
        selectedBulkServicePriceBasis: bulkBasis,
        fixedUnitPrice: fixedUnit,
        lines: nextLines,
      };
    });
  };

  const invoiceModalTotal = useMemo(() => {
    if (!invoiceModal) return 0;
    return Number(invoiceModal.lines.reduce((sum, l) => sum + Number(l.monthlyPrice || 0), 0).toFixed(2));
  }, [invoiceModal]);

  const submitInvoiceModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceModal) return;
    clearMessages();
    if (!ensureEditable()) return;
    if (!invoiceModal.invoiceNumber.trim()) {
      setError('Informe o número da Fatura / OS.');
      return;
    }
    if (!invoiceModal.issueDate || !invoiceModal.periodStart || !invoiceModal.periodEnd || !invoiceModal.dueDate) {
      setError('Preencha todas as datas da fatura (Emissão, Início do Período, Fim do Período e Vencimento).');
      return;
    }
    if (invoiceModalTotal <= 0) {
      setError('O valor total da fatura deve ser maior que zero.');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        invoiceNumber: invoiceModal.invoiceNumber.trim(),
        issueDate: invoiceModal.issueDate,
        periodStart: invoiceModal.periodStart,
        periodEnd: invoiceModal.periodEnd,
        dueDate: invoiceModal.dueDate,
        isRenewal: invoiceModal.isRenewal,
        quotationRefs: invoiceModal.quotationRefs.trim(),
        purchaseOrder: invoiceModal.purchaseOrder.trim(),
        processNumber: invoiceModal.processNumber.trim(),
        project: invoiceModal.project.trim(),
        responsibles: invoiceModal.responsibles.trim(),
        paymentMethod: invoiceModal.paymentMethod.trim(),
        clientAddress: invoiceModal.clientAddress.trim(),
        cnaeCode: invoiceModal.cnaeCode.trim(),
        cnaeDescription: invoiceModal.cnaeDescription.trim(),
        bankInstructions: invoiceModal.bankInstructions.trim(),
        billingNotes: invoiceModal.billingNotes.trim(),
        taxNotes: invoiceModal.taxNotes.trim(),
        updateContractDefaults: invoiceModal.updateContractDefaults,
        lineOverrides: invoiceModal.lines.map((line) => ({
          assetId: line.assetId,
          serviceId: line.serviceId,
          serviceName: line.serviceName,
          monthlyPrice: Number(Number(line.monthlyPrice || 0).toFixed(2)),
          renewalPrice: Number(Number(line.monthlyPrice || 0).toFixed(2)),
          description: line.description.trim() || 'Manômetro com base',
          baseIdentification: line.baseIdentification.trim(),
        })),
      };

      const rental = findRental(invoiceModal.rentalId);
      if (invoiceModal.mode === 'edit' && invoiceModal.invoiceId) {
        const result = await updateRentalInvoice(invoiceModal.invoiceId, payload);
        setNotice(`Fatura ${result.invoice.invoiceNumber} atualizada com sucesso (incluindo lançamento no Contas a Receber).`);
        setPrintDocument({ kind: 'invoice', invoice: result.invoice, rental });
      } else {
        const result = await generateRentalInvoice(invoiceModal.rentalId, payload);
        setNotice(`Fatura ${result.invoice.invoiceNumber}${result.invoice.isRenewal ? ' (Renovação)' : ''} emitida e integrada ao Contas a Receber.`);
        setPrintDocument({ kind: 'invoice', invoice: result.invoice, rental });
      }
      setInvoiceModal(null);
    } catch (e: any) {
      setError(e?.message || 'Não foi possível salvar/emitir a fatura.');
    } finally {
      setBusy(false);
    }
  };

  const openContractEditModal = (rental: RentalContract) => {
    clearMessages();
    if (!ensureEditable()) return;
    setEditingContractTarget(rental);
    setContractEditDraft({
      quotationRefs: rental.quotationRefs || '',
      purchaseOrder: rental.purchaseOrder || '',
      processNumber: rental.processNumber || '',
      project: rental.project || '',
      responsibles: rental.responsibles || '',
      paymentMethod: rental.paymentMethod || settings.paymentMethod || '',
      billingNotes: rental.billingNotes || '',
    });
  };

  const submitContractEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContractTarget || !ensureEditable()) return;
    clearMessages();
    setBusy(true);
    try {
      await updateRentalContract(editingContractTarget.id, contractEditDraft);
      setNotice(`Dados comerciais da locação ${editingContractTarget.rentalNumber} atualizados.`);
      setEditingContractTarget(null);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar os dados da locação.');
    } finally {
      setBusy(false);
    }
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
        renewalPrice: serviceDraft.renewalPrice ? Number(serviceDraft.renewalPrice) : undefined,
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
      setError('Informe a identificação CM do equipamento locável.');
      return;
    }
    if (assets.some((asset) => normalizeText(asset.assetCode) === normalizeText(assetDraft.assetCode) && asset.id !== assetDraft.id)) {
      setError('Já existe um equipamento locável com esta identificação CM.');
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
    setReturnForm({ responsibleClient: '', responsibleClientDocument: '', notes: '', date: todayIso(), attachments: [] });
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
      const attachmentUrls = [];
      if (returnForm.attachments.length > 0) {
        setNotice('Enviando anexos... Isso pode demorar um pouco.');
        for (const file of returnForm.attachments) {
          try {
            const url = await uploadRentalAttachment(returnTarget.id, file);
            attachmentUrls.push(url);
          } catch (err) {
            console.error('Failed to upload', file.name, err);
          }
        }
      }
      const result = await returnRentalItems(returnTarget.id, { ...returnForm, attachments: attachmentUrls, items: selected });
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

  const confirmAdministratorPassword = async (actionDescription: string): Promise<boolean> => {
    if (!isAdmin || !currentUser?.username) {
      setError('Somente o perfil Administrador pode executar esta exclusão.');
      return false;
    }
    const password = window.prompt(`Digite a senha do administrador logado (${currentUser.username}) para confirmar ${actionDescription}:`);
    if (password === null) return false;
    if (!password.trim()) {
      setError('Informe a senha do administrador para continuar.');
      return false;
    }
    try {
      const valid = await verifyCurrentAdminPassword(password);
      if (!valid) {
        setError('Credencial administrativa inválida.');
        return false;
      }
      return true;
    } catch (error: any) {
      setError(error?.message || 'Não foi possível validar a autorização administrativa.');
      return false;
    }
  };

  const requireDeletionReason = (entityLabel: string) => {
    const confirmed = window.confirm(
      `Excluir ${entityLabel}? Esta ação é restrita ao Administrador e não poderá ser desfeita.`,
    );
    if (!confirmed) return null;
    const reason = window.prompt('Informe o motivo da exclusão para o registro de auditoria:')?.trim() || '';
    if (!reason) {
      setError('A exclusão administrativa exige a informação do motivo.');
      return null;
    }
    return reason;
  };

  const removeAsset = async (asset: RentalAsset) => {
    clearMessages();
    if (!isAdmin) {
      setError('Somente o perfil Administrador pode excluir equipamentos locáveis.');
      return;
    }
    const authorized = await confirmAdministratorPassword('a exclusão deste equipamento locável');
    if (!authorized) return;
    if (asset.status === 'locado' || asset.currentRentalId) {
      setError('Este equipamento está vinculado a uma locação ativa e não pode ser excluído.');
      return;
    }
    const label = asset.assetCode || asset.calibrationCertificateNumber || asset.id;
    const reason = requireDeletionReason(`o equipamento locável ${label}`);
    if (!reason) return;
    setBusy(true);
    try {
      await deleteRentalAsset(asset.id, reason);
      if (assetDraft.id === asset.id) {
        setAssetDraft({ description: 'Manômetro com base', status: 'disponivel' });
        setShowAssetForm(false);
      }
      setRentalItemDrafts((current) => current.filter((item) => item.assetId !== asset.id));
      setNotice(`Equipamento locável ${label} excluído pelo Administrador.`);
    } catch (e: any) {
      setError(e?.message || 'Não foi possível excluir o equipamento locável.');
    } finally {
      setBusy(false);
    }
  };

  const removeInvoice = async (invoice: RentalInvoice) => {
    clearMessages();
    if (!isAdmin) {
      setError('Somente o perfil Administrador pode excluir faturas de locação.');
      return;
    }
    const authorized = await confirmAdministratorPassword('a exclusão desta fatura de locação');
    if (!authorized) return;
    const reason = requireDeletionReason(`a fatura ${invoice.invoiceNumber}`);
    if (!reason) return;
    setBusy(true);
    try {
      await deleteRentalInvoice(invoice.id, reason);
      if (printDocument?.kind === 'invoice' && printDocument.invoice.id === invoice.id) setPrintDocument(null);
      if (invoiceModal?.invoiceId === invoice.id) setInvoiceModal(null);
      setNotice(`Fatura ${invoice.invoiceNumber} excluída. O lançamento financeiro vinculado também foi removido.`);
    } catch (e: any) {
      setError(e?.message || 'Não foi possível excluir a fatura.');
    } finally {
      setBusy(false);
    }
  };

  const removeRental = async (rental: RentalContract) => {
    clearMessages();
    if (!isAdmin) {
      setError('Somente o perfil Administrador pode excluir locações.');
      return;
    }
    const authorized = await confirmAdministratorPassword('a exclusão desta locação');
    if (!authorized) return;
    const reason = requireDeletionReason(`a locação ${rental.rentalNumber}`);
    if (!reason) return;
    const cascadeConfirmed = window.confirm(
      'A exclusão da locação removerá também as faturas, lançamentos financeiros e comprovantes vinculados. Equipamentos ainda vinculados a esta locação serão liberados. Deseja continuar?',
    );
    if (!cascadeConfirmed) return;
    setBusy(true);
    try {
      const result = await deleteRentalContract(rental.id, reason);
      if (printDocument?.rental?.id === rental.id) setPrintDocument(null);
      if (invoiceModal?.rentalId === rental.id) setInvoiceModal(null);
      setNotice(
        `Locação ${rental.rentalNumber} excluída com correção dos vínculos: ${result.deletedInvoices} fatura(s), ${result.deletedFinanceTransactions} lançamento(s) financeiro(s) e ${result.deletedMovements} comprovante(s).`,
      );
    } catch (e: any) {
      setError(e?.message || 'Não foi possível excluir a locação.');
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
      {invoiceModal && (
        <Modal
          title={
            invoiceModal.mode === 'edit'
              ? `Editar Fatura Emitida — Nº ${invoiceModal.invoiceNumber}`
              : invoiceModal.isRenewal
                ? `Emitir Próxima Fatura / Renovação — ${invoiceModal.rentalNumber} (${invoiceModal. cycleIndex + 1}º Ciclo)`
                : `Emitir 1ª Fatura de Locação — ${invoiceModal.rentalNumber}`
          }
          onClose={() => setInvoiceModal(null)}
          extraWide
        >
          <form onSubmit={submitInvoiceModal} className="space-y-6 text-sm">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                    {invoiceModal.rentalNumber}
                  </span>
                  <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full ${invoiceModal.isRenewal ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'}`}>
                    {invoiceModal.isRenewal ? `Renovação de Locação (${invoiceModal.cycleIndex + 1}º Ciclo)` : 'Locação Inicial (1º Ciclo)'}
                  </span>
                </div>
                <p className="font-bold text-slate-900 mt-1">{invoiceModal.clientName}</p>
                <p className="text-xs text-slate-500">CNPJ: {invoiceModal.clientCnpj}</p>
              </div>
              <div className="text-left md:text-right bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Valor Total da Fatura</span>
                <span className="text-2xl font-black text-blue-700">{formatCurrency(invoiceModalTotal)}</span>
                <span className="block text-[11px] text-slate-500">{invoiceModal.lines.length} equipamento(s) na fatura</span>
              </div>
            </div>

            {/* SEÇÃO 1: CAIXA DE SELEÇÃO DE VALOR DA RENOVAÇÃO E ITENS */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-slate-900 flex items-center gap-2">
                    <CircleDollarSign className="w-4 h-4 text-blue-600" />
                    1. Definição do Valor da Renovação / Fatura
                  </h4>
                  <p className="text-xs text-slate-600">
                    Selecione como deseja definir o valor desta renovação/fatura ou ajuste o valor individualmente por equipamento abaixo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-3.5 rounded-xl border border-slate-200">
                <Field label="Regra de Valor para a Fatura / Renovação *" className={invoiceModal.pricingMode === 'select_service' || invoiceModal.pricingMode === 'fixed_unit' ? 'md:col-span-1' : 'md:col-span-3'}>
                  <select
                    value={invoiceModal.pricingMode}
                    onChange={(e) => applyPricingModeChange(e.target.value as InvoicePricingMode)}
                    className="input-rental font-semibold"
                  >
                    <option value="renewal_service">Usar Valor de Renovação cadastrado no Serviço</option>
                    <option value="select_service">Selecionar Tabela de Serviço Mensal / Renovação</option>
                    <option value="fixed_unit">Definir Valor Unitário Fixo por Equipamento (R$)</option>
                    <option value="custom_per_item">Definir Valor Personalizado por Equipamento na Tabela</option>
                    <option value="initial_contract">Manter Mesmo Valor da Locação Inicial</option>
                  </select>
                </Field>

                {invoiceModal.pricingMode === 'select_service' && (
                  <>
                    <Field label="Selecionar Serviço Mensal para Aplicar a Todos *">
                      <select
                        value={invoiceModal.selectedBulkServiceId}
                        onChange={(e) => applyPricingModeChange('select_service', { bulkServiceId: e.target.value })}
                        className="input-rental"
                      >
                        <option value="">Selecione um serviço...</option>
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name} — Inicial: {formatCurrency(service.monthlyPrice)}
                            {service.renewalPrice ? ` | Renovação: ${formatCurrency(service.renewalPrice)}` : ''}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Qual Valor da Tabela Aplicar?">
                      <select
                        value={invoiceModal.selectedBulkServicePriceBasis}
                        onChange={(e) => applyPricingModeChange('select_service', { bulkBasis: e.target.value as 'renewal' | 'monthly' })}
                        className="input-rental"
                      >
                        <option value="renewal">Valor de Renovação do Serviço (se houver)</option>
                        <option value="monthly">Valor Mensal Padrão do Serviço</option>
                      </select>
                    </Field>
                  </>
                )}

                {invoiceModal.pricingMode === 'fixed_unit' && (
                  <Field label="Valor Unitário de Renovação por Equipamento (R$) *" className="md:col-span-2">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={invoiceModal.fixedUnitPrice}
                      onChange={(e) => applyPricingModeChange('fixed_unit', { fixedUnit: e.target.value })}
                      className="input-rental font-bold text-blue-700"
                      placeholder="Ex.: 85.00 (aplicado automaticamente a todos os itens abaixo)"
                    />
                  </Field>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 text-left">Identificação / CM</th>
                      <th className="p-2.5 text-left">Descrição na Fatura</th>
                      <th className="p-2.5 text-left">Base</th>
                      <th className="p-2.5 text-left">Serviço Vinculado</th>
                      <th className="p-2.5 text-right">Locação Inicial</th>
                      <th className="p-2.5 text-right w-44">Valor na Fatura (R$) *</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoiceModal.lines.map((line, index) => (
                      <tr key={line.assetId} className="hover:bg-slate-50/80">
                        <td className="p-2.5 font-mono font-bold text-slate-900">{line.assetCode}</td>
                        <td className="p-2.5">
                          <input
                            value={line.description}
                            onChange={(e) => {
                              const val = e.target.value;
                              setInvoiceModal((prev) => prev ? {
                                ...prev,
                                lines: prev.lines.map((l, i) => i === index ? { ...l, description: val } : l),
                              } : null);
                            }}
                            className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            value={line.baseIdentification}
                            onChange={(e) => {
                              const val = e.target.value;
                              setInvoiceModal((prev) => prev ? {
                                ...prev,
                                lines: prev.lines.map((l, i) => i === index ? { ...l, baseIdentification: val } : l),
                              } : null);
                            }}
                            className="w-28 border border-slate-300 rounded px-2 py-1 text-xs"
                            placeholder="Base..."
                          />
                        </td>
                        <td className="p-2.5">
                          <select
                            value={line.serviceId}
                            onChange={(e) => {
                              const newServiceId = e.target.value;
                              const svc = serviceMap.get(newServiceId);
                              setInvoiceModal((prev) => {
                                if (!prev) return null;
                                const nextPrice = svc
                                  ? (prev.isRenewal && svc.renewalPrice && svc.renewalPrice > 0 ? Number(svc.renewalPrice) : Number(svc.monthlyPrice || 0))
                                  : line.monthlyPrice;
                                return {
                                  ...prev,
                                  pricingMode: 'custom_per_item',
                                  lines: prev.lines.map((l, i) => i === index ? {
                                    ...l,
                                    serviceId: newServiceId,
                                    serviceName: svc?.name || l.serviceName,
                                    serviceRenewalPrice: svc?.renewalPrice ? Number(svc.renewalPrice) : undefined,
                                    monthlyPrice: Number(nextPrice.toFixed(2)),
                                  } : l),
                                };
                              });
                            }}
                            className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                          >
                            <option value="">Personalizado</option>
                            {services.map((service) => (
                              <option key={service.id} value={service.id}>
                                {service.name} ({formatCurrency(
                                  invoiceModal.isRenewal && service.renewalPrice && service.renewalPrice > 0
                                    ? service.renewalPrice
                                    : service.monthlyPrice,
                                )})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2.5 text-right text-slate-500 font-mono">
                          {formatCurrency(line.initialPrice)}
                        </td>
                        <td className="p-2.5 text-right">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                            value={line.monthlyPrice}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setInvoiceModal((prev) => prev ? {
                                ...prev,
                                pricingMode: 'custom_per_item',
                                lines: prev.lines.map((l, i) => i === index ? { ...l, monthlyPrice: val } : l),
                              } : null);
                            }}
                            className="w-full border border-blue-300 rounded px-2.5 py-1.5 text-right font-bold text-slate-900 bg-blue-50/30 focus:border-blue-600 focus:outline-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SEÇÃO 2: DATAS E IDENTIFICAÇÃO DA FATURA */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-slate-900 flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-blue-600" />
                    2. Numeração, Tipo e Datas da Fatura
                  </h4>
                  <p className="text-xs text-slate-500">
                    Ajuste livremente a data de emissão, o período de locação que sairá impresso na fatura e a data de vencimento.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setInvoiceModal((prev) => {
                      if (!prev) return prev;
                      const refEmission = prev.issueDate || prev.periodStart;
                      if (!refEmission) return prev;
                      const calcStart = prev.isRenewal ? refEmission : (prev.periodStart || refEmission);
                      const calcEnd = addDaysIso(calcStart, 30);
                      const calcDue = addDaysIso(refEmission, 30);
                      return {
                        ...prev,
                        periodStart: calcStart,
                        periodEnd: calcEnd || prev.periodEnd,
                        dueDate: calcDue || prev.dueDate,
                      };
                    });
                  }}
                  className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold shrink-0"
                >
                  Recalcular Período e Vencimento (+30d da Emissão)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Número da Fatura / OS *">
                  <input
                    required
                    value={invoiceModal.invoiceNumber}
                    onChange={(e) => setInvoiceModal({ ...invoiceModal, invoiceNumber: e.target.value })}
                    className="input-rental font-mono font-bold"
                    placeholder="Ex.: 21436 ou OS-2026-001"
                  />
                </Field>
                <Field label="Tipo de Faturamento na Impressão *">
                  <select
                    value={invoiceModal.isRenewal ? 'renovacao' : 'locacao_inicial'}
                    onChange={(e) => setInvoiceModal({ ...invoiceModal, isRenewal: e.target.value === 'renovacao' })}
                    className="input-rental font-semibold"
                  >
                    <option value="renovacao">Renovação — Exibir &quot;LOCAÇÃO (RENOVAÇÃO)&quot;</option>
                    <option value="locacao_inicial">Locação Inicial — Exibir &quot;LOCAÇÃO&quot;</option>
                  </select>
                </Field>
                <Field label="Data de Emissão da Fatura *">
                  <input
                    required
                    type="date"
                    value={invoiceModal.issueDate}
                    onChange={(e) => {
                      const nextIssue = e.target.value;
                      const autoDue = addDaysIso(nextIssue, 30);
                      const shouldSyncStart = invoiceModal.isRenewal || invoiceModal.periodStart === invoiceModal.issueDate;
                      const nextStart = shouldSyncStart && nextIssue ? nextIssue : invoiceModal.periodStart;
                      const autoEnd = nextStart ? addDaysIso(nextStart, 30) : '';
                      setInvoiceModal({
                        ...invoiceModal,
                        issueDate: nextIssue,
                        ...(shouldSyncStart && nextIssue ? { periodStart: nextIssue } : {}),
                        ...(shouldSyncStart && autoEnd ? { periodEnd: autoEnd } : {}),
                        ...(autoDue ? { dueDate: autoDue } : {}),
                      });
                    }}
                    className="input-rental"
                  />
                </Field>
                <Field label="Início do Período de Locação *">
                  <input
                    required
                    type="date"
                    value={invoiceModal.periodStart}
                    onChange={(e) => {
                      const nextStart = e.target.value;
                      const autoEnd = addDaysIso(nextStart, 30);
                      setInvoiceModal({
                        ...invoiceModal,
                        periodStart: nextStart,
                        ...(autoEnd ? { periodEnd: autoEnd } : {}),
                      });
                    }}
                    className="input-rental"
                  />
                </Field>
                <Field label="Fim do Período de Locação *">
                  <input
                    required
                    type="date"
                    value={invoiceModal.periodEnd}
                    onChange={(e) => setInvoiceModal({ ...invoiceModal, periodEnd: e.target.value })}
                    className="input-rental"
                  />
                </Field>
                <Field label="Data de Vencimento (30 dias após emissão) *">
                  <input
                    required
                    type="date"
                    value={invoiceModal.dueDate}
                    onChange={(e) => setInvoiceModal({ ...invoiceModal, dueDate: e.target.value })}
                    className="input-rental font-bold"
                  />
                </Field>
              </div>
            </div>

            {/* SEÇÃO 3: DADOS COMERCIAIS, BANCÁRIOS E OBSERVAÇÕES DA FATURA */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
              <div>
                <h4 className="font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  3. Dados Comerciais, Contratuais e Observações que saem na Fatura
                </h4>
                <p className="text-xs text-slate-500">
                  Altere PC, Orçamento, Processo/Cotação, Obra, Responsáveis, Condição de Pagamento ou Observações que serão impressos no documento.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Orçamento(s)">
                  <input
                    value={invoiceModal.quotationRefs}
                    onChange={(e) => setInvoiceModal({ ...invoiceModal, quotationRefs: e.target.value })}
                    className="input-rental"
                    placeholder="Ex.: 21289/21321"
                  />
                </Field>
                <Field label="Pedido de Compra (PC)">
                  <input
                    value={invoiceModal.purchaseOrder}
                    onChange={(e) => setInvoiceModal({ ...invoiceModal, purchaseOrder: e.target.value })}
                    className="input-rental"
                    placeholder="Ex.: 007842"
                  />
                </Field>
                <Field label="Processo / Cotação">
                  <input
                    value={invoiceModal.processNumber}
                    onChange={(e) => setInvoiceModal({ ...invoiceModal, processNumber: e.target.value })}
                    className="input-rental"
                  />
                </Field>
                <Field label="Obra / Projeto">
                  <input
                    value={invoiceModal.project}
                    onChange={(e) => setInvoiceModal({ ...invoiceModal, project: e.target.value })}
                    className="input-rental"
                  />
                </Field>
                <Field label="Responsáveis no Cliente">
                  <input
                    value={invoiceModal.responsibles}
                    onChange={(e) => setInvoiceModal({ ...invoiceModal, responsibles: e.target.value })}
                    className="input-rental"
                  />
                </Field>
                <Field label="Condição de Pagamento">
                  <select
                    value={invoiceModal.paymentMethod}
                    onChange={(e) => setInvoiceModal({ ...invoiceModal, paymentMethod: e.target.value })}
                    className="input-rental"
                  >
                    <option value="DEPÓSITO BANCÁRIO">DEPÓSITO BANCÁRIO</option>
                    <option value="Depósito Bancário">Depósito Bancário</option>
                    <option value="Transferência Eletrônica">Transferência Eletrônica</option>
                    <option value="Boleto Bancário">Boleto Bancário</option>
                    <option value="Pix">Pix</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Dinheiro">Dinheiro</option>
                  </select>
                </Field>
                <Field label="Endereço do Cliente na Fatura" className="sm:col-span-2">
                  <input
                    value={invoiceModal.clientAddress}
                    onChange={(e) => setInvoiceModal({ ...invoiceModal, clientAddress: e.target.value })}
                    className="input-rental"
                  />
                </Field>
                <Field label="Código CNAE">
                  <input
                    value={invoiceModal.cnaeCode}
                    onChange={(e) => setInvoiceModal({ ...invoiceModal, cnaeCode: e.target.value })}
                    className="input-rental"
                  />
                </Field>
                <Field label="Descrição do CNAE" className="sm:col-span-3">
                  <input
                    value={invoiceModal.cnaeDescription}
                    onChange={(e) => setInvoiceModal({ ...invoiceModal, cnaeDescription: e.target.value })}
                    className="input-rental"
                  />
                </Field>
                <Field label="Dados Bancários / Crédito em" className="sm:col-span-3">
                  <input
                    value={invoiceModal.bankInstructions}
                    onChange={(e) => setInvoiceModal({ ...invoiceModal, bankInstructions: e.target.value })}
                    className="input-rental"
                  />
                </Field>
                <Field label="Observações para Faturamento (Corpo da Descrição)" className="sm:col-span-3">
                  <textarea
                    value={invoiceModal.billingNotes}
                    onChange={(e) => setInvoiceModal({ ...invoiceModal, billingNotes: e.target.value })}
                    className="input-rental min-h-20"
                    placeholder="Texto complementar que aparecerá na descrição da fatura..."
                  />
                </Field>
                <Field label="Observações Tributárias (Rodapé da Fatura)" className="sm:col-span-3">
                  <textarea
                    value={invoiceModal.taxNotes}
                    onChange={(e) => setInvoiceModal({ ...invoiceModal, taxNotes: e.target.value })}
                    className="input-rental min-h-20"
                  />
                </Field>
              </div>

              <label className="flex items-center gap-2.5 pt-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={invoiceModal.updateContractDefaults}
                  onChange={(e) => setInvoiceModal({ ...invoiceModal, updateContractDefaults: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600"
                />
                Atualizar também o cadastro da locação ({invoiceModal.rentalNumber}) com estes dados comerciais e novos valores para as próximas renovações
              </label>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setInvoiceModal(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                disabled={busy}
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {invoiceModal.mode === 'edit'
                  ? `Salvar Alterações da Fatura (${formatCurrency(invoiceModalTotal)})`
                  : `Confirmar e Emitir Fatura (${formatCurrency(invoiceModalTotal)})`}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editingContractTarget && (
        <Modal
          title={`Editar Dados Comerciais da Locação — ${editingContractTarget.rentalNumber}`}
          onClose={() => setEditingContractTarget(null)}
          wide
        >
          <form onSubmit={submitContractEdit} className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Orçamento(s)">
                <input
                  value={contractEditDraft.quotationRefs}
                  onChange={(e) => setContractEditDraft({ ...contractEditDraft, quotationRefs: e.target.value })}
                  className="input-rental"
                />
              </Field>
              <Field label="Pedido de Compra (PC)">
                <input
                  value={contractEditDraft.purchaseOrder}
                  onChange={(e) => setContractEditDraft({ ...contractEditDraft, purchaseOrder: e.target.value })}
                  className="input-rental"
                />
              </Field>
              <Field label="Processo / Cotação">
                <input
                  value={contractEditDraft.processNumber}
                  onChange={(e) => setContractEditDraft({ ...contractEditDraft, processNumber: e.target.value })}
                  className="input-rental"
                />
              </Field>
              <Field label="Obra / Projeto">
                <input
                  value={contractEditDraft.project}
                  onChange={(e) => setContractEditDraft({ ...contractEditDraft, project: e.target.value })}
                  className="input-rental"
                />
              </Field>
              <Field label="Responsáveis no Cliente">
                <input
                  value={contractEditDraft.responsibles}
                  onChange={(e) => setContractEditDraft({ ...contractEditDraft, responsibles: e.target.value })}
                  className="input-rental"
                />
              </Field>
              <Field label="Condição de Pagamento">
                <select
                  value={contractEditDraft.paymentMethod}
                  onChange={(e) => setContractEditDraft({ ...contractEditDraft, paymentMethod: e.target.value })}
                  className="input-rental"
                >
                  <option value="">Padrão ({settings.paymentMethod})</option>
                  <option value="DEPÓSITO BANCÁRIO">DEPÓSITO BANCÁRIO</option>
                  <option value="Depósito Bancário">Depósito Bancário</option>
                  <option value="Transferência Eletrônica">Transferência Eletrônica</option>
                  <option value="Boleto Bancário">Boleto Bancário</option>
                  <option value="Pix">Pix</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Dinheiro">Dinheiro</option>
                </select>
              </Field>
              <Field label="Observações para Faturamento" className="sm:col-span-2">
                <textarea
                  value={contractEditDraft.billingNotes}
                  onChange={(e) => setContractEditDraft({ ...contractEditDraft, billingNotes: e.target.value })}
                  className="input-rental min-h-24"
                />
              </Field>
            </div>
            <button disabled={busy} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold disabled:opacity-50">
              Salvar Dados da Locação
            </button>
          </form>
        </Modal>
      )}

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
          ['locacoes', `Locações (${rentals.length})`, Truck],
          ['equipamentos', `Equipamentos Locáveis (${assets.length})`, Gauge],
          ['servicos', `Serviços Mensais (${services.length})`, CircleDollarSign],
          ['faturas', `Faturas (${invoices.length})`, FileText],
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
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-3xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  placeholder="Buscar por locação, cliente, CNPJ, PC, orçamento, obra ou identificação CM..."
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    title="Limpar pesquisa"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <select
                value={rentalStatusFilter}
                onChange={(e) => setRentalStatusFilter(e.target.value as any)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 bg-white"
              >
                <option value="todos">Todos os Status ({rentals.length})</option>
                <option value="ativo">Ativas ({rentals.filter((r) => r.status === 'ativo').length})</option>
                <option value="rascunho">Rascunho / Aguard. Saída ({rentals.filter((r) => r.status === 'rascunho').length})</option>
                <option value="encerrado">Encerradas ({rentals.filter((r) => r.status === 'encerrado').length})</option>
              </select>
            </div>
            {canEdit && (
              <button
                onClick={() => { setAvailableAssetSearch(''); setShowRentalForm(true); clearMessages(); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" /> Nova Locação
              </button>
            )}
          </div>

          {filteredRentals.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
              Nenhuma locação encontrada para os filtros selecionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredRentals.map((rental) => {
                const activeItems = activeRentalItems(rental);
                const due = nextDueDate(rental, invoices);
                const pendingCycle = nextUninvoicedCycle(rental, invoices);
                const canGenerateInvoice = canEdit && ['ativo', 'encerrado'].includes(rental.status) && !!pendingCycle;
                const isRenewalNext = (pendingCycle?.cycleIndex || 0) > 0;
                const dispatchMovement = movements.find((movement) => movement.rentalId === rental.id && movement.type === 'saida');
                const lastReturn = movements.find((movement) => movement.rentalId === rental.id && movement.type === 'devolucao');
                const rentalInvoicesCount = invoices.filter((inv) => inv.rentalId === rental.id && inv.status !== 'cancelada').length;
                return (
                  <div key={rental.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded">{rental.rentalNumber}</span>
                          <span className={`text-[10px] uppercase font-black px-2 py-1 rounded-full ${rental.status === 'ativo' ? 'bg-emerald-50 text-emerald-700' : rental.status === 'encerrado' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{rental.status}</span>
                          {rentalInvoicesCount > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {rentalInvoicesCount} fatura(s) emitida(s)
                            </span>
                          )}
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
                      <div><span className="block text-slate-400 font-bold">Início</span>{formatDate(String(rental.dispatchAt || rental.startDate || '').slice(0, 10))}</div>
                      <div><span className="block text-slate-400 font-bold">Próx. vencimento</span>{formatDate(due)}</div>
                      <div><span className="block text-slate-400 font-bold">Ativos</span>{activeItems.length} item(ns)</div>
                      <div><span className="block text-slate-400 font-bold">Ciclo</span>30 dias fixos</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
                      {rental.items.map((item) => (
                        <div key={item.assetId} className="flex justify-between gap-3 text-xs">
                          <div><b>{item.assetCode}</b> — {item.description}{item.baseIdentification ? ` / Base ${item.baseIdentification}` : ''}</div>
                          <div className="text-right shrink-0">
                            <span className={item.returnedAt ? 'text-slate-400 line-through' : 'text-slate-800 font-bold'}>
                              {formatCurrency(item.monthlyPrice)}
                            </span>
                            {item.renewalPrice && item.renewalPrice !== item.monthlyPrice && !item.returnedAt && (
                              <span className="block text-[10px] text-blue-700 font-semibold">
                                Renov.: {formatCurrency(item.renewalPrice)}
                              </span>
                            )}
                            {item.returnedAt && <div className="text-[9px] text-slate-400">devolvido {formatDate(item.returnedAt)}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {rental.status === 'rascunho' && canEdit && (
                        <button
                          onClick={() => { setDispatchTarget(rental); setDispatchForm({ responsibleClient: '', responsibleClientDocument: '', notes: '', date: todayIso() }); }}
                          className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
                        >
                          <Truck className="w-3.5 h-3.5" /> Registrar Saída
                        </button>
                      )}
                      {canGenerateInvoice && (
                        <button
                          onClick={() => openIssueInvoiceModal(rental)}
                          disabled={busy}
                          className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {rental.status === 'encerrado'
                            ? 'Gerar Fatura Pendente'
                            : isRenewalNext
                              ? 'Gerar Próxima Fatura / Renovação'
                              : 'Gerar 1ª Fatura'}
                        </button>
                      )}
                      {canEdit && rental.status !== 'encerrado' && rental.status !== 'cancelado' && (
                        <button
                          onClick={() => openContractEditModal(rental)}
                          disabled={busy}
                          className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Editar Dados
                        </button>
                      )}
                      {rental.status === 'ativo' && canEdit && (
                        <button
                          onClick={() => openReturn(rental)}
                          className="px-3 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Receber Devolução
                        </button>
                      )}
                      {dispatchMovement && (
                        <button
                          onClick={() => setPrintDocument({ kind: 'movement', movement: dispatchMovement, rental })}
                          className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" /> Comprovante Saída
                        </button>
                      )}
                      {lastReturn && (
                        <button
                          onClick={() => setPrintDocument({ kind: 'movement', movement: lastReturn, rental })}
                          className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1"
                        >
                          <PackageCheck className="w-3.5 h-3.5" /> Última Devolução
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => removeRental(rental)}
                          disabled={busy}
                          className="px-3 py-2 rounded-lg border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                          title="Exclusão restrita ao Administrador"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Excluir Locação
                        </button>
                      )}
                    </div>
                    {(rental.purchaseOrder || rental.quotationRefs || rental.project || rental.processNumber) && (
                      <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-3 flex flex-wrap gap-x-3 gap-y-1">
                        {rental.purchaseOrder && <span><b>PC:</b> {rental.purchaseOrder}</span>}
                        {rental.quotationRefs && <span><b>Orçamento:</b> {rental.quotationRefs}</span>}
                        {rental.processNumber && <span><b>Processo:</b> {rental.processNumber}</span>}
                        {rental.project && <span><b>Obra:</b> {rental.project}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'equipamentos' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h3 className="font-extrabold text-slate-900">Equipamentos Locáveis</h3>
              <p className="text-xs text-slate-500">
                Cadastre e pesquise cada conjunto físico de manômetro + base para rastrear saída, devolução, validade de calibração e disponibilidade.
              </p>
            </div>
            {canEdit && (
              <button
                onClick={() => { setAssetDraft({ description: 'Manômetro com base', status: 'disponivel' }); setShowAssetForm(true); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex gap-1.5 items-center shrink-0"
              >
                <Plus className="w-4 h-4" /> Novo Equipamento
              </button>
            )}
          </div>

          {/* BARRA DE PESQUISA E FILTROS DOS EQUIPAMENTOS LOCÁVEIS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="relative md:col-span-5">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  placeholder="Pesquisar por Identificação/CM, TAG, Base, Certificado/COMA, Série, Marca ou Faixa..."
                />
                {assetSearch && (
                  <button
                    type="button"
                    onClick={() => setAssetSearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    title="Limpar busca"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="md:col-span-2">
                <select
                  value={assetStatusFilter}
                  onChange={(e) => setAssetStatusFilter(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 bg-white"
                >
                  <option value="todos">Status: Todos ({assetCounts.total})</option>
                  <option value="disponivel">Disponível ({assetCounts.disponivel})</option>
                  <option value="locado">Locado ({assetCounts.locado})</option>
                  <option value="manutencao">Manutenção ({assetCounts.manutencao})</option>
                  <option value="inativo">Inativo ({assetCounts.inativo})</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={assetCalibrationFilter}
                  onChange={(e) => setAssetCalibrationFilter(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 bg-white"
                >
                  <option value="todos">Calibração: Todas</option>
                  <option value="em_dia">Calibração em Dia</option>
                  <option value="vencendo_30d">Vencendo em até 30 dias ({assetCounts.vencendo30d})</option>
                  <option value="vencida">Calibração Vencida ({assetCounts.vencida})</option>
                  <option value="sem_validade">Sem Data de Validade</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={assetRangeFilter}
                  onChange={(e) => setAssetRangeFilter(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 bg-white"
                >
                  <option value="todos">Faixa: Todas</option>
                  {assetRangeOptions.map((range) => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
              <div className="flex flex-wrap gap-1.5">
                {([
                  ['todos', `Todos (${assetCounts.total})`],
                  ['disponivel', `Disponíveis (${assetCounts.disponivel})`],
                  ['locado', `Locados (${assetCounts.locado})`],
                  ['manutencao', `Manutenção (${assetCounts.manutencao})`],
                  ['inativo', `Inativos (${assetCounts.inativo})`],
                ] as Array<[typeof assetStatusFilter, string]>).map(([statusKey, label]) => (
                  <button
                    key={statusKey}
                    type="button"
                    onClick={() => setAssetStatusFilter(statusKey)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      assetStatusFilter === statusKey
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>
                  Exibindo <b>{filteredAssets.length}</b> de <b>{assets.length}</b> equipamento(s)
                </span>
                {(assetSearch || assetStatusFilter !== 'todos' || assetCalibrationFilter !== 'todos' || assetRangeFilter !== 'todos') && (
                  <button
                    type="button"
                    onClick={() => {
                      setAssetSearch('');
                      setAssetStatusFilter('todos');
                      setAssetCalibrationFilter('todos');
                      setAssetRangeFilter('todos');
                    }}
                    className="text-blue-600 hover:underline font-bold flex items-center gap-1"
                  >
                    <Filter className="w-3.5 h-3.5" /> Limpar filtros
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase">
                <tr>
                  <th className="p-3 text-left">Identificação / CM</th>
                  <th className="p-3 text-left">TAG</th>
                  <th className="p-3 text-left">Descrição</th>
                  <th className="p-3 text-left">Faixa</th>
                  <th className="p-3 text-left">Base</th>
                  <th className="p-3 text-left">Certificado / COMA</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => {
                  const calibrationExpired = !!asset.calibrationDueDate && asset.calibrationDueDate < todayIso();
                  const activeRental = asset.currentRentalId ? findRental(asset.currentRentalId) : undefined;
                  return (
                    <tr key={asset.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                      <td className="p-3 font-mono font-bold text-slate-900">{asset.assetCode}</td>
                      <td className="p-3 font-mono">{asset.tag || '-'}</td>
                      <td className="p-3">
                        {asset.description}
                        <div className="text-[10px] text-slate-400">
                          {[asset.brand, asset.model, asset.serialNumber ? `Série: ${asset.serialNumber}` : ''].filter(Boolean).join(' • ')}
                        </div>
                      </td>
                      <td className="p-3">{rangeText(asset) || '-'}</td>
                      <td className="p-3">{asset.baseIdentification || '-'}</td>
                      <td className="p-3">
                        {asset.calibrationCertificateNumber || '-'}
                        <div className={`text-[10px] ${calibrationExpired ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                          {asset.calibrationDueDate ? `${calibrationExpired ? 'VENCIDA' : 'Validade'} ${formatDate(asset.calibrationDueDate)}` : 'Validade não informada'}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full font-bold text-[11px] ${
                          asset.status === 'disponivel'
                            ? 'bg-emerald-50 text-emerald-700'
                            : asset.status === 'locado'
                              ? 'bg-blue-50 text-blue-700'
                              : asset.status === 'manutencao'
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                        }`}>
                          {asset.status}
                        </span>
                        {activeRental && (
                          <div className="text-[10px] text-slate-500 mt-1">
                            {activeRental.rentalNumber} • {activeRental.clientName}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {canEdit && asset.status !== 'locado' && (
                            <button
                              onClick={() => { setAssetDraft(asset); setShowAssetForm(true); }}
                              className="p-2 hover:bg-slate-100 rounded"
                              title="Editar equipamento"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && asset.status !== 'locado' && !asset.currentRentalId && (
                            <button
                              onClick={() => removeAsset(asset)}
                              disabled={busy}
                              className="p-2 hover:bg-red-50 text-red-600 rounded disabled:opacity-50"
                              title="Excluir equipamento locável — somente Administrador"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredAssets.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 text-sm">
                      Nenhum equipamento locável encontrado para a pesquisa ou filtro selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'servicos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-900">Serviços mensais de locação</h3>
              <p className="text-xs text-slate-500">O preço é mensal por equipamento. Você pode definir tanto o valor da locação inicial quanto o valor padrão de renovação.</p>
            </div>
            {canEdit && (
              <button
                onClick={() => { setServiceDraft({ active: true, monthlyPrice: 0 }); setShowServiceForm(true); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex gap-1 items-center"
              >
                <Plus className="w-4 h-4" /> Novo Serviço
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {services.map((service) => (
              <div key={service.id} className={`bg-white rounded-xl border p-4 ${service.active ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
                <div className="flex justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900">{service.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">{service.description}</p>
                  </div>
                  {canEdit && (
                    <button onClick={() => { setServiceDraft(service); setShowServiceForm(true); }} className="p-2 hover:bg-slate-100 rounded">
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-2">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Locação Inicial</span>
                    <span className="text-2xl font-black text-blue-700">{formatCurrency(service.monthlyPrice)}</span>
                    <span className="text-[10px] text-slate-400 font-bold"> / 30 dias</span>
                  </div>
                  {service.renewalPrice !== undefined && service.renewalPrice > 0 && (
                    <div className="text-right">
                      <span className="block text-[10px] uppercase font-bold text-amber-700">Valor Renovação</span>
                      <span className="text-lg font-black text-amber-800">{formatCurrency(service.renewalPrice)}</span>
                      <span className="text-[10px] text-slate-400 font-bold"> / 30 dias</span>
                    </div>
                  )}
                </div>
                <div className="mt-2 text-[10px] text-slate-400">CNAE {service.cnaeCode || settings.cnaeCode}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'faturas' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-slate-900">Faturas de Locação</h3>
              <p className="text-xs text-slate-500">Cada fatura corresponde a um ciclo integral de 30 dias e gera/atualiza automaticamente o Contas a Receber.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  placeholder="Buscar fatura, cliente, locação, PC ou período..."
                />
                {invoiceSearch && (
                  <button
                    type="button"
                    onClick={() => setInvoiceSearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <select
                value={invoiceTypeFilter}
                onChange={(e) => setInvoiceTypeFilter(e.target.value as any)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 bg-white"
              >
                <option value="todas">Todas as Faturas ({invoices.length})</option>
                <option value="locacao_inicial">1ª Locação</option>
                <option value="renovacao">Renovações</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase">
                <tr>
                  <th className="p-3 text-left">Fatura</th>
                  <th className="p-3 text-left">Tipo / Ciclo</th>
                  <th className="p-3 text-left">Locação / Cliente</th>
                  <th className="p-3 text-left">Período</th>
                  <th className="p-3 text-left">Vencimento</th>
                  <th className="p-3 text-right">Valor</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => {
                  const isRenewalInvoice = invoice.isRenewal ?? (Number(invoice.cycleIndex || 0) > 0);
                  return (
                    <tr key={invoice.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                      <td className="p-3 font-mono font-black text-slate-900">{invoice.invoiceNumber}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isRenewalInvoice ? 'bg-amber-100 text-amber-900' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {isRenewalInvoice ? `Renovação (${Number(invoice.cycleIndex || 0) + 1}º)` : 'Locação Inicial'}
                        </span>
                      </td>
                      <td className="p-3">
                        <b>{invoice.rentalNumber}</b>
                        <div className="text-slate-500">{invoice.clientName}</div>
                      </td>
                      <td className="p-3">{formatDate(invoice.periodStart)} a {formatDate(invoice.periodEnd)}</td>
                      <td className="p-3 font-semibold">{formatDate(invoice.dueDate)}</td>
                      <td className="p-3 text-right font-black text-slate-900">{formatCurrency(invoice.total)}</td>
                      <td className="p-3 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          {canEdit && (
                            <button
                              onClick={() => openEditInvoiceModal(invoice)}
                              disabled={busy}
                              className="px-3 py-1.5 border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold inline-flex items-center gap-1 disabled:opacity-50"
                              title="Alterar valor, datas, PC, orçamento e demais dados da fatura"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Editar Dados / Valor
                            </button>
                          )}
                          <button
                            onClick={() => setPrintDocument({ kind: 'invoice', invoice, rental: findRental(invoice.rentalId) })}
                            className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold inline-flex items-center gap-1 hover:bg-slate-50"
                          >
                            <Printer className="w-3.5 h-3.5" /> Imprimir Fatura
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => removeInvoice(invoice)}
                              disabled={busy}
                              className="px-3 py-1.5 border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-bold inline-flex items-center gap-1 disabled:opacity-50"
                              title="Exclusão restrita ao Administrador"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Excluir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredInvoices.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">Nenhuma fatura de locação encontrada.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'configuracoes' && (
        <form onSubmit={submitSettings} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5 max-w-4xl">
          <div><h3 className="font-extrabold text-slate-900">Configuração de faturamento</h3><p className="text-xs text-slate-500 mt-1">A numeração é controlada transacionalmente para impedir faturas duplicadas. Confirme o número imediatamente posterior à última fatura já utilizada.</p></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <label className="space-y-1"><span className="font-bold text-slate-600">Próximo nº da Fatura *</span><input type="number" min="1" disabled={!canEdit} value={settingsDraft.nextInvoiceNumber ?? ''} onChange={(e) => setSettingsDraft({ ...settingsDraft, nextInvoiceNumber: e.target.value ? Number(e.target.value) : undefined })} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="Ex.: 21436 se 21435 foi a última" /></label>
            <label className="space-y-1"><span className="font-bold text-slate-600">Prefixo da locação</span><input disabled={!canEdit} value={settingsDraft.rentalPrefix} onChange={(e) => setSettingsDraft({ ...settingsDraft, rentalPrefix: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></label>
            <label className="space-y-1"><span className="font-bold text-slate-600">CNAE</span><input disabled={!canEdit} value={settingsDraft.cnaeCode} onChange={(e) => setSettingsDraft({ ...settingsDraft, cnaeCode: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" /></label>
            <label className="space-y-1"><span className="font-bold text-slate-600">Condição de pagamento</span><select disabled={!canEdit} value={settingsDraft.paymentMethod} onChange={(e) => setSettingsDraft({ ...settingsDraft, paymentMethod: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2"><option value="">Selecione...</option><option value="DEPÓSITO BANCÁRIO">DEPÓSITO BANCÁRIO</option><option value="Depósito Bancário">Depósito Bancário</option><option value="Transferência Eletrônica">Transferência Eletrônica</option><option value="Cartão de Crédito">Cartão de Crédito</option><option value="Pix">Pix</option><option value="Boleto Bancário">Boleto Bancário</option><option value="Dinheiro">Dinheiro</option></select></label>
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
            <Field label="Valor mensal por equipamento (1ª Locação) *"><input required type="number" min="0.01" step="0.01" value={serviceDraft.monthlyPrice || ''} onChange={(e) => setServiceDraft({ ...serviceDraft, monthlyPrice: Number(e.target.value) })} className="input-rental" /></Field>
            <Field label="Valor padrão para Renovação por equipamento (Opcional)"><input type="number" min="0" step="0.01" value={serviceDraft.renewalPrice || ''} onChange={(e) => setServiceDraft({ ...serviceDraft, renewalPrice: e.target.value ? Number(e.target.value) : undefined })} className="input-rental" placeholder="Ex: 50.00" /></Field>
            <label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={serviceDraft.active !== false} onChange={(e) => setServiceDraft({ ...serviceDraft, active: e.target.checked })} /> Serviço ativo</label>
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Periodicidade fixa: <b>30 dias</b>. Não existe valor diário nem rateio proporcional.</div>
            <button disabled={busy} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold disabled:opacity-50">Salvar Serviço</button>
          </form>
        </Modal>
      )}

      {showAssetForm && (
        <Modal title={assetDraft.id ? 'Editar Equipamento Locável' : 'Novo Equipamento Locável'} onClose={() => setShowAssetForm(false)} wide>
          <form onSubmit={saveAsset} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Field label="Identificação / CM *"><input required value={assetDraft.assetCode || ''} onChange={(e) => setAssetDraft({ ...assetDraft, assetCode: e.target.value })} className="input-rental" placeholder="Ex.: CM-001" /></Field>
            <Field label="TAG"><input value={assetDraft.tag || ''} onChange={(e) => setAssetDraft({ ...assetDraft, tag: e.target.value })} className="input-rental" placeholder="TAG do equipamento" /></Field>
            <Field label="Descrição"><input value={assetDraft.description || ''} onChange={(e) => setAssetDraft({ ...assetDraft, description: e.target.value })} className="input-rental" /></Field>
            <Field label="Marca"><input value={assetDraft.brand || ''} onChange={(e) => setAssetDraft({ ...assetDraft, brand: e.target.value })} className="input-rental" /></Field>
            <Field label="Modelo"><input value={assetDraft.model || ''} onChange={(e) => setAssetDraft({ ...assetDraft, model: e.target.value })} className="input-rental" /></Field>
            <Field label="Nº de Série"><input value={assetDraft.serialNumber || ''} onChange={(e) => setAssetDraft({ ...assetDraft, serialNumber: e.target.value })} className="input-rental" /></Field>
            <Field label="Identificação da Base"><input value={assetDraft.baseIdentification || ''} onChange={(e) => setAssetDraft({ ...assetDraft, baseIdentification: e.target.value })} className="input-rental" /></Field>
            <Field label="Faixa mínima"><input type="number" step="any" value={assetDraft.rangeMin ?? ''} onChange={(e) => setAssetDraft({ ...assetDraft, rangeMin: e.target.value === '' ? undefined : Number(e.target.value) })} className="input-rental" /></Field>
            <Field label="Faixa máxima"><input type="number" step="any" value={assetDraft.rangeMax ?? ''} onChange={(e) => setAssetDraft({ ...assetDraft, rangeMax: e.target.value === '' ? undefined : Number(e.target.value) })} className="input-rental" /></Field>
            <Field label="Unidade"><input value={assetDraft.unit || ''} onChange={(e) => setAssetDraft({ ...assetDraft, unit: e.target.value })} className="input-rental" placeholder="bar, kgf/cm²..." /></Field>
            <Field label="Serviço mensal padrão"><select value={assetDraft.defaultServiceId || ''} onChange={(e) => setAssetDraft({ ...assetDraft, defaultServiceId: e.target.value })} className="input-rental"><option value="">Selecione</option>{activeServices.map((service) => <option value={service.id} key={service.id}>{service.name} — {formatCurrency(service.monthlyPrice)}</option>)}</select></Field>
            <Field label="Certificado de calibração / COMA"><input value={assetDraft.calibrationCertificateNumber || ''} onChange={(e) => setAssetDraft({ ...assetDraft, calibrationCertificateNumber: e.target.value })} className="input-rental" /></Field>
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
              <div className="flex flex-col gap-2 mb-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="font-bold text-slate-700">Equipamentos disponíveis *</h4>
                  <span className="text-xs text-slate-500">{rentalItemDrafts.length} selecionado(s) de {availableAssets.length} disponível(is)</span>
                </div>
                <div className="relative w-full sm:w-96">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    value={availableAssetSearch}
                    onChange={(e) => setAvailableAssetSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-xs"
                    placeholder="Filtrar por CM, TAG, base, certificado, série ou faixa..."
                  />
                  {availableAssetSearch && (
                    <button
                      type="button"
                      onClick={() => setAvailableAssetSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {filteredAvailableAssets.map((asset) => {
                  const selected = rentalItemDrafts.find((item) => item.assetId === asset.id);
                  return <div key={asset.id} className={`p-3 grid grid-cols-1 md:grid-cols-[1fr_280px] gap-3 ${selected ? 'bg-blue-50' : 'bg-white'}`}><label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" className="mt-1" checked={!!selected} onChange={() => toggleRentalAsset(asset)} /><span><b>{asset.assetCode}</b>{asset.tag ? ` • TAG ${asset.tag}` : ''} — {asset.description}{asset.baseIdentification ? ` / Base ${asset.baseIdentification}` : ''}<span className="block text-[10px] text-slate-500">{asset.calibrationCertificateNumber ? `Certificado ${asset.calibrationCertificateNumber} • ` : ''}{rangeText(asset)} {asset.calibrationDueDate ? `• Calibração válida até ${formatDate(asset.calibrationDueDate)}` : ''}</span></span></label>{selected && <select required value={selected.serviceId} onChange={(e) => setRentalItemDrafts((current) => current.map((item) => item.assetId === asset.id ? { ...item, serviceId: e.target.value } : item))} className="input-rental"><option value="">Serviço mensal...</option>{activeServices.map((service) => <option value={service.id} key={service.id}>{service.name} — {formatCurrency(service.monthlyPrice)}</option>)}</select>}</div>;
                })}
                {availableAssets.length === 0 && <div className="p-5 text-center text-slate-500 text-xs">Nenhum equipamento disponível com calibração válida. Cadastre/receba a devolução ou atualize a calibração vencida antes da saída.</div>}
                {availableAssets.length > 0 && filteredAvailableAssets.length === 0 && <div className="p-5 text-center text-slate-500 text-xs">Nenhum equipamento encontrado para o filtro informado.</div>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Orçamento(s)"><input value={rentalDraft.quotationRefs} onChange={(e) => setRentalDraft({ ...rentalDraft, quotationRefs: e.target.value })} className="input-rental" placeholder="Ex.: 21289/21321" /></Field>
              <Field label="Pedido de Compra (PC)"><input value={rentalDraft.purchaseOrder} onChange={(e) => setRentalDraft({ ...rentalDraft, purchaseOrder: e.target.value })} className="input-rental" placeholder="Ex.: 007842" /></Field>
              <Field label="Processo / Cotação"><input value={rentalDraft.processNumber} onChange={(e) => setRentalDraft({ ...rentalDraft, processNumber: e.target.value })} className="input-rental" /></Field>
              <Field label="Obra / Projeto"><input value={rentalDraft.project} onChange={(e) => setRentalDraft({ ...rentalDraft, project: e.target.value })} className="input-rental" /></Field>
              <Field label="Responsáveis no cliente"><input value={rentalDraft.responsibles} onChange={(e) => setRentalDraft({ ...rentalDraft, responsibles: e.target.value })} className="input-rental" /></Field>
              <Field label="Condição de pagamento"><select value={rentalDraft.paymentMethod} onChange={(e) => setRentalDraft({ ...rentalDraft, paymentMethod: e.target.value })} className="input-rental"><option value="">Padrão: {settings.paymentMethod}</option><option value="DEPÓSITO BANCÁRIO">DEPÓSITO BANCÁRIO</option><option value="Depósito Bancário">Depósito Bancário</option><option value="Transferência Eletrônica">Transferência Eletrônica</option><option value="Cartão de Crédito">Cartão de Crédito</option><option value="Pix">Pix</option><option value="Boleto Bancário">Boleto Bancário</option><option value="Dinheiro">Dinheiro</option></select></Field>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Field label="Data do recebimento"><input type="date" value={returnForm.date} onChange={(e) => setReturnForm({ ...returnForm, date: e.target.value })} className="input-rental" /></Field><Field label="Devolvido por (cliente) *"><input required value={returnForm.responsibleClient} onChange={(e) => setReturnForm({ ...returnForm, responsibleClient: e.target.value })} className="input-rental" /></Field><Field label="Documento / Matrícula"><input value={returnForm.responsibleClientDocument} onChange={(e) => setReturnForm({ ...returnForm, responsibleClientDocument: e.target.value })} className="input-rental" /></Field><Field label="Observações gerais"><input value={returnForm.notes} onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })} className="input-rental" /></Field>
              <Field label="Fotos / Documentos (Opcional)">
                <input type="file" multiple accept="image/*,.pdf" onChange={(e) => {
                  if (e.target.files) {
                    setReturnForm({ ...returnForm, attachments: Array.from(e.target.files) });
                  }
                }} className="input-rental file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                {returnForm.attachments.length > 0 && <div className="text-xs text-slate-500 mt-1">{returnForm.attachments.length} arquivo(s) selecionado(s)</div>}
              </Field>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">Itens marcados <b>Com avaria</b> serão enviados automaticamente para status <b>Manutenção</b>. Itens conformes retornam para <b>Disponível</b>. A devolução pode ser parcial.</div>
            <button disabled={busy} className="w-full py-2.5 bg-slate-800 text-white rounded-lg font-bold disabled:opacity-50">Confirmar Recebimento e Gerar Comprovante</button>
          </form>
        </Modal>
      )}

      {printDocument && (
        <div className="fixed inset-0 z-[100] bg-black/60 p-2 sm:p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="rental-no-print bg-slate-900 text-white rounded-t-xl px-4 py-3 flex justify-between items-center">
              <span className="font-bold text-sm">Pré-visualização do documento</span>
              <div className="flex gap-2">
                {printDocument.kind === 'invoice' && canEdit && (
                  <button
                    onClick={() => {
                      const inv = printDocument.invoice;
                      setPrintDocument(null);
                      openEditInvoiceModal(inv);
                    }}
                    className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Pencil className="w-4 h-4" /> Editar Dados da Fatura
                  </button>
                )}
                <button onClick={printNow} className="px-3 py-1.5 rounded bg-blue-600 text-xs font-bold flex items-center gap-1">
                  <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
                </button>
                <button onClick={() => setPrintDocument(null)} className="p-1.5 rounded hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
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
  const isRenewal = invoice.isRenewal !== undefined ? invoice.isRenewal : invoice.cycleIndex > 0;
  const renewal = isRenewal ? ' (RENOVAÇÃO)' : '';
  const paymentUpper = String(invoice.paymentMethod || '').toUpperCase();
  const showBankInstructions =
    (paymentUpper.includes('TRANSFER') || paymentUpper.includes('DEPÓSITO') || paymentUpper.includes('DEPOSITO') || paymentUpper.includes('PIX')) &&
    !!invoice.bankInstructions;

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
    showBankInstructions ? `CREDITAR EM: ${invoice.bankInstructions}` : '',
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
    <table className="w-full border-collapse text-xs"><thead><tr><th className="border border-black p-2 text-left">Identificação / CM</th><th className="border border-black p-2 text-left">Material</th><th className="border border-black p-2 text-left">Base</th><th className="border border-black p-2 text-left">Condição</th></tr></thead><tbody>{movement.items.map((item) => <tr key={item.assetId}><td className="border border-black p-2 font-mono font-bold">{item.assetCode}</td><td className="border border-black p-2">{item.description}{item.serialNumber ? ` • Série ${item.serialNumber}` : ''}</td><td className="border border-black p-2">{item.baseIdentification || '-'}</td><td className="border border-black p-2">{item.condition ? item.condition.toUpperCase() : (isDispatch ? 'ENTREGUE' : '-')}{item.notes ? ` — ${item.notes}` : ''}</td></tr>)}</tbody></table>
    <div className="border-x border-b border-black p-4 text-xs min-h-24"><b>OBSERVAÇÕES:</b><br />{movement.notes || (isDispatch ? 'Material entregue para locação mensal em condições de uso, conforme relação acima.' : 'Material recebido e conferido conforme relação acima.')}</div>
    {movement.attachments && movement.attachments.length > 0 && (
      <div className="border-x border-b border-black p-4 rental-no-print">
        <b className="text-xs">ANEXOS / FOTOS:</b>
        <div className="flex flex-wrap gap-2 mt-2">
          {movement.attachments.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-24 h-24 border border-slate-300 rounded overflow-hidden">
              <img src={url} alt={"Anexo " + (i + 1)} className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      </div>
    )}
    {rental && isDispatch && <div className="border-x border-b border-black p-4 text-xs"><b>Regra comercial:</b> locação em ciclos fixos de 30 dias, sem cobrança diária ou pró-rata. Primeiro vencimento: {formatDate(rental.firstDueDate)}.</div>}
    <div className="grid grid-cols-2 gap-16 mt-24 text-xs text-center"><div className="border-t border-black pt-2"><b>{movement.responsibleComanins}</b><br />Responsável COMANINS</div><div className="border-t border-black pt-2"><b>{movement.responsibleClient}</b><br />Responsável Cliente{movement.responsibleClientDocument ? ` • ${movement.responsibleClientDocument}` : ''}</div></div>
    <div className="mt-16 text-[9px] text-slate-500">Documento emitido pelo Portal Interno COMANINS em {new Date(movement.createdAt).toLocaleString('pt-BR')}.</div>
  </div>;
}
