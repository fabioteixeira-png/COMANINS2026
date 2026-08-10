import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  orderBy,
  limit,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Client, Instrument, CalibrationReport, CalibrationAuditLog, ContactMessage, DropdownOptions, EmployeeBirthday, Training, EmployeeTrainingRecord, InventoryItem, InventoryTransaction, ReferenceStandard, MedicalExam, ExamTypeItem, Payslip, RncReport, AccessAuditLog } from '../types';
import { generateAuthKey } from '../utils/authKey';
import { trackFirebaseOp } from './firebaseTelemetry';

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// Initial Data Seed Defaults
export const INITIAL_CLIENTS: Client[] = [
  {
    id: "c1",
    name: "Petrobras S.A. - Refinaria Capuava",
    cnpj: "33.000.167/0001-56",
    email: "instrumentacao@petrobras.com.br",
    phone: "(11) 4344-8000",
    city: "Mauá - SP",
    password: "123456"
  },
  {
    id: "c2",
    name: "Cervejaria Ambev - Unidade Jundiaí",
    cnpj: "07.526.557/0001-89",
    email: "manutencao.jundiai@ambev.com.br",
    phone: "(11) 4589-9200",
    city: "Jundiaí - SP",
    password: "123456"
  },
  {
    id: "c3",
    name: "Braskem Química S.A.",
    cnpj: "42.150.391/0001-22",
    email: "metrologia@braskem.com.br",
    phone: "(11) 4434-2000",
    city: "Santo André - SP",
    password: "123456"
  }
];

export const INITIAL_INSTRUMENTS: Instrument[] = [
  {
    id: "i1",
    tag: "PI-101",
    certificateNumber: "",
    coma: "CM-001",
    description: "Manômetro Analógico",
    brand: "WIKA",
    model: "213.53",
    serialNumber: "W9843212",
    category: "pressure",
    rangeMin: 0,
    rangeMax: 10,
    unit: "bar",
    mpe: 0.1,
    lastCalibrationDate: "2025-07-15",
    nextCalibrationDate: "2026-07-15",
    status: "Aguardando Triagem",
    clientId: "c1"
  },
  {
    id: "i2",
    tag: "TI-201",
    certificateNumber: "",
    coma: "CM-002",
    description: "Transmissor de Temperatura PT100",
    brand: "Rosemount",
    model: "3144P",
    serialNumber: "RM772635",
    category: "temperature",
    rangeMin: 0,
    rangeMax: 200,
    unit: "°C",
    mpe: 0.2,
    lastCalibrationDate: "2025-05-10",
    nextCalibrationDate: "2026-05-10",
    status: "Em Calibração",
    clientId: "c1"
  },
  {
    id: "i3",
    tag: "PT-302",
    certificateNumber: "",
    coma: "CM-003",
    description: "Transmissor de Pressão Hart",
    brand: "Smar",
    model: "LD301",
    serialNumber: "SM449201",
    category: "pressure",
    rangeMin: 0,
    rangeMax: 100,
    unit: "bar",
    mpe: 0.25,
    lastCalibrationDate: "2025-08-01",
    nextCalibrationDate: "2026-08-01",
    status: "Calibrado",
    clientId: "c3"
  },
  {
    id: "i4",
    tag: "TE-401",
    certificateNumber: "",
    coma: "CM-004",
    description: "Termômetro Digital Industrial",
    brand: "Incoterm",
    model: "T-Globo",
    serialNumber: "INC22039",
    category: "temperature",
    rangeMin: -50,
    rangeMax: 150,
    unit: "°C",
    mpe: 0.5,
    lastCalibrationDate: "2026-02-12",
    nextCalibrationDate: "2027-02-12",
    status: "Entregue",
    clientId: "c2"
  }
];

export const INITIAL_REPORTS: CalibrationReport[] = [
  {
    id: "r1",
    instrumentId: "i3",
    technicianName: "Eng. Carlos Moreira",
    date: "2025-08-01",
    points: [
      { id: "p1", nominalValue: 0, standardValue: 0.00, instrumentValue: 0.02, error: 0.02, mpe: 0.25, pass: true },
      { id: "p2", nominalValue: 25, standardValue: 25.00, instrumentValue: 25.05, error: 0.05, mpe: 0.25, pass: true },
      { id: "p3", nominalValue: 50, standardValue: 50.00, instrumentValue: 50.08, error: 0.08, mpe: 0.25, pass: true },
      { id: "p4", nominalValue: 75, standardValue: 75.00, instrumentValue: 74.95, error: -0.05, mpe: 0.25, pass: true },
      { id: "p5", nominalValue: 100, standardValue: 100.00, instrumentValue: 100.12, error: 0.12, mpe: 0.25, pass: true }
    ],
    maxError: 0.12,
    maxRelativeError: 0.12,
    approved: true,
    observations: "Instrumento calibrado em conformidade com o erro máximo admissível. Apresenta excelente estabilidade."
  }
];

export const INITIAL_MESSAGES: ContactMessage[] = [
  {
    id: "m1",
    name: "Mariana Costa",
    company: "Laticínios Sul de Minas",
    email: "marianacosta@suldeminas.com.br",
    phone: "(35) 3456-7890",
    message: "Gostaria de solicitar um orçamento para calibração de 12 termômetros industriais e 5 manômetros de vapor.",
    category: "calibracao",
    date: "2026-07-19",
    status: "pendente"
  }
];

export interface SavedIntake {
  id: string;
  numEntrada: string;
  clientId: string;
  dataEntrada: string;
  dataPrevistaSaida: string;
  contato: string;
  photos?: string[];
  rows: {
    quant: number;
    descricao: string;
    escala: string;
    undMedida: string;
    obs: string;
  }[];
}

export const INITIAL_INTAKES: SavedIntake[] = [];

export interface Dependent {
  id?: string;
  name: string;
  kinship?: string;
  birthDate?: string;
  cpf?: string;
}

export interface AttachedDocument {
  id?: string;
  name: string;
  url?: string;
  type?: string;
  date?: string;
}

export interface AsoContractItem {
  id: string;
  contractName: string;
  unitArea: string;
  examType: string;
  examDate: string;
  validityDate: string;
  status?: 'Apto' | 'Apto com Restrições' | 'Inapto' | 'Pendente';
  clinicDoctor?: string;
  docUrl?: string;
  notes?: string;
}

export interface AuditLogEntry {
  id?: string;
  date: string;
  user: string;
  action: string;
  details?: string;
}

import { InternalTicket } from "../types";
export interface PortalUser {
  id: string;
  name: string;
  username: string;
  role: string;
  permissionLevel?: string;
  register: string;
  password?: string;
  mustChangePassword?: boolean;

  // 1. Dados pessoais
  socialName?: string;
  cpf?: string;
  rgNumber?: string;
  rgIssuer?: string;
  rgUf?: string;
  birthDate?: string; // YYYY-MM-DD
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  naturalness?: string;
  motherName?: string;
  fatherName?: string;
  photoUrl?: string;

  // 2. Contato e endereço
  phone?: string;
  personalEmail?: string;
  workEmail?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;

  // 3. Dados profissionais
  companyUnit?: string;
  department?: string;
  costCenter?: string;
  manager?: string;
  workplace?: string;
  contractType?: string;
  admissionDate?: string;
  workSchedule?: string;
  workRegime?: string; // Presencial, Externo, Híbrido, Remoto
  salary?: number;
  unionCategory?: string;
  status?: 'Ativo' | 'Afastado' | 'Férias' | 'Desligado';

  // 4. Documentos trabalhistas
  pis?: string;
  ctps?: string;
  voterTitle?: string;
  militaryCert?: string;
  cnhNumber?: string;
  cnhCategory?: string;
  cnhValidity?: string; // YYYY-MM-DD
  professionalReg?: string; // CREA, CRT, etc.
  professionalRegValidity?: string; // YYYY-MM-DD
  asoAdmissionalDate?: string;
  asoValidity?: string; // YYYY-MM-DD
  asoContracts?: AsoContractItem[]; // ASOs por Contrato / Unidade / Área
  educationLevel?: string;
  certificatesList?: string[];

  // 5. Dados bancários e benefícios
  bank?: string;
  bankAgency?: string;
  bankAccount?: string;
  accountType?: string;
  pixKey?: string;
  transporteBenefit?: string | boolean;
  alimentacaoBenefit?: string | boolean;
  healthPlan?: string | boolean;
  lifeInsurance?: string | boolean;
  dependents?: Dependent[];

  // 6. Emergência
  emergencyContactName?: string;
  emergencyKinship?: string;
  emergencyPhone?: string;
  emergencyPhoneAlt?: string;
  medicalInfo?: string;

  // 7. Controle interno
  deliveredEquipments?: string;
  deliveredUniformsEpi?: string;
  authorizedVehicle?: string;
  attachedDocs?: AttachedDocument[];
  auditLogs?: AuditLogEntry[];
  adminNotes?: string;
}

export const INITIAL_PORTAL_USERS: PortalUser[] = [
  {
    id: "user_felype",
    name: "Felype Teixeira",
    username: "admin",
    role: "Administrador",
    permissionLevel: "Administrador",
    register: "CFT-BA 123456",
    password: "comanins2026",
    department: "Direção Geral",
    companyUnit: "COMANINS - Filial Camaçari",
    status: "Ativo",
    workEmail: "felype@comanins.com.br",
    phone: "(71) 99999-0001",
    admissionDate: "2020-01-15"
  },
  {
    id: "user_fabio",
    name: "Fabio Teixeira",
    username: "fabio",
    role: "Administrador",
    permissionLevel: "Administrador",
    register: "DIR-001",
    password: "comanins2026",
    department: "Direção / Gerência Geral",
    companyUnit: "COMANINS - Filial Camaçari",
    status: "Ativo",
    workEmail: "fabio@comanins.com.br",
    phone: "(71) 99999-0002",
    admissionDate: "1998-02-09"
  },
  {
    id: "user_emanuelle",
    name: "Emanuelle",
    username: "emanuelle",
    role: "Recursos Humanos (RH)",
    permissionLevel: "Recursos Humanos (RH)",
    register: "RH-001",
    password: "comanins2026",
    department: "Recursos Humanos / Gestão de Pessoas",
    companyUnit: "COMANINS - Filial Camaçari",
    status: "Ativo",
    workEmail: "emanuelle@comanins.com.br",
    phone: "(71) 99999-0003",
    admissionDate: "2021-03-10"
  }
];

// Helper Firestore CRUD & Sync Functions

export function getLocalCache<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(`comanins_cache_${key}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as T;
      if (parsed && typeof parsed === 'object') return parsed as T;
    }
  } catch (e) {}
  return fallback;
}

export function setLocalCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`comanins_cache_${key}`, JSON.stringify(data));
  } catch (e) {}
}

export function handleQuotaOrError(err: any): void {
  console.warn('Firestore Notice (Quota or Network):', err);
  if (err && String(err).includes('Quota limit exceeded')) {
    trackFirebaseOp('read', 50000, 'Geral');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: err }));
    }
  }
}

function getModuleNameForChannel(channelKey: string): string {
  const k = channelKey.toLowerCase();
  if (k.includes('client')) return 'Clientes / Guias';
  if (k.includes('instrument')) return 'Calibração / Instrumental';
  if (k.includes('report')) return 'Calibração / Laudos';
  if (k.includes('user') || k.includes('employee') || k.includes('exam') || k.includes('payslip') || k.includes('training')) return 'Colaboradores (RH)';
  if (k.includes('finance')) return 'Financeiro / Contratos';
  if (k.includes('intake')) return 'Recepção / Entrada de Material';
  if (k.includes('inventory')) return 'Controle de Estoque';
  if (k.includes('message')) return 'Comunicação Interna';
  if (k.includes('audit') || k.includes('rnc')) return 'Auditoria & Qualidade';
  return 'Geral';
}

// Subscription Multiplexer / Deduplicator
interface SharedSubChannel<T> {
  listeners: Set<(data: T) => void>;
  unsubFirestore: (() => void) | null;
  lastData: T | null;
  isStarting: boolean;
}

const activeChannels = new Map<string, SharedSubChannel<any>>();

export function createSharedSync<T>(
  channelKey: string,
  cacheKey: string,
  fallbackData: T,
  startListener: (onData: (data: T) => void, onError: (err: any) => void) => () => void
): (callback: (data: T) => void) => () => void {
  return (callback: (data: T) => void) => {
    let channel = activeChannels.get(channelKey);
    if (!channel) {
      channel = {
        listeners: new Set(),
        unsubFirestore: null,
        lastData: getLocalCache<T>(cacheKey, fallbackData),
        isStarting: false,
      };
      activeChannels.set(channelKey, channel);
    }

    channel.listeners.add(callback);

    // Deliver latest cached/in-memory data immediately to new subscriber
    if (channel.lastData !== null && channel.lastData !== undefined) {
      try {
        callback(channel.lastData);
      } catch (e) {
        console.error(`Error in shared sync callback (${channelKey}):`, e);
      }
    }

    // Initialize Firestore onSnapshot if not already active
    if (!channel.unsubFirestore && !channel.isStarting) {
      channel.isStarting = true;
      try {
        const unsub = startListener(
          (newData) => {
            if (channel) {
              channel.lastData = newData;
              setLocalCache(cacheKey, newData);
              
              // Track Firestore Read Telemetry
              const readCount = Array.isArray(newData) ? Math.max(1, newData.length) : 1;
              trackFirebaseOp('read', readCount, getModuleNameForChannel(channelKey));

              channel.listeners.forEach((cb) => {
                try {
                  cb(newData);
                } catch (e) {
                  console.error(`Error broadcasting update (${channelKey}):`, e);
                }
              });
            }
          },
          (err) => {
            handleQuotaOrError(err);
            if (channel && channel.lastData !== null) {
              channel.listeners.forEach((cb) => {
                try {
                  cb(channel.lastData!);
                } catch (e) {}
              });
            }
          }
        );
        channel.unsubFirestore = unsub;
      } catch (err) {
        handleQuotaOrError(err);
      } finally {
        channel.isStarting = false;
      }
    }

    // Return cleanup function
    return () => {
      if (channel) {
        channel.listeners.delete(callback);
        if (channel.listeners.size === 0) {
          if (channel.unsubFirestore) {
            try {
              channel.unsubFirestore();
            } catch (e) {}
          }
          activeChannels.delete(channelKey);
        }
      }
    };
  };
}

export async function getPaginatedDocs<T>(
  colName: string,
  pageSize: number = 25,
  lastDocSnap: QueryDocumentSnapshot<DocumentData> | null = null,
  orderByField: string = 'createdAt',
  orderDir: 'asc' | 'desc' = 'desc'
): Promise<{ items: T[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null; hasMore: boolean }> {
  try {
    const colRef = collection(db, colName);
    let q = query(colRef, orderBy(orderByField, orderDir), limit(pageSize));
    if (lastDocSnap) {
      q = query(colRef, orderBy(orderByField, orderDir), startAfter(lastDocSnap), limit(pageSize));
    }
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ ...d.data(), id: d.id } as T));
    const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    const hasMore = snap.docs.length === pageSize;
    setLocalCache(colName, items);
    return { items, lastDoc, hasMore };
  } catch (err) {
    handleQuotaOrError(err);
    const cached = getLocalCache<T[]>(colName, []);
    return { items: cached, lastDoc: null, hasMore: false };
  }
}

// 1. Clients
export async function syncClients(callback: (clients: Client[]) => void) {
  const shared = createSharedSync<Client[]>(
    'clients',
    'clients',
    INITIAL_CLIENTS,
    (onData, onError) => {
      const q = query(collection(db, 'clients'), limit(25));
      return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Client));
          onData(list);
        }
      }, onError);
    }
  );
  return shared(callback);
}

export async function addClientDoc(data: Omit<Client, 'id'>): Promise<Client> {
  const newId = 'c_' + Date.now();
  const client: Client = { ...data, id: newId };
  await setDoc(doc(db, 'clients', newId), client);
  return client;
}

export async function addClientsBulkDocs(list: Omit<Client, 'id'>[]): Promise<Client[]> {
  const result: Client[] = [];
  for (let i = 0; i < list.length; i++) {
    const newId = 'c_' + (Date.now() + i);
    const item: Client = { ...list[i], id: newId };
    await setDoc(doc(db, 'clients', newId), item);
    result.push(item);
  }
  return result;
}

export async function deleteClientDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, 'clients', id));
}

export async function updateClientDoc(client: Client): Promise<Client> {
  await setDoc(doc(db, 'clients', client.id), client, { merge: true });
  return client;
}

// 2. Instruments
export async function syncInstruments(callback: (instruments: Instrument[]) => void) {
  const shared = createSharedSync<Instrument[]>(
    'instruments',
    'instruments',
    [],
    (onData, onError) => {
      const q = query(collection(db, 'instruments'), limit(25));
      return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Instrument));
          onData(list);
        }
      }, onError);
    }
  );
  return shared(callback);
}

export async function addInstrumentDoc(data: Omit<Instrument, 'id' | 'status' | 'lastCalibrationDate' | 'nextCalibrationDate'> & Partial<Pick<Instrument, 'status' | 'lastCalibrationDate' | 'nextCalibrationDate'>>): Promise<Instrument> {
  if (data.tag) data.tag = data.tag.toUpperCase();
  if (data.model) data.model = data.model.toUpperCase();
  if (data.serialNumber) data.serialNumber = data.serialNumber.toUpperCase();

  const newId = 'i_' + Date.now();
  const inst: Instrument = {
    status: 'Aguardando Calibração',
    lastCalibrationDate: '',
    nextCalibrationDate: '',
    ...data,
    id: newId
  };
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(inst)) {
    if (val !== undefined && !Number.isNaN(val)) {
      cleaned[key] = val;
    }
  }
  await setDoc(doc(db, 'instruments', newId), cleaned);
  return inst;
}

export async function addInstrumentsBulkDocs(list: Omit<Instrument, 'id' | 'status' | 'lastCalibrationDate' | 'nextCalibrationDate'>[]): Promise<Instrument[]> {
  const result: Instrument[] = [];
  for (let i = 0; i < list.length; i++) {
    const data = list[i];
    if (data.tag) data.tag = data.tag.toUpperCase();
    if (data.model) data.model = data.model.toUpperCase();
    if (data.serialNumber) data.serialNumber = data.serialNumber.toUpperCase();

    const newId = 'i_' + (Date.now() + i);
    const item: Instrument = {
      ...data,
      id: newId,
      status: 'Aguardando Calibração',
      lastCalibrationDate: '',
      nextCalibrationDate: ''
    };
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(item)) {
      if (val !== undefined && !Number.isNaN(val)) {
        cleaned[key] = val;
      }
    }
    await setDoc(doc(db, 'instruments', newId), cleaned);
    result.push(item);
  }
  return result;
}

export async function updateInstrumentDoc(id: string, updates: Partial<Instrument>): Promise<void> {
  if (updates.tag) updates.tag = updates.tag.toUpperCase();
  if (updates.model) updates.model = updates.model.toUpperCase();
  if (updates.serialNumber) updates.serialNumber = updates.serialNumber.toUpperCase();

  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(updates)) {
    if (val === undefined) {
      if (key === 'rangeMin2' || key === 'rangeMax2' || key === 'unit2') {
        cleaned[key] = deleteField();
      }
    } else if (typeof val === 'number' && Number.isNaN(val)) {
      // skip NaN
    } else {
      cleaned[key] = val;
    }
  }
  await updateDoc(doc(db, 'instruments', id), cleaned);
}

export async function deleteInstrumentDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, 'instruments', id));
}

// 3. Calibration Reports
export async function syncReports(callback: (reports: CalibrationReport[]) => void) {
  const shared = createSharedSync<CalibrationReport[]>(
    'calibrationReports',
    'calibrationReports',
    [],
    (onData, onError) => {
      const q = query(collection(db, 'calibrationReports'), );
      return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as CalibrationReport));
          onData(list);
        }
      }, onError);
    }
  );
  return shared(callback);
}

export async function saveCalibrationDoc(data: {
  instrumentId: string;
  technicianName: string;
  accuracyClass?: string;
  mpe?: number;
  points: any[];
  observations: string;
  curveCount?: number;
  certNumber?: string;
  referenceStandardIds?: string[];
  referenceStandards?: ReferenceStandard[];
}, activeInst: Instrument): Promise<{ report: CalibrationReport; instrument: Instrument }> {
  let maxError = 0;
  let maxHysteresis = 0;

  const processedPoints = data.points.map((p, index) => {
    // legacy fallback
    if (p.standardValue !== undefined) {
      const error = Number((p.instrumentValue - p.standardValue).toFixed(4));
      const absError = Math.abs(error);
      if (absError > maxError) maxError = absError;
      const pass = absError <= (data.mpe !== undefined ? data.mpe : (activeInst.mpe || 1.0));
      return {
        id: 'p_' + index + '_' + Date.now(),
        nominalValue: Number(p.nominalValue),
        standardValue: p.standardValue,
        instrumentValue: p.instrumentValue,
        error,
        mpe: (data.mpe !== undefined ? data.mpe : (activeInst.mpe || 1.0)),
        pass
      };
    }
    
    // new trescal-style points
    if (p.nominal !== undefined && p.refAsc1 !== undefined) {
      const a1 = Number(p.refAsc1) || 0;
      const d1 = Number(p.refDesc1) || 0;
      const a2 = Number(p.refAsc2) || 0;
      const d2 = Number(p.refDesc2) || 0;
      const count = [p.refAsc1, p.refDesc1, p.refAsc2, p.refDesc2].filter(x => x !== '' && x !== undefined).length;
      const sum = [a1, d1, a2, d2].reduce((a,b, i) => {
          const val = [p.refAsc1, p.refDesc1, p.refAsc2, p.refDesc2][i];
          return a + (val !== '' && val !== undefined ? Number(val) : 0);
      }, 0);
      const avg = count > 0 ? sum / count : 0;
      const err = Number((p.nominal - avg).toFixed(2));
      const absErr = Math.abs(err);
      if (absErr > maxError) maxError = absErr;
      
      const pass = absErr <= (data.mpe !== undefined ? data.mpe : (activeInst.mpe || 1.0));
      return { ...p, pass };
    }

    // fallback for the previous new format
    const stdAsc = Number(p.standardAscending) || 0;
    const instAsc = Number(p.instrumentAscending) || 0;
    const errAsc = Number((instAsc - stdAsc).toFixed(4));
    
    const stdDesc = Number(p.standardDescending) || 0;
    const instDesc = Number(p.instrumentDescending) || 0;
    const errDesc = Number((instDesc - stdDesc).toFixed(4));
    
    const hysteresis = Number(Math.abs(instAsc - instDesc).toFixed(4));
    
    const absErrAsc = Math.abs(errAsc);
    const absErrDesc = Math.abs(errDesc);
    
    if (absErrAsc > maxError) maxError = absErrAsc;
    if (absErrDesc > maxError) maxError = absErrDesc;
    if (hysteresis > maxHysteresis) maxHysteresis = hysteresis;

    const pass = absErrAsc <= (data.mpe !== undefined ? data.mpe : (activeInst.mpe || 1.0)) && absErrDesc <= (data.mpe !== undefined ? data.mpe : (activeInst.mpe || 1.0)) && hysteresis <= (data.mpe !== undefined ? data.mpe : (activeInst.mpe || 1.0));
    return {
      id: 'p_' + index + '_' + Date.now(),
      nominalValue: Number(p.nominalValue) || 0,
      standardAscending: stdAsc,
      instrumentAscending: instAsc,
      errorAscending: errAsc,
      standardDescending: stdDesc,
      instrumentDescending: instDesc,
      errorDescending: errDesc,
      hysteresis,
      mpe: (data.mpe !== undefined ? data.mpe : (activeInst.mpe || 1.0)),
      pass
    };
  });

  const span = activeInst.rangeMax - activeInst.rangeMin;
  const maxRelativeError = span > 0 ? Number(((maxError / span) * 100).toFixed(4)) : 0;
  const approved = processedPoints.every(p => p.pass);

  const reportId = 'r_' + Date.now();
  const generatedAuthKey = generateAuthKey();
  const report: CalibrationReport = {
    id: reportId,
    certNumber: data.certNumber,
    authKey: generatedAuthKey,
    instrumentId: data.instrumentId,
    technicianName: data.technicianName || 'Técnico Responsável',
    date: new Date().toISOString().split('T')[0],
    points: processedPoints,
    maxError,
    maxRelativeError,
    maxHysteresis,
    approved,
    observations: data.observations || '',
    curveCount: data.curveCount || 5,
    referenceStandardIds: data.referenceStandardIds || [],
    referenceStandards: data.referenceStandards || []
  };

  const nextCal = new Date();
  nextCal.setFullYear(nextCal.getFullYear() + 1);

  const updatedInst: Instrument = {
    ...activeInst,
    status: 'Aguardando Emissão de Certificado',
    lastCalibrationDate: report.date,
    nextCalibrationDate: nextCal.toISOString().split('T')[0]
  };

  await Promise.all([
    setDoc(doc(db, 'calibrationReports', reportId), report),
    updateDoc(doc(db, 'instruments', activeInst.id), {
      status: 'Aguardando Emissão de Certificado',
      lastCalibrationDate: report.date,
      nextCalibrationDate: updatedInst.nextCalibrationDate,
      ...(data.accuracyClass !== undefined ? { accuracyClass: data.accuracyClass } : {}),
      ...(data.mpe !== undefined ? { mpe: data.mpe } : {})
    })
  ]);

  return { report, instrument: updatedInst };
}

export async function deleteReportDoc(reportId: string): Promise<void> {
  await deleteDoc(doc(db, 'calibrationReports', reportId));
}

// 4. Contact Messages / Leads
export async function syncMessages(callback: (messages: ContactMessage[]) => void) {
  const colRef = collection(db, 'contactMessages');
  return onSnapshot(colRef, async (snapshot) => {
    if (snapshot.empty) {
      callback([]);
    } else {
      const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as ContactMessage));
      callback(list);
    }
  }, (err) => {
    console.error('Firestore syncMessages error:', err);
  });
}

export async function addMessageDoc(data: Omit<ContactMessage, 'id' | 'date' | 'status'>): Promise<ContactMessage> {
  const newId = 'msg_' + Date.now();
  const msg: ContactMessage = {
    ...data,
    id: newId,
    date: new Date().toISOString().split('T')[0],
    status: 'pendente'
  };
  await setDoc(doc(db, 'contactMessages', newId), msg);
  return msg;
}

export async function updateMessageDoc(id: string, status: ContactMessage['status']): Promise<void> {
  await updateDoc(doc(db, 'contactMessages', id), { status });
}

// 5. Material Intakes (Guias de Entrada) & Sequencial

export interface CertSequenceConfig {
  prefix: string;
  nextNumber: number;
  year?: number;
}

export async function syncCertSequenceConfig(callback: (config: CertSequenceConfig) => void) {
  const docRef = doc(db, 'systemSettings', 'certSequence');
  return onSnapshot(docRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({ prefix: 'COMA-', nextNumber: 1, year: new Date().getFullYear() });
    } else {
      callback(snapshot.data() as CertSequenceConfig);
    }
  }, (err) => {
    console.error('Firestore syncCertSequenceConfig error:', err);
    callback({ prefix: 'COMA-', nextNumber: 1, year: new Date().getFullYear() });
  });
}

export async function saveCertSequenceConfig(config: CertSequenceConfig): Promise<void> {
  try {
    const docRef = doc(db, 'systemSettings', 'certSequence');
    await setDoc(docRef, config);
  } catch (err) {
    console.error('Error saving certSequence config:', err);
  }
}

export interface IntakeSequenceConfig {
  prefix: string;
  nextNumber: number;
}

export async function syncIntakeSequenceConfig(callback: (config: IntakeSequenceConfig) => void) {
  const docRef = doc(db, 'systemSettings', 'intakeSequence');
  return onSnapshot(docRef, (snapshot) => {
    if (!snapshot.exists()) {
      const defaultConfig = { prefix: 'C-', nextNumber: 19928 };
      setDoc(docRef, defaultConfig);
      callback(defaultConfig);
    } else {
      const data = snapshot.data();
      callback({
        prefix: data.prefix ?? 'C-',
        nextNumber: data.nextNumber ?? 19928
      });
    }
  }, (err) => {
    console.error('Firestore syncIntakeSequenceConfig error:', err);
    const saved = localStorage.getItem('comanins_intake_sequence');
    if (saved) {
      try { callback(JSON.parse(saved)); } catch (e) { callback({ prefix: 'C-', nextNumber: 19928 }); }
    } else {
      callback({ prefix: 'C-', nextNumber: 19928 });
    }
  });
}


export const DEFAULT_DROPDOWN_OPTIONS: DropdownOptions = {
  descricao: ["Manômetro", "Manômetro Digital", "Manovacuômetro", "Termômetro", "Termômetro Digital", "Vacuômetro", "Válvula de Controle", "Válvula de Segurança (PSV)", "Pressostato", "Termostato", "Chave de Nível", "Transmissor de Pressão", "Registrador Gráfico"],
  unidade: ["Kgf/cm²", "bar", "psi", "mmHg", "inHg", "mbar", "°C", "kPa", "MPa", "mmH2O"],
  material: ["Inox", "Latão", "Aço Carbono", "Monel", "Plástico"],
  conexao: ["1/4 NPT", "1/2 NPT", "1/4 BSP", "1/2 BSP", "Flangeado"],
  diametro: ["63mm", "100mm", "114mm", "150mm", "Outro"],
  condicaoDeEntrada: ["Bom", "Quebrado", "Visor trincado", "Ponteiro solto", "Sujo"],
  estoqueCategoria: ["EPI", "Uniforme", "Material de Escritório", "Ferramenta", "Outros"],
  fabricante: ["Wika", "Ashcroft", "Novus", "Salcas", "Outro"],
  tiposExame: ["Admissional", "Demissional", "Periódico", "Retorno ao Trabalho", "Mudança de Função", "Audiometria", "Outros"],
  cargos: ["Administrador", "Técnico de Laboratório", "Técnico de Instrumentação", "Financeiro", "Recursos Humanos (RH)", "Comercial"]
};

export function syncDropdownOptions(callback: (options: DropdownOptions) => void) {
  const docRef = doc(db, 'systemSettings', 'dropdownOptions');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ ...DEFAULT_DROPDOWN_OPTIONS, ...snapshot.data() as DropdownOptions });
    } else {
      callback(DEFAULT_DROPDOWN_OPTIONS);
    }
  }, (err) => {
    console.error('Firestore syncDropdownOptions error:', err);
    callback(DEFAULT_DROPDOWN_OPTIONS);
  });
}

export async function saveDropdownOptions(options: DropdownOptions): Promise<void> {
  try {
    const docRef = doc(db, 'systemSettings', 'dropdownOptions');
    await setDoc(docRef, options);
  } catch (err) {
    console.error('Error saving dropdownOptions config:', err);
  }
}

export async function saveIntakeSequenceConfig(config: IntakeSequenceConfig): Promise<void> {
  try {
    localStorage.setItem('comanins_intake_sequence', JSON.stringify(config));
    const docRef = doc(db, 'systemSettings', 'intakeSequence');
    await setDoc(docRef, config);
  } catch (err) {
    console.error('Error saving intakeSequence config:', err);
  }
}

export async function syncIntakes(callback: (intakes: SavedIntake[]) => void) {
  const cached = getLocalCache<SavedIntake[]>('savedIntakes', []);
  if (cached.length > 0) callback(cached);
  const q = query(collection(db, 'savedIntakes'), limit(50));
  return onSnapshot(q, async (snapshot) => {
    if (!snapshot.empty) {
      // Sort in memory by ID descending (which is essentially timestamp descending since IDs are Date.now())
      const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as SavedIntake));
      list.sort((a, b) => {
        if (a.id > b.id) return -1;
        if (a.id < b.id) return 1;
        return 0;
      });
      setLocalCache('savedIntakes', list);
      callback(list);
    } else {
      callback([]);
    }
  }, (err) => {
    handleQuotaOrError(err);
    callback(getLocalCache<SavedIntake[]>('savedIntakes', []));
  });
}

export async function clearAllSavedIntakes(): Promise<void> {
  try {
    const colRef = collection(db, 'savedIntakes');
    const snapshot = await getDocs(colRef);
    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref);
    }
  } catch (err) {
    console.error('Error clearing savedIntakes:', err);
  }
}

export async function saveIntakeDoc(intake: SavedIntake): Promise<void> {
  await setDoc(doc(db, 'savedIntakes', intake.id), intake);
}

export async function updateIntakePhotosDoc(id: string, photos: string[]): Promise<void> {
  await updateDoc(doc(db, 'savedIntakes', id), { photos });
}

export async function deleteIntakeDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, 'savedIntakes', id));
}

// 6. Portal Users
export async function syncPortalUsers(callback: (users: PortalUser[]) => void) {
  const colRef = collection(db, 'portalUsers');
  const seedRef = doc(db, 'systemSettings', 'portalUsersSeeded');
  return onSnapshot(colRef, async (snapshot) => {
    if (snapshot.empty) {
      try {
        const seedSnap = await getDoc(seedRef);
        if (!seedSnap.exists()) {
          await setDoc(seedRef, { seededAt: new Date().toISOString() });
          for (const user of INITIAL_PORTAL_USERS) {
            await setDoc(doc(colRef, user.id), user);
          }
          try {
            localStorage.setItem('comanins_portal_users_cache', JSON.stringify(INITIAL_PORTAL_USERS));
          } catch (e) {}
          callback(INITIAL_PORTAL_USERS);
          return;
        }
      } catch (e) {
        console.error('Error checking portalUsers seed flag:', e);
      }
      const saved = localStorage.getItem('comanins_portal_users_cache');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            callback(parsed);
            return;
          }
        } catch (e) {}
      }
      callback(INITIAL_PORTAL_USERS);
    } else {
      const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as PortalUser));
      try {
        localStorage.setItem('comanins_portal_users_cache', JSON.stringify(list));
      } catch (e) {}
      callback(list);
    }
  }, (err) => {
    console.warn('Firestore syncPortalUsers notice (Quota or network):', err);
    if (err && String(err).includes('Quota limit exceeded')) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: err }));
      }
    }
    const saved = localStorage.getItem('comanins_portal_users_cache');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          callback(parsed);
          return;
        }
      } catch (e) {}
    }
    callback(INITIAL_PORTAL_USERS);
  });
}

export async function addPortalUserDoc(user: Omit<PortalUser, 'id'>): Promise<PortalUser> {
  const newId = 'user_' + Date.now();
  const fullUser: PortalUser = { ...user, id: newId };
  try {
    await setDoc(doc(db, 'portalUsers', newId), fullUser);
  } catch (e) {
    console.warn('Firestore addPortalUserDoc offline fallback:', e);
  }
  // Always update local cache
  try {
    const saved = localStorage.getItem('comanins_portal_users_cache');
    const list: PortalUser[] = saved ? JSON.parse(saved) : [...INITIAL_PORTAL_USERS];
    const updated = [fullUser, ...list.filter(u => u.id !== newId)];
    localStorage.setItem('comanins_portal_users_cache', JSON.stringify(updated));
  } catch (e) {}
  return fullUser;
}

export async function updatePortalUserDoc(id: string, updates: Partial<PortalUser>): Promise<void> {
  try {
    await updateDoc(doc(db, 'portalUsers', id), updates);
  } catch (e) {
    console.warn('Firestore updatePortalUserDoc offline fallback:', e);
  }
  try {
    const saved = localStorage.getItem('comanins_portal_users_cache');
    const list: PortalUser[] = saved ? JSON.parse(saved) : [...INITIAL_PORTAL_USERS];
    const updated = list.map(u => u.id === id ? { ...u, ...updates } : u);
    localStorage.setItem('comanins_portal_users_cache', JSON.stringify(updated));
  } catch (e) {}
}

export async function deletePortalUserDoc(idOrUsername: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'portalUsers', idOrUsername));
  } catch (e) {
    console.warn('Firestore deletePortalUserDoc offline fallback:', e);
  }
  try {
    const saved = localStorage.getItem('comanins_portal_users_cache');
    const list: PortalUser[] = saved ? JSON.parse(saved) : [...INITIAL_PORTAL_USERS];
    const updated = list.filter(u => u.id !== idOrUsername && u.username !== idOrUsername);
    localStorage.setItem('comanins_portal_users_cache', JSON.stringify(updated));
  } catch (e) {}
}

// 7. Employee Birthdays
export async function syncEmployeeBirthdays(callback: (birthdays: EmployeeBirthday[]) => void) {
  const cached = getLocalCache<EmployeeBirthday[]>('employeeBirthdays', []);
  if (cached.length > 0) callback(cached);
  const q = query(collection(db, 'employeeBirthdays'), limit(25));
  return onSnapshot(q, async (snapshot) => {
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as EmployeeBirthday));
      setLocalCache('employeeBirthdays', list);
      callback(list);
    }
  }, (err) => {
    handleQuotaOrError(err);
    callback(getLocalCache<EmployeeBirthday[]>('employeeBirthdays', []));
  });
}

export async function addEmployeeBirthdayDoc(data: Omit<EmployeeBirthday, 'id'>): Promise<EmployeeBirthday> {
  const newId = 'bday_' + Date.now();
  const fullBday: EmployeeBirthday = { ...data, id: newId };
  await setDoc(doc(db, 'employeeBirthdays', newId), fullBday);
  return fullBday;
}

export async function deleteEmployeeBirthdayDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, 'employeeBirthdays', id));
}



// 8. Trainings
export async function syncTrainings(callback: (trainings: Training[]) => void) {
  const colRef = collection(db, 'trainings');
  return onSnapshot(colRef, (snapshot) => {
    const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Training));
    callback(list);
  }, (err) => {
    console.error('Firestore syncTrainings error:', err);
  });
}

export async function addTrainingDoc(data: Omit<Training, 'id'>): Promise<Training> {
  const newId = 'tr_' + Date.now();
  const fullItem: Training = { ...data, id: newId };
  await setDoc(doc(db, 'trainings', newId), fullItem);
  return fullItem;
}

export async function updateTrainingDoc(id: string, data: Partial<Training>): Promise<void> {
  await updateDoc(doc(db, 'trainings', id), data);
}

export async function deleteTrainingDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, 'trainings', id));
}

// 9. Employee Trainings
export async function syncEmployeeTrainings(callback: (records: EmployeeTrainingRecord[]) => void) {
  const colRef = collection(db, 'employeeTrainings');
  return onSnapshot(colRef, (snapshot) => {
    const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as EmployeeTrainingRecord));
    callback(list);
  }, (err) => {
    console.error('Firestore syncEmployeeTrainings error:', err);
  });
}

export async function addEmployeeTrainingDoc(data: Omit<EmployeeTrainingRecord, 'id'>): Promise<EmployeeTrainingRecord> {
  const newId = 'etr_' + Date.now();
  const fullItem: EmployeeTrainingRecord = { ...data, id: newId };
  await setDoc(doc(db, 'employeeTrainings', newId), fullItem);
  return fullItem;
}

export async function updateEmployeeTrainingDoc(id: string, data: Partial<EmployeeTrainingRecord>): Promise<void> {
  await updateDoc(doc(db, 'employeeTrainings', id), data);
}

export async function deleteEmployeeTrainingDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, 'employeeTrainings', id));
}

export async function syncCustomLogo(callback: (logoUrl: string) => void) {
  const docRef = doc(db, 'systemSettings', 'customLogo');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data().url || '');
    } else {
      callback('');
    }
  }, (err) => {
    console.error('Firestore syncCustomLogo error:', err);
    callback('');
  });
}

export async function saveCustomLogoConfig(url: string): Promise<void> {
  try {
    const docRef = doc(db, 'systemSettings', 'customLogo');
    await setDoc(docRef, { url });
  } catch (err) {
    console.error('Error saving customLogo config:', err);
  }
}

export async function syncHeaderLogo(callback: (logoUrl: string) => void) {
  const docRef = doc(db, 'systemSettings', 'headerLogo');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data().url || '');
    } else {
      callback('');
    }
  }, (err) => {
    console.error('Firestore syncHeaderLogo error:', err);
    callback('');
  });
}

export async function saveHeaderLogoConfig(url: string): Promise<void> {
  try {
    const docRef = doc(db, 'systemSettings', 'headerLogo');
    await setDoc(docRef, { url });
  } catch (err) {
    console.error('Error saving headerLogo config:', err);
  }
}

export async function syncCompanySettings(callback: (data: any) => void) {
  const docRef = doc(db, 'systemSettings', 'companyInfo');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data());
    }
  }, (err) => {
    console.error('Firestore syncCompanySettings error:', err);
  });
}

export async function saveCompanySettings(data: any): Promise<void> {
  try {
    const docRef = doc(db, 'systemSettings', 'companyInfo');
    await setDoc(docRef, data);
  } catch (err) {
    console.error('Error saving companyInfo config:', err);
  }
}

export async function syncSitePhotosConfig(callback: (photos: any[]) => void) {
  const colRef = collection(db, 'sitePhotos');
  return onSnapshot(colRef, (colSnapshot) => {
    if (!colSnapshot.empty) {
      const photos: any[] = [];
      colSnapshot.forEach((docSnap) => {
        photos.push({ id: docSnap.id, ...docSnap.data() });
      });
      photos.sort((a, b) => {
        const orderA = typeof a.order === 'number' ? a.order : (parseInt((a.id || '').replace(/\D/g, '')) || 0);
        const orderB = typeof b.order === 'number' ? b.order : (parseInt((b.id || '').replace(/\D/g, '')) || 0);
        return orderA - orderB;
      });
      callback(photos);
    } else {
      const docRef = doc(db, 'systemSettings', 'sitePhotos');
      onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().list) {
          callback(docSnap.data().list);
        }
      });
    }
  }, (err) => {
    console.error('Firestore syncSitePhotosConfig error:', err);
  });
}

export async function saveSitePhotosConfig(list: any[]): Promise<void> {
  const errors: any[] = [];
  try {
    for (let i = 0; i < list.length; i++) {
      try {
        const item = list[i];
        const photoId = item.id || `photo${i + 1}`;
        const photoRef = doc(db, 'sitePhotos', photoId);
        await setDoc(photoRef, {
          id: photoId,
          title: item.title || '',
          badge: item.badge || '',
          imageUrl: item.imageUrl || '',
          description: item.description || '',
          order: i
        }, { merge: true });
      } catch (err) {
        console.error(`Error saving photo ${i}:`, err);
        errors.push(err);
      }
    }

    try {
      const docRef = doc(db, 'systemSettings', 'sitePhotos');
      await setDoc(docRef, { list, updatedAt: new Date().toISOString() });
    } catch (e) {
      // Ignore single doc 1MB limit error if it happens
    }
    
    if (errors.length > 0) {
      throw new Error('Some photos failed to save. They might be too large.');
    }
  } catch (err) {
    console.error('Error saving sitePhotos config:', err);
    throw err;
  }
}


// Inventory Items
export const syncInventoryItems = (callback: (items: InventoryItem[]) => void) => {
  const cached = getLocalCache<InventoryItem[]>('inventoryItems', []);
  if (cached.length > 0) callback(cached);
  const q = query(collection(db, 'inventoryItems'), limit(25));
  return onSnapshot(q, (snapshot) => {
    const items: InventoryItem[] = [];
    snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() } as InventoryItem));
    setLocalCache('inventoryItems', items);
    callback(items);
  }, (err) => {
    handleQuotaOrError(err);
    callback(getLocalCache<InventoryItem[]>('inventoryItems', []));
  });
};

export const addInventoryItemDoc = async (item: Omit<InventoryItem, 'id'>) => {
  const newRef = doc(collection(db, 'inventoryItems'));
  await setDoc(newRef, item);
};

export const updateInventoryItemDoc = async (id: string, updates: Partial<InventoryItem>) => {
  const docRef = doc(db, 'inventoryItems', id);
  await updateDoc(docRef, updates);
};

export const deleteInventoryItemDoc = async (id: string) => {
  await deleteDoc(doc(db, 'inventoryItems', id));
};

// Inventory Transactions
export const syncInventoryTransactions = (callback: (transactions: InventoryTransaction[]) => void) => {
  const cached = getLocalCache<InventoryTransaction[]>('inventoryTransactions', []);
  if (cached.length > 0) callback(cached);
  const q = query(collection(db, 'inventoryTransactions'), orderBy('date', 'desc'), limit(25));
  return onSnapshot(q, (snapshot) => {
    const transactions: InventoryTransaction[] = [];
    snapshot.forEach(doc => transactions.push({ id: doc.id, ...doc.data() } as InventoryTransaction));
    setLocalCache('inventoryTransactions', transactions);
    callback(transactions);
  }, (err) => {
    handleQuotaOrError(err);
    callback(getLocalCache<InventoryTransaction[]>('inventoryTransactions', []));
  });
};

export const addInventoryTransactionDoc = async (transaction: Omit<InventoryTransaction, 'id'>) => {
  const newRef = doc(collection(db, 'inventoryTransactions'));
  await setDoc(newRef, transaction);
};

// Reference Standards (Padrões de Referência)
export function syncReferenceStandards(callback: (standards: ReferenceStandard[]) => void) {
  const cached = getLocalCache<ReferenceStandard[]>('referenceStandards', []);
  if (cached.length > 0) callback(cached);
  const q = query(collection(db, 'referenceStandards'), limit(25));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as ReferenceStandard));
    setLocalCache('referenceStandards', list);
    callback(list);
  }, (err) => {
    handleQuotaOrError(err);
    callback(getLocalCache<ReferenceStandard[]>('referenceStandards', []));
  });
}

export async function addReferenceStandardDoc(data: Omit<ReferenceStandard, 'id'>): Promise<ReferenceStandard> {
  const newId = 'std_' + Date.now();
  const item: ReferenceStandard = { ...data, id: newId };
  await setDoc(doc(db, 'referenceStandards', newId), item);
  return item;
}

export async function updateReferenceStandardDoc(id: string, updates: Partial<ReferenceStandard>): Promise<void> {
  await updateDoc(doc(db, 'referenceStandards', id), updates);
}

export async function deleteReferenceStandardDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, 'referenceStandards', id));
}

export async function syncMedicalExams(callback: (exams: MedicalExam[]) => void) {
  const cached = getLocalCache<MedicalExam[]>('medical_exams', []);
  if (cached.length > 0) callback(cached);
  const q = query(collection(db, 'medical_exams'), limit(25));
  return onSnapshot(q, async (snapshot) => {
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as MedicalExam));
      setLocalCache('medical_exams', list);
      callback(list);
    }
  }, (err) => {
    handleQuotaOrError(err);
    callback(getLocalCache<MedicalExam[]>('medical_exams', []));
  });
}

export async function addMedicalExamDoc(data: Omit<MedicalExam, 'id'>): Promise<MedicalExam> {
  const newId = 'exam_' + Date.now();
  const exam: MedicalExam = { ...data, id: newId };
  await setDoc(doc(db, 'medical_exams', newId), exam);
  return exam;
}

export async function updateMedicalExamDoc(id: string, updates: Partial<MedicalExam>): Promise<void> {
  await updateDoc(doc(db, 'medical_exams', id), updates);
}

export async function deleteMedicalExamDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, 'medical_exams', id));
}

export async function syncExamTypes(callback: (types: ExamTypeItem[]) => void) {
  const docRef = doc(db, 'systemSettings', 'examTypes');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data().types as ExamTypeItem[]);
    } else {
      callback([
        { id: '1', name: 'Admissional', description: 'Realizado antes de o funcionário iniciar suas atividades.', validityMonths: null },
        { id: '2', name: 'Demissional', description: 'Realizado no desligamento do funcionário.', validityMonths: null },
        { id: '3', name: 'Periódico', description: 'Realizado em intervalos regulares.', validityMonths: 12 },
        { id: '4', name: 'Retorno ao Trabalho', description: 'Após afastamento igual ou superior a 30 dias por doença ou acidente.', validityMonths: null },
        { id: '5', name: 'Mudança de Função', description: 'Antes da mudança de função ou setor que implique alteração de risco.', validityMonths: null },
        { id: '6', name: 'Audiometria', description: 'Avaliação da capacidade auditiva.', validityMonths: 6 }
      ]);
    }
  }, (err) => {
    console.error('Firestore syncExamTypes error:', err);
    callback([]);
  });
}

export async function saveExamTypes(types: ExamTypeItem[]): Promise<void> {
  await setDoc(doc(db, 'systemSettings', 'examTypes'), { types });
}

export async function clearAndResetDatabase(): Promise<void> {
  const collectionsToClear = [
    'clients',
    'instruments',
    'calibrationReports',
    'contactMessages',
    'portalUsers',
    'savedIntakes',
    'sitePhotos',
    'inventoryItems',
    'inventoryTransactions',
    'referenceStandards',
    'medical_exams',
    'payslips'
  ];

  for (const colName of collectionsToClear) {
    try {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      for (const d of snapshot.docs) {
        await deleteDoc(doc(db, colName, d.id));
      }
    } catch (e) {
      console.error(`Error clearing collection ${colName}:`, e);
    }
  }

  try {
    const settingsCol = collection(db, 'systemSettings');
    const settingsSnap = await getDocs(settingsCol);
    for (const d of settingsSnap.docs) {
      await deleteDoc(doc(db, 'systemSettings', d.id));
    }
  } catch (e) {
    console.error('Error clearing systemSettings:', e);
  }

  for (const client of INITIAL_CLIENTS) {
    await setDoc(doc(db, 'clients', client.id), client);
  }
  for (const inst of INITIAL_INSTRUMENTS) {
    await setDoc(doc(db, 'instruments', inst.id), inst);
  }
  for (const r of INITIAL_REPORTS) {
    await setDoc(doc(db, 'calibrationReports', r.id), r);
  }
  for (const m of INITIAL_MESSAGES) {
    await setDoc(doc(db, 'contactMessages', m.id), m);
  }
  for (const u of INITIAL_PORTAL_USERS) {
    await setDoc(doc(db, 'portalUsers', u.id), u);
  }

  await setDoc(doc(db, 'systemSettings', 'clientsSeeded'), { seededAt: new Date().toISOString() });
}

export async function resetIndividualCollection(type: string): Promise<void> {
  if (type === 'clients') {
    const colRef = collection(db, 'clients');
    const snapshot = await getDocs(colRef);
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, 'clients', d.id));
    }
    for (const client of INITIAL_CLIENTS) {
      await setDoc(doc(db, 'clients', client.id), client);
    }
  } else if (type === 'instruments') {
    const colRef = collection(db, 'instruments');
    const snapshot = await getDocs(colRef);
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, 'instruments', d.id));
    }
    for (const inst of INITIAL_INSTRUMENTS) {
      await setDoc(doc(db, 'instruments', inst.id), inst);
    }
  } else if (type === 'calibrationReports') {
    const colRef = collection(db, 'calibrationReports');
    const snapshot = await getDocs(colRef);
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, 'calibrationReports', d.id));
    }
    for (const r of INITIAL_REPORTS) {
      await setDoc(doc(db, 'calibrationReports', r.id), r);
    }
  } else if (type === 'contactMessages') {
    const colRef = collection(db, 'contactMessages');
    const snapshot = await getDocs(colRef);
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, 'contactMessages', d.id));
    }
    for (const m of INITIAL_MESSAGES) {
      await setDoc(doc(db, 'contactMessages', m.id), m);
    }
  } else if (type === 'portalUsers') {
    const colRef = collection(db, 'portalUsers');
    const snapshot = await getDocs(colRef);
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, 'portalUsers', d.id));
    }
    for (const u of INITIAL_PORTAL_USERS) {
      await setDoc(doc(db, 'portalUsers', u.id), u);
    }
  } else if (type === 'savedIntakes') {
    const colRef = collection(db, 'savedIntakes');
    const snapshot = await getDocs(colRef);
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, 'savedIntakes', d.id));
    }
    const photosCol = collection(db, 'sitePhotos');
    const photosSnap = await getDocs(photosCol);
    for (const d of photosSnap.docs) {
      await deleteDoc(doc(db, 'sitePhotos', d.id));
    }
  } else if (type === 'inventory') {
    const colRef1 = collection(db, 'inventoryItems');
    const snap1 = await getDocs(colRef1);
    for (const d of snap1.docs) {
      await deleteDoc(doc(db, 'inventoryItems', d.id));
    }
    const colRef2 = collection(db, 'inventoryTransactions');
    const snap2 = await getDocs(colRef2);
    for (const d of snap2.docs) {
      await deleteDoc(doc(db, 'inventoryTransactions', d.id));
    }
  } else if (type === 'referenceStandards') {
    const colRef = collection(db, 'referenceStandards');
    const snapshot = await getDocs(colRef);
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, 'referenceStandards', d.id));
    }
  } else if (type === 'medical_exams') {
    const colRef = collection(db, 'medical_exams');
    const snapshot = await getDocs(colRef);
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, 'medical_exams', d.id));
    }
  } else if (type === 'payslips') {
    const colRef = collection(db, 'payslips');
    const snapshot = await getDocs(colRef);
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, 'payslips', d.id));
    }
  }
}

// 8. Payslips (Contra-cheques)
export async function syncPayslips(callback: (payslips: Payslip[]) => void) {
  const cached = getLocalCache<Payslip[]>('payslips', []);
  if (cached.length > 0) callback(cached);
  const q = query(collection(db, 'payslips'), limit(25));
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Payslip));
      setLocalCache('payslips', list);
      callback(list);
    }
  }, (err) => {
    handleQuotaOrError(err);
    callback(getLocalCache<Payslip[]>('payslips', []));
  });
}

export async function addPayslipDoc(data: Omit<Payslip, 'id'>): Promise<Payslip> {
  const newId = 'payslip_' + Date.now();
  const payslip: Payslip = { ...data, id: newId };
  await setDoc(doc(db, 'payslips', newId), payslip);
  return payslip;
}

export async function updatePayslipDoc(id: string, updates: Partial<Payslip>): Promise<void> {
  await updateDoc(doc(db, 'payslips', id), updates);
}

export async function deletePayslipDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, 'payslips', id));
}

// 9. Calibration Audit Logs (Auditoria de Tempo de Calibração)
export async function syncCalibrationAuditLogs(callback: (logs: CalibrationAuditLog[]) => void) {
  const cached = getLocalCache<CalibrationAuditLog[]>('calibrationAuditLogs', []);
  if (cached.length > 0) callback(cached);
  const q = query(collection(db, 'calibrationAuditLogs'), limit(25));
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as CalibrationAuditLog));
      list.sort((a, b) => new Date(b.endTime || b.startTime).getTime() - new Date(a.endTime || a.startTime).getTime());
      setLocalCache('calibrationAuditLogs', list);
      callback(list);
    }
  }, (err) => {
    handleQuotaOrError(err);
    callback(getLocalCache<CalibrationAuditLog[]>('calibrationAuditLogs', []));
  });
}

export async function addCalibrationAuditLogDoc(data: Omit<CalibrationAuditLog, 'id'>): Promise<CalibrationAuditLog> {
  const newId = 'audit_' + Date.now();
  const logEntry: CalibrationAuditLog = { ...data, id: newId };
  await setDoc(doc(db, 'calibrationAuditLogs', newId), logEntry);
  return logEntry;
}

export async function deleteCalibrationAuditLogDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, 'calibrationAuditLogs', id));
}

// 10. RNC Reports (Relatórios de Não Conformidade)
export async function syncRncReports(callback: (reports: RncReport[]) => void) {
  const cached = getLocalCache<RncReport[]>('rncReports', []);
  if (cached.length > 0) callback(cached);
  const q = query(collection(db, 'rncReports'), orderBy('date', 'desc'), limit(25));
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as RncReport));
      setLocalCache('rncReports', list);
      callback(list);
    }
  }, (err) => {
    handleQuotaOrError(err);
    callback(getLocalCache<RncReport[]>('rncReports', []));
  });
}

export async function saveRncReportDoc(data: RncReport): Promise<void> {
  await setDoc(doc(db, 'rncReports', data.id), data);
}

export async function deleteRncDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, 'rncReports', id));
}




// --- FINANCE MODULE ---

import { FinanceTransaction, FinanceContract, FinanceMeasurement } from '../types';

export const syncFinanceTransactions = (callback: (transactions: FinanceTransaction[]) => void) => {
  const shared = createSharedSync<FinanceTransaction[]>(
    'financeTransactions',
    'financeTransactions',
    [],
    (onData, onError) => {
      const q = query(collection(db, 'financeTransactions'), orderBy('date', 'desc'), limit(25));
      return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinanceTransaction));
        onData(items);
      }, onError);
    }
  );
  return shared(callback);
};

export const addFinanceTransaction = async (transaction: Omit<FinanceTransaction, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'financeTransactions'), {
    ...transaction,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
};

export const updateFinanceTransaction = async (id: string, updates: Partial<FinanceTransaction>) => {
  const docRef = doc(db, 'financeTransactions', id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
};

export const deleteFinanceTransaction = async (id: string) => {
  const docRef = doc(db, 'financeTransactions', id);
  await deleteDoc(docRef);
};

export const syncFinanceContracts = (callback: (contracts: FinanceContract[]) => void) => {
  const shared = createSharedSync<FinanceContract[]>(
    'financeContracts',
    'financeContracts',
    [],
    (onData, onError) => {
      const q = query(collection(db, 'financeContracts'), limit(25));
      return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinanceContract));
        onData(items);
      }, onError);
    }
  );
  return shared(callback);
};

export const addFinanceContract = async (contract: Omit<FinanceContract, 'id'>) => {
  const docRef = await addDoc(collection(db, 'financeContracts'), contract);
  return docRef.id;
};

export const updateFinanceContract = async (id: string, updates: Partial<FinanceContract>) => {
  const docRef = doc(db, 'financeContracts', id);
  await updateDoc(docRef, updates);
};

export const deleteFinanceContract = async (id: string) => {
  const docRef = doc(db, 'financeContracts', id);
  await deleteDoc(docRef);
};

export const syncFinanceMeasurements = (callback: (measurements: FinanceMeasurement[]) => void) => {
  const shared = createSharedSync<FinanceMeasurement[]>(
    'financeMeasurements',
    'financeMeasurements',
    [],
    (onData, onError) => {
      const q = query(collection(db, 'financeMeasurements'), orderBy('createdAt', 'desc'), limit(25));
      return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinanceMeasurement));
        onData(items);
      }, onError);
    }
  );
  return shared(callback);
};

export const addFinanceMeasurement = async (measurement: Omit<FinanceMeasurement, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'financeMeasurements'), {
    ...measurement,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
};

export const updateFinanceMeasurement = async (id: string, updates: Partial<FinanceMeasurement>) => {
  const docRef = doc(db, 'financeMeasurements', id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
};

export const deleteFinanceMeasurement = async (id: string) => {
  const docRef = doc(db, 'financeMeasurements', id);
  await deleteDoc(docRef);
};

// Generic Finance Operations
export const syncFinanceCollection = <T>(collectionName: string, callback: (data: T[]) => void) => {
  const shared = createSharedSync<T[]>(
    `financeCollection_${collectionName}`,
    collectionName,
    [],
    (onData, onError) => {
      const q = query(collection(db, collectionName), limit(25));
      return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
        onData(items);
      }, onError);
    }
  );
  return shared(callback);
};

export const addFinanceDoc = async (collectionName: string, data: any) => {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return docRef.id;
};

export const updateFinanceDoc = async (collectionName: string, id: string, updates: any) => {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString()
  });
};

export const deleteFinanceDoc = async (collectionName: string, id: string) => {
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
};


export async function syncInternalTickets(callback: (tickets: InternalTicket[]) => void) {
  try {
    const cached = getLocalCache<InternalTicket[]>('internal_tickets', []);
    if (cached.length > 0) callback(cached);
    const q = query(collection(db, "internal_tickets"), limit(25));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as InternalTicket));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLocalCache('internal_tickets', list);
        callback(list);
      },
      (error) => {
        handleQuotaOrError(error);
        callback(getLocalCache<InternalTicket[]>('internal_tickets', []));
      }
    );
  } catch (err) {
    console.error("Error setting up internal tickets sync:", err);
    return () => {};
  }
}

export async function saveInternalTicket(ticket: InternalTicket): Promise<void> {
  try {
    const docRef = doc(db, "internal_tickets", ticket.id);
    await setDoc(docRef, ticket);
  } catch (err) {
    console.error("Error saving internal ticket:", err);
    throw err;
  }
}

export async function deleteInternalTicket(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "internal_tickets", id));
  } catch (err) {
    console.error("Error deleting internal ticket:", err);
    throw err;
  }
}

// 10. Access Audit Logs (Acessos Fora de Horário)
export async function syncAccessAuditLogs(callback: (logs: AccessAuditLog[]) => void) {
  const cached = getLocalCache<AccessAuditLog[]>('accessAuditLogs', []);
  if (cached.length > 0) callback(cached);
  const q = query(collection(db, 'accessAuditLogs'), limit(25));
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback([]);
      return;
    }
    const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AccessAuditLog));
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setLocalCache('accessAuditLogs', list);
    callback(list);
  }, (err) => {
    handleQuotaOrError(err);
    callback(getLocalCache<AccessAuditLog[]>('accessAuditLogs', []));
  });
}

export async function addAccessAuditLog(data: Omit<AccessAuditLog, 'id'>): Promise<AccessAuditLog> {
  const newId = 'access_audit_' + Date.now();
  const logEntry: AccessAuditLog = { ...data, id: newId };
  await setDoc(doc(db, 'accessAuditLogs', newId), logEntry);
  return logEntry;
}
