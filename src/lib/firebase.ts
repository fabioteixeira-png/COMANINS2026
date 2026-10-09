import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  getFirestore,
  where,
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  getCountFromServer,
  onSnapshot,
  updateDoc,
  deleteDoc,
  deleteField,
  documentId,
  query,
  orderBy,
  limit,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot
, runTransaction, writeBatch } from "firebase/firestore";
import firebaseConfig from '../../firebase-applet-config.json';
import { Client, Instrument, InstrumentType, CalibrationReport, CalibrationAuditLog, ContactMessage, DropdownOptions, EmployeeBirthday, Training, EmployeeTrainingRecord, InventoryItem, InventoryTransaction, ReferenceStandard, CalibrationStandardValidation, MedicalExam, ExamTypeItem, Payslip, RncReport, AccessAuditLog, HealthProgramDocument, RentalService, RentalAsset, RentalContract, RentalInvoice, RentalMovement, RentalSettings } from '../types';
import { generateAuthKey } from '../utils/authKey';
import { trackFirebaseOp } from './firebaseTelemetry';
import { readPortalFastCache, writePortalFastCache, DEFAULT_FAST_CACHE_MAX_AGE_MS } from './portalFastCache';

import { getAuth } from 'firebase/auth';

// Initialize Firebase.
// The internal portal and the client portal deliberately use different named
// Firebase Auth app instances. Firebase Auth persistence is keyed by app name,
// so a client login in another tab can no longer replace the authenticated
// internal employee session (and vice versa) on the same browser/origin.
const app = getApps().some((existing) => existing.name === '[DEFAULT]')
  ? getApp()
  : initializeApp(firebaseConfig);
const clientAuthApp = getApps().find((existing) => existing.name === 'clientPortalAuth')
  ?? initializeApp(firebaseConfig, 'clientPortalAuth');

export const auth = getAuth(app);
export const clientAuth = getAuth(clientAuthApp);

export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const storage = getStorage(app);

const refreshCurrentInternalClaims = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');

  const currentToken = await user.getIdToken();
  const response = await fetch('/api/auth/sync-internal-profile', {
    method: 'POST',
    headers: { Authorization: `Bearer ${currentToken}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success !== true) {
    throw new Error(
      payload?.error ||
      'Não foi possível atualizar as permissões da sessão. Saia e entre novamente no sistema.',
    );
  }

  // Force Firebase Auth to mint a new token containing the claims just written
  // by the trusted backend. This is required for Firestore rules that depend on
  // the administrator profile during an administrative calibration replacement.
  await user.getIdToken(true);
};

const isFirestorePermissionDenied = (error: any): boolean => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || error || '').toLowerCase();
  return code.includes('permission-denied') || message.includes('missing or insufficient permissions');
};

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error('Não foi possível preparar o arquivo para upload.');
  return await response.blob();
};

const extensionFromContentType = (contentType: string): string => {
  const normalized = String(contentType || '').toLowerCase();
  if (normalized.includes('png')) return 'png';
  if (normalized.includes('webp')) return 'webp';
  if (normalized.includes('pdf')) return 'pdf';
  if (normalized.includes('spreadsheetml')) return 'xlsx';
  if (normalized.includes('ms-excel')) return 'xls';
  if (normalized.includes('wordprocessingml')) return 'docx';
  if (normalized.includes('msword')) return 'doc';
  if (normalized.includes('text/plain')) return 'txt';
  return 'jpg';
};

const safeStorageSegment = (value: string): string =>
  String(value || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);


const uploadOperationalImageViaBackend = async (
  purpose: 'instrument-registration' | 'instrument-calibrated' | 'intake-entry',
  entityId: string,
  imageDataUrl: string,
  sequence = 0,
): Promise<{ url: string; path: string }> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const token = await user.getIdToken();
  const response = await fetch('/api/internal/upload-operational-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ purpose, entityId, imageDataUrl, sequence }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success !== true || !data?.url || !data?.path) {
    throw new Error(data?.error || 'Não foi possível enviar a imagem ao Storage.');
  }
  return { url: String(data.url), path: String(data.path) };
};


export type CorporateFilePurpose =
  | 'employee-document'
  | 'employee-aso'
  | 'employee-training'
  | 'payslip'
  | 'health-program'
  | 'finance-document';

export interface CorporateFileUploadResult {
  storagePath: string;
  fileName: string;
  contentType: string;
  size: number;
  sha256: string;
  version: number;
}

const corporateFileAuthHeaders = async (): Promise<Record<string, string>> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  return { Authorization: `Bearer ${await user.getIdToken()}` };
};

export async function uploadCorporateFile(
  file: Blob,
  purpose: CorporateFilePurpose,
  entityId: string,
  documentType: string,
  fileName?: string,
): Promise<CorporateFileUploadResult> {
  const headers = await corporateFileAuthHeaders();
  const finalFileName = fileName || (file instanceof File ? file.name : 'arquivo');
  const response = await fetch('/api/internal/corporate-files', {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': file.type || 'application/octet-stream',
      'X-Upload-Purpose': purpose,
      'X-Entity-Id': entityId,
      'X-Document-Type': encodeURIComponent(documentType || 'documento'),
      'X-File-Name': encodeURIComponent(finalFileName || 'arquivo'),
    },
    body: file,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success !== true) {
    const code = String(payload?.error || 'UPLOAD_FAILED');
    if (code === 'FILE_TOO_LARGE') throw new Error('O arquivo excede o limite de 20 MB.');
    if (code === 'UNSUPPORTED_FILE_TYPE') throw new Error('Tipo de arquivo não permitido.');
    if (code === 'FORBIDDEN') throw new Error('Seu perfil não possui permissão para anexar este documento.');
    throw new Error('Não foi possível enviar o documento ao Storage.');
  }
  return {
    storagePath: String(payload.storagePath || ''),
    fileName: String(payload.fileName || finalFileName),
    contentType: String(payload.contentType || file.type || ''),
    size: Number(payload.size || file.size || 0),
    sha256: String(payload.sha256 || ''),
    version: Number(payload.version || Date.now()),
  };
}

export async function uploadCorporateDataUrl(
  dataUrl: string,
  purpose: CorporateFilePurpose,
  entityId: string,
  documentType: string,
  fileName: string,
): Promise<CorporateFileUploadResult> {
  const blob = await dataUrlToBlob(dataUrl);
  return uploadCorporateFile(blob, purpose, entityId, documentType, fileName);
}

export async function fetchCorporateFileBlobUrl(storagePath: string): Promise<string> {
  const headers = await corporateFileAuthHeaders();
  const response = await fetch('/api/internal/corporate-files/download', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ storagePath }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    if (payload?.error === 'FORBIDDEN') {
      throw new Error('Você não possui permissão para visualizar este documento.');
    }
    if (payload?.error === 'FILE_INTEGRITY_CHECK_FAILED') {
      throw new Error('A verificação de integridade do arquivo falhou. O documento não foi aberto.');
    }
    throw new Error('Não foi possível carregar o documento.');
  }
  return URL.createObjectURL(await response.blob());
}

export async function openCorporateFile(storagePath: string): Promise<void> {
  const popup = typeof window !== 'undefined' ? window.open('', '_blank') : null;
  try {
    const blobUrl = await fetchCorporateFileBlobUrl(storagePath);
    if (popup) popup.location.href = blobUrl;
    else window.open(blobUrl, '_blank');
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 5 * 60 * 1000);
  } catch (error) {
    if (popup) popup.close();
    throw error;
  }
}

export async function downloadCorporateFile(storagePath: string, fileName: string): Promise<void> {
  const blobUrl = await fetchCorporateFileBlobUrl(storagePath);
  try {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName || 'documento';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  }
}

async function archiveCriticalRecord(collectionName: string, recordId: string): Promise<void> {
  const headers = await corporateFileAuthHeaders();
  const response = await fetch('/api/internal/archive-record', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ collectionName, recordId }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (payload?.error === 'ADMIN_REQUIRED') throw new Error('Somente o perfil Administrador pode excluir ou arquivar registros financeiros.');
    if (payload?.error === 'FORBIDDEN') throw new Error('Seu perfil não possui permissão para arquivar este registro.');
    if (payload?.error === 'RECORD_NOT_FOUND') throw new Error('Registro não encontrado.');
    throw new Error(payload?.message || payload?.error || 'Não foi possível arquivar o registro.');
  }
}

const stripUndefinedDeep = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(stripUndefinedDeep).filter((item) => item !== undefined);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, stripUndefinedDeep(item)]),
    );
  }
  return value;
};

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

// Production data is loaded exclusively from Firestore; no demo seed data is embedded.

export interface IntakeDevolutionRow {
  instrumentId: string;
  tag: string;
  certificateNumber: string;
  documentType: "Certificado" | "RNC";
  description: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  range?: string;
  service: string;
  result: string;
  calibrationDate?: string;
  nextCalibrationDate?: string;
}

export interface SavedIntake {
  id: string;
  numEntrada: string;
  clientId: string;
  dataEntrada: string;
  dataPrevistaSaida: string;
  contato: string;
  photos?: string[];
  // Legacy single photo retained only for viewing old records.
  photoDevolution?: string;
  devolutionGeneratedAt?: string;
  devolutionGeneratedBy?: string;
  devolutionRows?: IntakeDevolutionRow[];
  deliveryInstrumentPhotos?: string[];
  deliveryFormPhotos?: string[];
  deliveryFinalizedAt?: string;
  deliveryFinalizedBy?: string;
  deliveryLocked?: boolean;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletedByUid?: string;
  createdAt?: string;
  createdBy?: string;
  createdByUid?: string;
  updatedAt?: string;
  updatedBy?: string;
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

export interface EmployeeAsoRecord extends AsoContractItem {
  employeeId: string;
  employeeName: string;
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
  docUrl?: string; // legado: Base64 ou URL externa
  docStoragePath?: string;
  docFileName?: string;
  docContentType?: string;
  docSize?: number;
  docSha256?: string;
  docVersion?: number;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  notes?: string;
}

export interface AuditLogEntry {
  id?: string;
  date: string;
  user: string;
  action: string;
  details?: string;
}

import { InternalTicket, CompanyCommunication } from "../types";
export interface PortalUser {
  id: string;
  name: string;
  username: string;
  role: string;
  permissionLevel?: string;
  accessProfileId?: string;
  accessProfileName?: string;
  allowedModules?: string[];
  editableModules?: string[];
  accessProfileVersion?: number;
  register: string;
  mustChangePassword?: boolean;
  passwordChangeRequired?: boolean;
  authUid?: string;
  authEmail?: string;
  signaturePath?: string;
  signatureVersion?: number;
  signatureDate?: string;

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


export interface EmployeeDocument {
  id: string;
  userId: string;
  name: string;
  type: string;
  url: string; // legado: Base64/URL externa
  storagePath?: string;
  fileName?: string;
  contentType?: string;
  size?: number;
  sha256?: string;
  fileVersion?: number;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  date: string;
}

export async function addEmployeeDocument(docData: Omit<EmployeeDocument, 'id'>): Promise<EmployeeDocument> {
  if (!db) throw new Error("Firebase não inicializado.");
  const docRef = await addDoc(collection(db, 'employeeDocuments'), docData);
  return { id: docRef.id, ...docData };
}

export async function getEmployeeDocuments(userId: string, username?: string, cpf?: string): Promise<EmployeeDocument[]> {
  if (!db) return [];
  try {
    const docs: EmployeeDocument[] = [];
    const addUniqueDocs = (snapshot: any) => {
      snapshot.forEach((docSnap: any) => {
        if (!docs.some(d => d.id === docSnap.id)) {
          const item = { id: docSnap.id, ...docSnap.data() } as EmployeeDocument;
          if (item.isDeleted !== true) docs.push(item);
        }
      });
    };

    const keysToSearch = new Set<string>();
    if (userId) keysToSearch.add(userId);
    if (username) keysToSearch.add(username);
    if (cpf) keysToSearch.add(cpf);

    for (const key of keysToSearch) {
      const qUser = query(collection(db, 'employeeDocuments'), where('userId', '==', key));
      const snapUser = await getDocs(qUser);
      addUniqueDocs(snapUser);

      const qEmp = query(collection(db, 'employeeDocuments'), where('employeeId', '==', key));
      const snapEmp = await getDocs(qEmp);
      addUniqueDocs(snapEmp);
    }

    return docs;
  } catch (error) {
    console.error("Erro ao buscar documentos do colaborador:", error);
    return [];
  }
}

export async function deleteEmployeeDocument(docId: string): Promise<void> {
  if (!db) throw new Error("Firebase não inicializado.");
  await archiveCriticalRecord('employeeDocuments', docId);
}

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
  cacheHydrationStarted: boolean;
  remoteDelivered: boolean;
}

const activeChannels = new Map<string, SharedSubChannel<any>>();

type SharedSyncCacheBackend = 'localStorage' | 'indexedDB' | 'none';

export function createSharedSync<T>(
  channelKey: string,
  cacheKey: string,
  fallbackData: T,
  startListener: (onData: (data: T, authoritative?: boolean) => void, onError: (err: any) => void) => () => void,
  options?: {
    persistCache?: boolean;
    cacheBackend?: SharedSyncCacheBackend;
    cacheMaxAgeMs?: number;
    userScopedCache?: boolean;
  }
): (callback: (data: T) => void) => () => void {
  const requestedPersistence = options?.persistCache ?? true;
  const cacheBackend: SharedSyncCacheBackend = !requestedPersistence
    ? 'none'
    : (options?.cacheBackend || 'localStorage');
  const cacheMaxAgeMs = options?.cacheMaxAgeMs ?? DEFAULT_FAST_CACHE_MAX_AGE_MS;
  const userScopedCache = options?.userScopedCache !== false;
  const cacheUserId = userScopedCache ? (auth.currentUser?.uid || 'anonymous') : 'global';
  const activeChannelKey = userScopedCache ? `${cacheUserId}::${channelKey}` : channelKey;

  return (callback: (data: T) => void) => {
    let channel = activeChannels.get(activeChannelKey);
    if (!channel) {
      channel = {
        listeners: new Set(),
        unsubFirestore: null,
        lastData: cacheBackend === 'localStorage' ? getLocalCache<T>(cacheKey, fallbackData) : null,
        isStarting: false,
        cacheHydrationStarted: false,
        remoteDelivered: false,
      };
      activeChannels.set(activeChannelKey, channel);
    }

    channel.listeners.add(callback);

    // localStorage is synchronous. IndexedDB is hydrated asynchronously but, in
    // normal use, still resolves long before a network round-trip. A remote
    // snapshot always wins if it arrives first.
    if (channel.lastData !== null && channel.lastData !== undefined) {
      try {
        callback(channel.lastData);
      } catch (e) {
        console.error(`Error in shared sync callback (${channelKey}):`, e);
      }
    } else if (cacheBackend === 'indexedDB' && !channel.cacheHydrationStarted) {
      channel.cacheHydrationStarted = true;
      const currentChannel = channel;
      void readPortalFastCache<T>(cacheKey, cacheUserId, cacheMaxAgeMs).then((cached) => {
        // If Firestore's own local cache already emitted data while IndexedDB
        // was opening, keep the first usable snapshot instead of replacing it
        // with a potentially older portal cache.
        if (cached === null || currentChannel.remoteDelivered || currentChannel.lastData !== null) return;
        currentChannel.lastData = cached;
        currentChannel.listeners.forEach((cb) => {
          try {
            cb(cached);
          } catch (e) {
            console.error(`Error hydrating fast cache (${channelKey}):`, e);
          }
        });
      }).catch(() => {});
    }

    // Initialize Firestore onSnapshot if not already active. Firestore remains
    // authoritative; cached data is only a fast first paint.
    if (!channel.unsubFirestore && !channel.isStarting) {
      channel.isStarting = true;
      try {
        const unsub = startListener(
          (newData, authoritative = true) => {
            if (channel) {
              // Firestore may emit an empty memory-cache snapshot before the
              // server answers. Do not let that erase a useful IndexedDB first
              // paint. The first server-backed snapshot always wins.
              if (authoritative === false && channel.lastData !== null) return;
              if (authoritative) channel.remoteDelivered = true;
              channel.lastData = newData;
              if (authoritative && cacheBackend === 'localStorage') {
                setLocalCache(cacheKey, newData);
              } else if (authoritative && cacheBackend === 'indexedDB') {
                void writePortalFastCache(cacheKey, cacheUserId, newData);
              }

              // Track only server-backed reads; memory-cache emissions are not
              // billed as another remote read and should not inflate telemetry.
              if (authoritative) {
                const readCount = Array.isArray(newData) ? Math.max(1, newData.length) : 1;
                trackFirebaseOp('read', readCount, getModuleNameForChannel(channelKey));
              }

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
          activeChannels.delete(activeChannelKey);
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
const sanitizeClientRecord = (client: Client): Client => {
  const {
    password,
    portalAccessCredentialEnc,
    portalAccessVersion,
    ...safeClient
  } = client as Client & {
    portalAccessCredentialEnc?: string;
    portalAccessVersion?: number;
  };
  return safeClient as Client;
};

export async function syncClients(callback: (clients: Client[]) => void) {
  try { localStorage.removeItem('comanins_cache_clients'); } catch (e) {}
  const q = query(collection(db, 'clients'));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(d =>
      sanitizeClientRecord({ ...d.data(), id: d.id } as Client)
    );
    callback(list);
  }, (err) => {
    handleQuotaOrError(err);
    callback([]);
  });
}

export async function addClientDoc(data: Omit<Client, 'id'>): Promise<Client> {
  const newId = 'c_' + Date.now();
  const client: Client = { ...data, id: newId };
  await setDoc(doc(db, 'clients', newId), client);
  return sanitizeClientRecord(client);
}

export async function addClientsBulkDocs(list: Omit<Client, 'id'>[]): Promise<Client[]> {
  const result: Client[] = [];
  for (let i = 0; i < list.length; i++) {
    const newId = 'c_' + (Date.now() + i);
    const item: Client = { ...list[i], id: newId };
    await setDoc(doc(db, 'clients', newId), item);
    result.push(sanitizeClientRecord(item));
  }
  return result;
}

export async function deleteClientDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, 'clients', id));
}

export async function updateClientDoc(client: Client): Promise<Client> {
  await setDoc(doc(db, 'clients', client.id), client, { merge: true });
  return sanitizeClientRecord(client);
}

// 2. Instruments
const INSTRUMENT_PAGE_SIZE = 1000;
const INSTRUMENT_FAST_CACHE_KEY = 'instruments';
const instrumentCache = new Map<string, Instrument>();
let instrumentLoadPromise: Promise<void> | null = null;
let instrumentCacheHydrationPromise: Promise<void> | null = null;
let instrumentInitialLoadComplete = false;
let instrumentLiveUnsubscribe: (() => void) | null = null;
let instrumentCacheUserId = '';
let instrumentPersistTimer: ReturnType<typeof setTimeout> | null = null;
const instrumentSubscribers = new Set<(instruments: Instrument[]) => void>();

const ensureInstrumentCacheScope = () => {
  const nextUserId = auth.currentUser?.uid || 'anonymous';
  if (instrumentCacheUserId === nextUserId) return nextUserId;

  instrumentCacheUserId = nextUserId;
  instrumentCache.clear();
  instrumentInitialLoadComplete = false;
  instrumentLoadPromise = null;
  instrumentCacheHydrationPromise = null;
  if (instrumentLiveUnsubscribe) {
    try { instrumentLiveUnsubscribe(); } catch (e) {}
    instrumentLiveUnsubscribe = null;
  }
  if (instrumentPersistTimer) {
    clearTimeout(instrumentPersistTimer);
    instrumentPersistTimer = null;
  }
  return nextUserId;
};

const schedulePersistInstrumentCache = () => {
  const userId = ensureInstrumentCacheScope();
  if (instrumentPersistTimer) clearTimeout(instrumentPersistTimer);
  instrumentPersistTimer = setTimeout(() => {
    instrumentPersistTimer = null;
    const snapshot = deduplicateInstrumentsByCertificate(Array.from(instrumentCache.values()));
    void writePortalFastCache(INSTRUMENT_FAST_CACHE_KEY, userId, snapshot);
  }, 180);
};

const hydrateInstrumentCacheFromFastCache = async (): Promise<void> => {
  ensureInstrumentCacheScope();
  if (instrumentCache.size > 0) return;
  if (instrumentCacheHydrationPromise) return instrumentCacheHydrationPromise;
  const userId = instrumentCacheUserId;
  const task = (async () => {
    const cached = await readPortalFastCache<Instrument[]>(
      INSTRUMENT_FAST_CACHE_KEY,
      userId,
      DEFAULT_FAST_CACHE_MAX_AGE_MS,
    );
    // Se a rede já terminou enquanto o IndexedDB era lido, não reintroduzimos
    // dados antigos sobre o snapshot autoritativo.
    if (!cached || instrumentInitialLoadComplete || instrumentCacheUserId !== userId) return;
    cached
      .filter((instrument) => instrument && instrument.id && (instrument as any).isDeleted !== true)
      .forEach((instrument) => mergeInstrumentIntoCache(instrument));
    if (instrumentCache.size > 0) notifyInstrumentSubscribers();
  })().finally(() => {
    if (instrumentCacheHydrationPromise === task) instrumentCacheHydrationPromise = null;
  });
  instrumentCacheHydrationPromise = task;
  return task;
};

const normalizeInstrumentCertificate = (instrument: Partial<Instrument>): string =>
  String(instrument.certificateNumber || instrument.coma || '')
    .trim()
    .toUpperCase();

const instrumentStatusPriority = (status?: Instrument['status']): number => {
  switch (status) {
    case 'Entregue':
      return 8;
    case 'Disponível para Retirada':
    case 'Disponível na Prateleira':
    case 'Não Conforme':
    case 'RNC':
      return 7;
    case 'Aguardando Emissão de Certificado':
      return 6;
    case 'Calibrado':
      return 5;
    case 'Em Calibração':
      return 3;
    case 'Aguardando Calibração':
    case 'Aguardando Triagem':
      return 2;
    default:
      return 1;
  }
};

const instrumentEvidencePriority = (instrument: Instrument): number =>
  Number(Boolean(instrument.lastCalibrationDate)) * 4 +
  Number(Boolean(instrument.photoCalibrated)) * 2 +
  Number(Boolean(instrument.photoRegistration));

const chooseCanonicalInstrument = (current: Instrument, candidate: Instrument): Instrument => {
  const statusDifference =
    instrumentStatusPriority(candidate.status) - instrumentStatusPriority(current.status);
  if (statusDifference !== 0) return statusDifference > 0 ? candidate : current;

  const evidenceDifference =
    instrumentEvidencePriority(candidate) - instrumentEvidencePriority(current);
  if (evidenceDifference !== 0) return evidenceDifference > 0 ? candidate : current;

  const currentCreatedAt = Date.parse(String(current.createdAt || ''));
  const candidateCreatedAt = Date.parse(String(candidate.createdAt || ''));
  if (Number.isFinite(currentCreatedAt) && Number.isFinite(candidateCreatedAt)) {
    if (currentCreatedAt !== candidateCreatedAt) {
      return candidateCreatedAt < currentCreatedAt ? candidate : current;
    }
  }

  return String(candidate.id || '').localeCompare(String(current.id || ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  }) < 0
    ? candidate
    : current;
};

/**
 * Consolida somente documentos que violam a unicidade do número de certificado.
 * Nenhum documento é apagado: a função seleciona o registro operacional canônico
 * para impedir linhas, contadores e seletores duplicados na interface.
 */
export const deduplicateInstrumentsByCertificate = (
  instruments: Instrument[],
): Instrument[] => {
  const withoutCertificate: Instrument[] = [];
  const byCertificate = new Map<string, Instrument>();

  instruments
    .filter((instrument) => (instrument as any).isDeleted !== true)
    .forEach((instrument) => {
      const certificateKey = normalizeInstrumentCertificate(instrument);
      if (!certificateKey) {
        withoutCertificate.push(instrument);
        return;
      }

      const current = byCertificate.get(certificateKey);
      byCertificate.set(
        certificateKey,
        current ? chooseCanonicalInstrument(current, instrument) : instrument,
      );
    });

  return [...byCertificate.values(), ...withoutCertificate];
};

const notifyInstrumentSubscribers = () => {
  const snapshot = deduplicateInstrumentsByCertificate(
    Array.from(instrumentCache.values()),
  )
    .sort((a, b) => String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true }));
  instrumentSubscribers.forEach((subscriber) => subscriber(snapshot));
  if (snapshot.length > 0) schedulePersistInstrumentCache();
};

const mergeInstrumentIntoCache = (instrument: Instrument) => {
  instrumentCache.set(instrument.id, instrument);
};

const ensureInstrumentLiveListener = (fromIso: string) => {
  if (instrumentLiveUnsubscribe) return;
  const liveQuery = query(
    collection(db, 'instruments'),
    where('updatedAt', '>=', fromIso),
    orderBy('updatedAt', 'asc'),
  );
  instrumentLiveUnsubscribe = onSnapshot(liveQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'removed') {
        instrumentCache.delete(change.doc.id);
        return;
      }
      const data = change.doc.data();
      if (data.isDeleted === true) {
        instrumentCache.delete(change.doc.id);
      } else {
        mergeInstrumentIntoCache({ id: change.doc.id, ...data } as Instrument);
      }
    });
    notifyInstrumentSubscribers();
    schedulePersistInstrumentCache();
  }, (error) => {
    console.error('Instrument incremental listener error:', error);
  });
};

const loadInstrumentsInPages = async (force = false): Promise<void> => {
  ensureInstrumentCacheScope();
  if (instrumentInitialLoadComplete && !force) return;
  if (instrumentLoadPromise && !force) return instrumentLoadPromise;
  const liveStartIso = new Date(Date.now() - 5000).toISOString();
  ensureInstrumentLiveListener(liveStartIso);

  const task = (async () => {
    const cachedIdsBeforeRefresh = new Set(instrumentCache.keys());
    const activeServerIds = new Set<string>();
    let cursor: QueryDocumentSnapshot<DocumentData> | null = null;
    while (true) {
      const pageQuery = cursor
        ? query(
            collection(db, 'instruments'),
            orderBy(documentId()),
            startAfter(cursor),
            limit(INSTRUMENT_PAGE_SIZE),
          )
        : query(
            collection(db, 'instruments'),
            orderBy(documentId()),
            limit(INSTRUMENT_PAGE_SIZE),
          );
      const page = await getDocs(pageQuery);
      page.docs.forEach((instrumentDoc) => {
        const instrument = { id: instrumentDoc.id, ...instrumentDoc.data() } as Instrument;
        if ((instrument as any).isDeleted === true) {
          instrumentCache.delete(instrumentDoc.id);
          return;
        }
        activeServerIds.add(instrumentDoc.id);
        mergeInstrumentIntoCache(instrument);
      });

      // Mescla com alterações capturadas pelo listener incremental durante a carga.
      notifyInstrumentSubscribers();

      if (page.size < INSTRUMENT_PAGE_SIZE) break;
      cursor = page.docs[page.docs.length - 1] || null;
      if (!cursor) break;
    }
    // Remove apenas itens que vieram do cache anterior e não existem mais no
    // snapshot completo. Alterações novas recebidas pelo listener durante a
    // carga não pertencem a cachedIdsBeforeRefresh e são preservadas.
    cachedIdsBeforeRefresh.forEach((id) => {
      if (!activeServerIds.has(id)) instrumentCache.delete(id);
    });
    notifyInstrumentSubscribers();
    instrumentInitialLoadComplete = true;
    schedulePersistInstrumentCache();
  })().finally(() => {
    if (instrumentLoadPromise === task) instrumentLoadPromise = null;
  });

  instrumentLoadPromise = task;
  return task;
};

export async function syncInstruments(callback: (instruments: Instrument[]) => void) {
  ensureInstrumentCacheScope();
  instrumentSubscribers.add(callback);
  if (instrumentCache.size > 0) notifyInstrumentSubscribers();

  // Cache-first: hidrata o último snapshot local antes da carga paginada. A tela
  // deixa de iniciar zerada após F5/login e a nuvem revalida logo em seguida.
  void (async () => {
    try {
      await hydrateInstrumentCacheFromFastCache();
      await loadInstrumentsInPages();
    } catch (error) {
      console.error('Error loading instruments cache/network:', error);
    }
  })();

  return () => {
    instrumentSubscribers.delete(callback);
  };
}

export async function countInstrumentsForIntake(intakeNumber: string): Promise<number> {
  const normalized = String(intakeNumber || '').trim();
  if (!normalized) return 0;

  const q = query(
    collection(db, 'instruments'),
    where('numeroDaEntrada', '==', normalized),
  );
  const snapshot = await getDocs(q);
  const activeInstruments = snapshot.docs.map(
    (instrumentDoc) =>
      ({ id: instrumentDoc.id, ...instrumentDoc.data() }) as Instrument,
  );
  return deduplicateInstrumentsByCertificate(activeInstruments).length;
}

export async function instrumentCertificateExists(certificateNumber: string): Promise<boolean> {
  const normalized = String(certificateNumber || '').trim().toUpperCase();
  if (!normalized) return false;

  const byCertificate = await getDocs(
    query(
      collection(db, 'instruments'),
      where('certificateNumber', '==', normalized),
      limit(1),
    ),
  );
  if (!byCertificate.empty) return true;

  const byComa = await getDocs(
    query(
      collection(db, 'instruments'),
      where('coma', '==', normalized),
      limit(1),
    ),
  );
  return !byComa.empty;
}

const buildInstrumentRegistrationSnapshot = (instrument: Record<string, any>, capturedAt: string) => {
  const snapshotData: Record<string, any> = {};
  Object.entries(instrument).forEach(([key, value]) => {
    if (key === 'registrationSnapshot' || value === undefined || typeof value === 'function') return;
    if (typeof value === 'number' && Number.isNaN(value)) return;
    snapshotData[key] = value;
  });
  return { capturedAt, schemaVersion: 1 as const, data: snapshotData };
};

export async function addInstrumentDoc(data: Omit<Instrument, 'id' | 'status' | 'lastCalibrationDate' | 'nextCalibrationDate'> & Partial<Pick<Instrument, 'status' | 'lastCalibrationDate' | 'nextCalibrationDate'>>): Promise<Instrument> {
  if (data.tag) data.tag = data.tag.toUpperCase();
  if (data.model) data.model = data.model.toUpperCase();
  if (data.serialNumber) data.serialNumber = data.serialNumber.toUpperCase();

  const normalizedCertificate = normalizeInstrumentCertificate(data);
  const newId = normalizedCertificate
    ? `i_cert_${encodeURIComponent(normalizedCertificate)}`
    : 'i_' + Date.now();
  const nowIso = new Date().toISOString();
  const inst: Instrument = {
    status: 'Aguardando Calibração',
    lastCalibrationDate: '',
    nextCalibrationDate: '',
    ...data,
    id: newId,
    createdAt: nowIso,
    updatedAt: nowIso,
  } as Instrument;
  inst.registrationSnapshot = buildInstrumentRegistrationSnapshot(inst as unknown as Record<string, any>, nowIso);
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(inst)) {
    if (val !== undefined && !Number.isNaN(val)) {
      cleaned[key] = val;
    }
  }
  const instrumentRef = doc(db, 'instruments', newId);
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(instrumentRef);
    if (existing.exists()) {
      throw new Error('Este Número de Certificado já está cadastrado.');
    }
    transaction.set(instrumentRef, cleaned);
  });
  mergeInstrumentIntoCache(inst);
  notifyInstrumentSubscribers();
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
    const nowIso = new Date().toISOString();
    const item: Instrument = {
      ...data,
      id: newId,
      status: 'Aguardando Calibração',
      lastCalibrationDate: '',
      nextCalibrationDate: '',
      createdAt: nowIso,
      updatedAt: nowIso,
    } as Instrument;
    item.registrationSnapshot = buildInstrumentRegistrationSnapshot(item as unknown as Record<string, any>, nowIso);
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(item)) {
      if (val !== undefined && !Number.isNaN(val)) {
        cleaned[key] = val;
      }
    }
    await setDoc(doc(db, 'instruments', newId), cleaned);
    result.push(item);
    mergeInstrumentIntoCache(item);
  }
  notifyInstrumentSubscribers();
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
  cleaned.updatedAt = new Date().toISOString();
  await updateDoc(doc(db, 'instruments', id), cleaned);
  const existing = instrumentCache.get(id);
  if (existing) {
    mergeInstrumentIntoCache({ ...existing, ...cleaned, id } as Instrument);
    notifyInstrumentSubscribers();
  }
}

export async function recordInstrumentLabelPrinted(
  instrumentId: string,
  user?: { name?: string; username?: string; authUid?: string; id?: string } | null,
): Promise<void> {
  const existing = instrumentCache.get(instrumentId);
  const currentCount = typeof existing?.calibrationLabelPrintCount === 'number'
    ? existing.calibrationLabelPrintCount
    : 0;

  const updates: Partial<Instrument> = {
    calibrationLabelPrinted: true,
    calibrationLabelPrintedAt: new Date().toISOString(),
    calibrationLabelPrintedBy: String(user?.name || user?.username || 'Operador').trim(),
    calibrationLabelPrintedByUid: String(user?.authUid || user?.id || '').trim(),
    calibrationLabelPrintCount: currentCount + 1,
  };

  await updateInstrumentDoc(instrumentId, updates);
}

export interface CalibrationTimingSession {
  startTime: string;
  technicianName: string;
  previousStatus: Instrument['status'];
}

export async function startCalibrationTimingSession(
  instrumentId: string,
  technicianName: string,
  previousStatus?: Instrument['status'],
): Promise<CalibrationTimingSession> {
  const instrumentRef = doc(db, 'instruments', instrumentId);
  const nowIso = new Date().toISOString();
  const normalizedTechnician = String(technicianName || 'Técnico Responsável').trim() || 'Técnico Responsável';

  // After an administrator archives a finalized calibration, Firestore requires
  // the fresh administrator custom claim for the replacement workflow. A long-
  // lived browser session can still hold an older token even though the backend
  // has already authorized the replacement. Refresh claims before the first
  // direct Firestore write in that flow.
  if (instrumentCache.get(instrumentId)?.adminCalibrationReplacementPending === true) {
    await refreshCurrentInternalClaims();
  }

  const session = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(instrumentRef);
    if (!snapshot.exists()) throw new Error('INSTRUMENT_NOT_FOUND');
    const current = snapshot.data() as Instrument;

    const existingStart = String(current.calibrationStartedAt || '').trim();
    const administrativeReplacement = current.adminCalibrationReplacementPending === true;
    if ((current.status === 'Em Calibração' || administrativeReplacement) && existingStart) {
      return {
        startTime: existingStart,
        technicianName: String(current.calibrationTechnicianName || normalizedTechnician),
        previousStatus: (current.calibrationPreviousStatus || previousStatus || 'Aguardando Calibração') as Instrument['status'],
      };
    }

    const resolvedPreviousStatus = (
      current.status && current.status !== 'Em Calibração'
        ? current.status
        : current.calibrationPreviousStatus || previousStatus || 'Aguardando Calibração'
    ) as Instrument['status'];

    transaction.update(instrumentRef, {
      status: administrativeReplacement ? current.status : 'Em Calibração',
      calibrationStartedAt: nowIso,
      calibrationTechnicianName: normalizedTechnician,
      calibrationPreviousStatus: resolvedPreviousStatus,
      updatedAt: nowIso,
    });

    return {
      startTime: nowIso,
      technicianName: normalizedTechnician,
      previousStatus: resolvedPreviousStatus,
    };
  });

  const cached = instrumentCache.get(instrumentId);
  if (cached) {
    mergeInstrumentIntoCache({
      ...cached,
      id: instrumentId,
      status: cached.adminCalibrationReplacementPending === true ? cached.status : 'Em Calibração',
      calibrationStartedAt: session.startTime,
      calibrationTechnicianName: session.technicianName,
      calibrationPreviousStatus: session.previousStatus,
      updatedAt: nowIso,
    } as Instrument);
    notifyInstrumentSubscribers();
  }

  return session;
}

export async function cancelCalibrationTimingSession(
  instrumentId: string,
  fallbackPreviousStatus?: Instrument['status'],
): Promise<Instrument['status']> {
  const instrumentRef = doc(db, 'instruments', instrumentId);
  const nowIso = new Date().toISOString();

  if (instrumentCache.get(instrumentId)?.adminCalibrationReplacementPending === true) {
    await refreshCurrentInternalClaims();
  }

  const restoredStatus = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(instrumentRef);
    if (!snapshot.exists()) throw new Error('INSTRUMENT_NOT_FOUND');
    const current = snapshot.data() as Instrument;
    const resolvedPreviousStatus = (
      current.calibrationPreviousStatus || fallbackPreviousStatus || 'Aguardando Calibração'
    ) as Instrument['status'];

    const administrativeReplacement = current.adminCalibrationReplacementPending === true;
    transaction.update(instrumentRef, {
      status: administrativeReplacement ? current.status : (current.status === 'Em Calibração' ? resolvedPreviousStatus : current.status),
      calibrationStartedAt: deleteField(),
      calibrationTechnicianName: deleteField(),
      calibrationPreviousStatus: deleteField(),
      updatedAt: nowIso,
    });
    return administrativeReplacement ? current.status : (current.status === 'Em Calibração' ? resolvedPreviousStatus : current.status);
  });

  const cached = instrumentCache.get(instrumentId);
  if (cached) {
    const next = { ...cached, status: restoredStatus, updatedAt: nowIso } as Instrument;
    delete next.calibrationStartedAt;
    delete next.calibrationTechnicianName;
    delete next.calibrationPreviousStatus;
    mergeInstrumentIntoCache(next);
    notifyInstrumentSubscribers();
  }

  return restoredStatus;
}

export async function deleteInstrumentDoc(id: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const token = await user.getIdToken();
  const response = await fetch(`/api/instruments/${encodeURIComponent(id)}/archive`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.error || 'Não foi possível arquivar o instrumento.');
  instrumentCache.delete(id);
  notifyInstrumentSubscribers();
  schedulePersistInstrumentCache();
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
        const list = snapshot.docs
          .map(d => ({ ...d.data(), id: d.id } as CalibrationReport))
          .filter(report => report.isDeleted !== true);
        onData(list, !snapshot.metadata.fromCache);
      }, onError);
    },
    { persistCache: true, cacheBackend: 'indexedDB', userScopedCache: true }
  );
  return shared(callback);
}

export async function saveCalibrationDoc(data: {
  instrumentId: string;
  technicianName: string;
  technicianId?: string;
  signatureVersion?: number;
  signaturePath?: string;
  emitterUser?: string;
  accuracyClass?: string;
  mpe?: number;
  points: any[];
  observations: string;
  curveCount?: number;
  certNumber?: string;
  referenceStandardIds?: string[];
  referenceStandardSlots?: { A?: string; B?: string; C?: string };
  referenceStandards?: ReferenceStandard[];
  standardRangeValidation?: CalibrationStandardValidation;
  standardRangeValidationRequired?: boolean;
  temperature?: number;
  humidity?: number;
  instrumentType?: InstrumentType;
  metrologicalNorm?: string;
  sensorType?: string;
  outputSignal?: string;
  setPoint?: number;
  contactType?: string;
  transmitterPoints?: any[];
  switchPoints?: any[];
  safetyValvePoints?: any[];
  pressureRegulatorPoints?: any[];
  valveService?: string;
  valveTestMedium?: string;
  valveSeatType?: string;
  acceptanceCriterion?: string;
  maxBlowdownPercent?: number;
  seatLeakageResult?: 'Aprovado' | 'Reprovado' | 'Não avaliado';
  seatLeakageTestPressure?: number;
  seatLeakageMeasured?: number;
  seatLeakageLimit?: number;
  seatLeakageUnit?: string;
  regulatorMode?: string;
  regulatorActuation?: string;
  flowPerformanceTested?: boolean;
  droopPercent?: number;
  droopLimitPercent?: number;
  approved?: boolean;
  calibrationDate?: string;
  materialsUsed?: string[];
  auditStartTime?: string;
  auditTechnicianName?: string;
  auditReferenceNumber?: string;
}, activeInst: Instrument): Promise<{ report: CalibrationReport; instrument: Instrument }> {
  let maxError = 0;
  let maxHysteresis = 0;

  const administrativeReplacement = activeInst.adminCalibrationReplacementPending === true;
  if (administrativeReplacement) {
    await refreshCurrentInternalClaims();
  }

  if (data.referenceStandardSlots) {
    const slotA = (data.referenceStandardSlots.A || '').trim();
    if (!slotA) {
      throw new Error('O Padrão A é obrigatório e deve ser proveniente de laboratório RBC externo à COMANINS.');
    }
    const slotB = (data.referenceStandardSlots.B || '').trim();
    const slotC = (data.referenceStandardSlots.C || '').trim();
    const activeSlots = [slotA, slotB, slotC].filter(Boolean);
    if (new Set(activeSlots).size !== activeSlots.length) {
      throw new Error('O mesmo padrão de referência não pode ser utilizado em mais de um slot (A, B ou C).');
    }
    const stdA = (data.referenceStandards || []).find((s) => s.id === slotA);
    if (stdA) {
      const labA = String(stdA.rbcLab || '').trim();
      if (!labA) {
        throw new Error('O campo Laboratório RBC/Origem do Padrão A está vazio. O Padrão A deve ser proveniente de laboratório RBC externo à COMANINS.');
      }
      if (/comanins/i.test(labA)) {
        throw new Error('Padrões com Laboratório/Origem COMANINS não podem ser utilizados como Padrão A. Utilize COMANINS somente nos campos Padrão B ou Padrão C.');
      }
      const today = new Date().toISOString().slice(0, 10);
      if (stdA.expirationDate && stdA.expirationDate < today) {
        throw new Error(`O Padrão A (${stdA.identification || stdA.certificateNumber || stdA.id}) está com o certificado vencido.`);
      }
    }
  }

  if (data.standardRangeValidationRequired === true && data.approved !== false) {
    const selectedStandardIds = Array.from(new Set((data.referenceStandardIds || []).filter(Boolean)));
    if (selectedStandardIds.length === 0) {
      throw new Error('Selecione pelo menos um padrão de referência válido.');
    }
    if (!data.standardRangeValidation || data.standardRangeValidation.overallStatus !== 'PASS') {
      throw new Error('A comparação de faixa dos padrões não foi concluída com aprovação. Revise a faixa/unidade do padrão selecionado.');
    }
    const validatedPassIds = new Set(
      (data.standardRangeValidation.standards || [])
        .filter((item) => item.status === 'PASS')
        .map((item) => item.standardId),
    );
    if (selectedStandardIds.some((id) => !validatedPassIds.has(id))) {
      throw new Error('Um ou mais padrões selecionados possuem faixa inferior ou não comparável à faixa necessária.');
    }
  }

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

  const setPoint = Number(data.setPoint ?? 0);
  const valveTolerance = Number(data.mpe ?? activeInst.mpe);
  const hasValidValveSetPoint = Number.isFinite(setPoint) && setPoint > 0;
  const hasValidValveTolerance = Number.isFinite(valveTolerance) && valveTolerance > 0;
  const hasValidBlowdownLimit =
    data.maxBlowdownPercent === undefined ||
    (Number.isFinite(Number(data.maxBlowdownPercent)) && Number(data.maxBlowdownPercent) >= 0);
  let maxBlowdownPercent = 0;
  const processedSafetyValvePoints = (data.safetyValvePoints || []).map((point: any) => {
    const opening = Number(point.openingPressure);
    const reseating = Number(point.reseatingPressure);
    const setError = Number((opening - setPoint).toFixed(4));
    const setErrorPercent = setPoint !== 0
      ? Number(((setError / setPoint) * 100).toFixed(4))
      : 0;
    const blowdown = Number((opening - reseating).toFixed(4));
    const blowdownPercent = opening !== 0
      ? Number((Math.abs(blowdown / opening) * 100).toFixed(4))
      : 0;
    maxError = Math.max(maxError, Math.abs(setError));
    maxBlowdownPercent = Math.max(maxBlowdownPercent, blowdownPercent);
    const openingPass =
      hasValidValveSetPoint &&
      hasValidValveTolerance &&
      Math.abs(setError) <= valveTolerance;
    const blowdownPass =
      hasValidBlowdownLimit &&
      (data.maxBlowdownPercent === undefined
        ? true
        : blowdownPercent <= Number(data.maxBlowdownPercent));
    return { ...point, setError, setErrorPercent, blowdown, blowdownPercent, pass: openingPass && blowdownPass };
  });

  let maxRegulatorHysteresis = 0;
  const processedPressureRegulatorPoints = (data.pressureRegulatorPoints || []).map((point: any) => {
    const fromBelow = Number(point.measuredFromBelow);
    const fromAbove = Number(point.measuredFromAbove);
    const average = Number(((fromBelow + fromAbove) / 2).toFixed(4));
    const error = Number((average - setPoint).toFixed(4));
    const errorPercent = setPoint !== 0
      ? Number(((error / setPoint) * 100).toFixed(4))
      : 0;
    const hysteresis = Number(Math.abs(fromBelow - fromAbove).toFixed(4));
    maxError = Math.max(maxError, Math.abs(error));
    maxRegulatorHysteresis = Math.max(maxRegulatorHysteresis, hysteresis);
    const pass =
      hasValidValveSetPoint &&
      hasValidValveTolerance &&
      Math.abs(error) <= valveTolerance;
    return { ...point, average, error, errorPercent, hysteresis, pass };
  });
  maxHysteresis = Math.max(maxHysteresis, maxRegulatorHysteresis);

  const span = activeInst.rangeMax - activeInst.rangeMin;
  const maxRelativeError = span > 0 ? Number(((maxError / span) * 100).toFixed(4)) : 0;
  const specialtyPoints = data.instrumentType === 'psv'
    ? processedSafetyValvePoints
    : data.instrumentType === 'pcv'
      ? processedPressureRegulatorPoints
      : processedPoints;

  const seatLeakageMeasured = data.seatLeakageMeasured;
  const seatLeakageLimit = data.seatLeakageLimit;
  const numericSeatLeakagePass =
    seatLeakageMeasured === undefined ||
    seatLeakageLimit === undefined ||
    seatLeakageMeasured <= seatLeakageLimit;
  const psvSupplementalPass =
    data.instrumentType !== 'psv' ||
    (hasValidValveSetPoint &&
      hasValidValveTolerance &&
      hasValidBlowdownLimit &&
      String(data.acceptanceCriterion || '').trim().length > 0 &&
      data.seatLeakageResult === 'Aprovado' &&
      numericSeatLeakagePass);
  const pcvSupplementalPass =
    data.instrumentType !== 'pcv' ||
    (hasValidValveSetPoint &&
      hasValidValveTolerance &&
      data.seatLeakageResult !== 'Reprovado' &&
      numericSeatLeakagePass &&
      (!data.flowPerformanceTested ||
        (data.droopPercent !== undefined &&
          data.droopLimitPercent !== undefined &&
          Number.isFinite(Number(data.droopPercent)) &&
          Number.isFinite(Number(data.droopLimitPercent)) &&
          Number(data.droopPercent) >= 0 &&
          Number(data.droopLimitPercent) >= 0 &&
          Number(data.droopPercent) <= Number(data.droopLimitPercent))));
  const calculatedGenericApproved = processedPoints.every((p: any) => p.pass !== false);
  const calculatedValveApproved =
    specialtyPoints.length > 0 &&
    specialtyPoints.every((p: any) => p.pass !== false) &&
    psvSupplementalPass &&
    pcvSupplementalPass;

  if (
    (data.instrumentType === 'psv' || data.instrumentType === 'pcv') &&
    data.approved !== false &&
    !calculatedValveApproved
  ) {
    throw new Error(
      'Os resultados de PSV/PCV não atendem aos critérios registrados. Revise a ficha ou emita uma RNC.',
    );
  }

  const now = new Date();
  const automaticCalibrationDate = new Date(
    now.getTime() - now.getTimezoneOffset() * 60_000,
  ).toISOString().split('T')[0];
  const requestedCalibrationDate = String(data.calibrationDate || '').trim();
  if (requestedCalibrationDate && activeInst.manualCalibrationDateAllowed !== true) {
    throw new Error('A data manual não está liberada para este instrumento.');
  }
  const calibrationDate = requestedCalibrationDate || automaticCalibrationDate;
  const parsedCalibrationDate = new Date(`${calibrationDate}T12:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(calibrationDate) ||
    Number.isNaN(parsedCalibrationDate.getTime()) ||
    parsedCalibrationDate.toISOString().slice(0, 10) !== calibrationDate
  ) {
    throw new Error('Informe uma data de calibração válida.');
  }
  if (calibrationDate > automaticCalibrationDate) {
    throw new Error('A data da calibração não pode estar no futuro.');
  }

  const reportId = 'r_' + Date.now();
  const generatedAuthKey = generateAuthKey();
  const report: CalibrationReport = {
    id: reportId,
    clientId: activeInst.clientId,
    certNumber: data.certNumber,
    authKey: generatedAuthKey,
    instrumentId: data.instrumentId,
    technicianName: data.technicianName || 'Técnico Responsável',
    technicianId: data.technicianId,
    signatureVersion: data.signatureVersion,
    signaturePath: data.signaturePath,
    emitterUser: data.emitterUser,
    date: calibrationDate,
    points: processedPoints,
    maxError,
    maxRelativeError,
    maxHysteresis,
    approved:
      data.instrumentType === 'psv' || data.instrumentType === 'pcv'
        ? data.approved === false
          ? false
          : calculatedValveApproved
        : data.approved !== undefined
          ? data.approved
          : calculatedGenericApproved,
    observations: data.observations || '',
    materialsUsed: Array.from(new Set((data.materialsUsed || []).map((item) => String(item || '').trim()).filter(Boolean))).slice(0, 50),
    administrativeReplacement: activeInst.adminCalibrationReplacementPending === true ? true : undefined,
    replacedReportIds: activeInst.adminCalibrationReplacementPending === true ? (activeInst.adminCalibrationReplacementReportIds || []) : undefined,
    replacementReason: activeInst.adminCalibrationReplacementPending === true ? activeInst.adminCalibrationReplacementReason : undefined,
    replacementRequestedAt: activeInst.adminCalibrationReplacementPending === true ? activeInst.adminCalibrationReplacementRequestedAt : undefined,
    replacementRequestedByName: activeInst.adminCalibrationReplacementPending === true ? activeInst.adminCalibrationReplacementRequestedByName : undefined,
    temperature: data.temperature !== undefined ? data.temperature : undefined,
    humidity: data.humidity !== undefined ? data.humidity : undefined,
    instrumentType: data.instrumentType,
    metrologicalNorm: data.metrologicalNorm,
    sensorType: data.sensorType,
    outputSignal: data.outputSignal,
    setPoint: data.setPoint,
    contactType: data.contactType,
    accuracyClass: data.accuracyClass,
    mpe: data.mpe,
    transmitterPoints: data.transmitterPoints,
    switchPoints: data.switchPoints,
    safetyValvePoints: processedSafetyValvePoints,
    pressureRegulatorPoints: processedPressureRegulatorPoints,
    valveService: data.valveService,
    valveTestMedium: data.valveTestMedium,
    valveSeatType: data.valveSeatType,
    acceptanceCriterion: data.acceptanceCriterion,
    maxBlowdownPercent: data.maxBlowdownPercent,
    measuredMaxBlowdownPercent: processedSafetyValvePoints.length ? maxBlowdownPercent : undefined,
    seatLeakageResult: data.seatLeakageResult,
    seatLeakageTestPressure: data.seatLeakageTestPressure,
    seatLeakageMeasured: data.seatLeakageMeasured,
    seatLeakageLimit: data.seatLeakageLimit,
    seatLeakageUnit: data.seatLeakageUnit,
    regulatorMode: data.regulatorMode,
    regulatorActuation: data.regulatorActuation,
    flowPerformanceTested: data.flowPerformanceTested,
    droopPercent: data.droopPercent,
    droopLimitPercent: data.droopLimitPercent,
    droopPass:
      data.flowPerformanceTested && data.droopPercent !== undefined && data.droopLimitPercent !== undefined
        ? data.droopPercent <= data.droopLimitPercent
        : undefined,
    curveCount: data.curveCount || 5,
    referenceStandardIds: data.referenceStandardIds || [],
    referenceStandardSlots: data.referenceStandardSlots,
    referenceStandards: data.referenceStandards || [],
    standardRangeValidation: data.standardRangeValidation
  };

  const nextCal = new Date(`${calibrationDate}T12:00:00.000Z`);
  nextCal.setUTCFullYear(nextCal.getUTCFullYear() + 1);

  const preservedOperationalStatus = administrativeReplacement
    ? (activeInst.adminCalibrationReplacementOriginalStatus || activeInst.status)
    : 'Aguardando Emissão de Certificado';

  const updatedInst: Instrument = {
    ...activeInst,
    status: preservedOperationalStatus as Instrument['status'],
    lastCalibrationDate: report.date,
    nextCalibrationDate: nextCal.toISOString().split('T')[0],
    ...(data.instrumentType ? { typeSpec: data.instrumentType } : {}),
    ...(data.metrologicalNorm ? { metrologicalNorm: data.metrologicalNorm } : {}),
    ...(data.sensorType ? { sensorType: data.sensorType } : {}),
    ...(data.outputSignal ? { outputSignal: data.outputSignal } : {}),
    ...(data.setPoint !== undefined ? { setPoint: data.setPoint } : {}),
    ...(data.contactType ? { contactType: data.contactType } : {}),
    ...(data.valveService ? { valveService: data.valveService } : {}),
    ...(data.valveTestMedium ? { valveTestMedium: data.valveTestMedium } : {}),
    ...(data.valveSeatType ? { valveSeatType: data.valveSeatType } : {}),
    ...(data.acceptanceCriterion ? { acceptanceCriterion: data.acceptanceCriterion } : {}),
    ...(data.maxBlowdownPercent !== undefined ? { maxBlowdownPercent: data.maxBlowdownPercent } : {}),
    ...(data.regulatorMode ? { regulatorMode: data.regulatorMode } : {}),
    ...(data.regulatorActuation ? { regulatorActuation: data.regulatorActuation } : {}),
    ...(data.temperature !== undefined ? { temperature: data.temperature } : {}),
    ...(data.humidity !== undefined ? { humidity: data.humidity } : {})
  };

  const instrumentUpdates = stripUndefinedDeep({
    status: preservedOperationalStatus,
    lastCalibrationDate: report.date,
    nextCalibrationDate: updatedInst.nextCalibrationDate,
    typeSpec: data.instrumentType,
    metrologicalNorm: data.metrologicalNorm,
    sensorType: data.sensorType,
    outputSignal: data.outputSignal,
    setPoint: data.setPoint,
    contactType: data.contactType,
    valveService: data.valveService,
    valveTestMedium: data.valveTestMedium,
    valveSeatType: data.valveSeatType,
    acceptanceCriterion: data.acceptanceCriterion,
    maxBlowdownPercent: data.maxBlowdownPercent,
    regulatorMode: data.regulatorMode,
    regulatorActuation: data.regulatorActuation,
    accuracyClass: data.accuracyClass,
    mpe: data.mpe,
    temperature: data.temperature,
    humidity: data.humidity,
    updatedAt: new Date().toISOString(),
  });
  const cacheableInstrumentUpdates = { ...instrumentUpdates };
  instrumentUpdates.manualCalibrationDateAllowed = deleteField();
  instrumentUpdates.reissueSuggestedCalibrationDate = deleteField();
  instrumentUpdates.calibrationStartedAt = deleteField();
  instrumentUpdates.calibrationTechnicianName = deleteField();
  instrumentUpdates.calibrationPreviousStatus = deleteField();
  if (administrativeReplacement) {
    instrumentUpdates.adminCalibrationReplacementPending = deleteField();
    instrumentUpdates.adminCalibrationReplacementOriginalStatus = deleteField();
    instrumentUpdates.adminCalibrationReplacementReason = deleteField();
    instrumentUpdates.adminCalibrationReplacementRequestedAt = deleteField();
    instrumentUpdates.adminCalibrationReplacementRequestedByUid = deleteField();
    instrumentUpdates.adminCalibrationReplacementRequestedByName = deleteField();
    instrumentUpdates.adminCalibrationReplacementReportIds = deleteField();
  }
  const cleanReport = stripUndefinedDeep(report) as CalibrationReport;

  // The timing audit must be committed in the SAME batch as the calibration.
  // Previously it was a best-effort write performed afterwards; a permission,
  // network or tab-close failure could save the calibration but lose its audit.
  const auditEndTime = new Date().toISOString();
  const rawAuditStartTime = String(
    data.auditStartTime || activeInst.calibrationStartedAt || '',
  ).trim();
  const endMs = new Date(auditEndTime).getTime();
  const candidateStartMs = new Date(rawAuditStartTime).getTime();
  const hasValidLiveStart =
    !!rawAuditStartTime &&
    Number.isFinite(candidateStartMs) &&
    candidateStartMs <= endMs;
  const auditStartTime = hasValidLiveStart ? rawAuditStartTime : auditEndTime;
  const durationSeconds = hasValidLiveStart
    ? Math.max(0, Math.floor((endMs - candidateStartMs) / 1000))
    : 0;
  const auditHours = Math.floor(durationSeconds / 3600);
  const auditMinutes = Math.floor((durationSeconds % 3600) / 60);
  const auditSeconds = durationSeconds % 60;
  const durationFormatted = auditHours > 0
    ? `${auditHours}h ${auditMinutes}min ${auditSeconds}seg`
    : auditMinutes > 0
      ? `${auditMinutes} min ${auditSeconds} seg`
      : `${auditSeconds} seg`;
  const auditId = `audit_${reportId}`;
  const auditLog: CalibrationAuditLog = {
    id: auditId,
    reportId,
    certNumber: String(
      data.auditReferenceNumber ||
      cleanReport.certNumber ||
      activeInst.certificateNumber ||
      activeInst.coma ||
      reportId,
    ),
    coma: activeInst.coma || activeInst.certificateNumber || '',
    instrumentId: data.instrumentId,
    instrumentTag: activeInst.tag || 'S/TAG',
    instrumentDescription: activeInst.description || 'Instrumento',
    technicianName: String(
      data.auditTechnicianName ||
      data.technicianName ||
      activeInst.calibrationTechnicianName ||
      'Técnico Responsável',
    ),
    startTime: auditStartTime,
    endTime: auditEndTime,
    durationSeconds,
    durationFormatted,
    date: cleanReport.date,
    timingSource: hasValidLiveStart ? 'live' : 'recovered',
  };

  // Report + instrument + audit are committed atomically. If the audit cannot
  // be written, the calibration itself is not reported as successfully saved.
  const batch = writeBatch(db);
  batch.set(doc(db, 'calibrationReports', reportId), cleanReport);
  batch.set(doc(db, 'calibrationAuditLogs', auditId), stripUndefinedDeep(auditLog));
  batch.update(doc(db, 'instruments', activeInst.id), instrumentUpdates);

  try {
    await batch.commit();
  } catch (error: any) {
    if (administrativeReplacement && isFirestorePermissionDenied(error)) {
      // Retry once after synchronizing the profile and forcing a fresh token.
      // The first failure may come from a stale token kept open before the
      // administrator profile/custom claims were updated.
      await refreshCurrentInternalClaims();
      const retryBatch = writeBatch(db);
      retryBatch.set(doc(db, 'calibrationReports', reportId), cleanReport);
      retryBatch.set(doc(db, 'calibrationAuditLogs', auditId), stripUndefinedDeep(auditLog));
      retryBatch.update(doc(db, 'instruments', activeInst.id), instrumentUpdates);
      try {
        await retryBatch.commit();
      } catch (retryError: any) {
        if (isFirestorePermissionDenied(retryError)) {
          throw new Error(
            'A substituição administrativa foi autorizada, mas as regras do Firestore recusaram a gravação da nova ficha. Publique as regras do LOTE 58 e tente novamente. A ficha anterior permanece arquivada e nenhum novo certificado foi concluído.',
          );
        }
        throw retryError;
      }
    } else {
      throw error;
    }
  }

  const cachedInstrument = instrumentCache.get(activeInst.id);
  const resolvedInstrument = {
    ...updatedInst,
    ...cacheableInstrumentUpdates,
  } as Instrument;
  delete resolvedInstrument.manualCalibrationDateAllowed;
  delete resolvedInstrument.reissueSuggestedCalibrationDate;
  delete resolvedInstrument.calibrationStartedAt;
  delete resolvedInstrument.calibrationTechnicianName;
  delete resolvedInstrument.calibrationPreviousStatus;
  if (administrativeReplacement) {
    delete resolvedInstrument.adminCalibrationReplacementPending;
    delete resolvedInstrument.adminCalibrationReplacementOriginalStatus;
    delete resolvedInstrument.adminCalibrationReplacementReason;
    delete resolvedInstrument.adminCalibrationReplacementRequestedAt;
    delete resolvedInstrument.adminCalibrationReplacementRequestedByUid;
    delete resolvedInstrument.adminCalibrationReplacementRequestedByName;
    delete resolvedInstrument.adminCalibrationReplacementReportIds;
  }
  if (cachedInstrument) {
    mergeInstrumentIntoCache({ ...cachedInstrument, ...resolvedInstrument, id: activeInst.id } as Instrument);
    notifyInstrumentSubscribers();
  }

  return { report: cleanReport, instrument: resolvedInstrument };
}

export interface CalibrationReopenResult {
  success: true;
  recovered?: boolean;
  dateAuthorizationRecovered?: boolean;
  reportId?: string;
  instrumentId: string;
  removedReportIds?: string[];
  instrument?: Instrument;
}

const parseCalibrationReopenResponse = async (
  response: Response,
): Promise<CalibrationReopenResult> => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (payload?.error === 'FORBIDDEN') {
      throw new Error('Somente o Administrador do Sistema pode remover um certificado e reabrir a calibração.');
    }
    if (payload?.error === 'REPORT_NOT_FOUND') {
      throw new Error('O certificado não foi encontrado. Atualize a página antes de tentar novamente.');
    }
    if (payload?.error === 'INSTRUMENT_NOT_FOUND') {
      throw new Error('O instrumento vinculado ao certificado não foi encontrado.');
    }
    if (payload?.error === 'ACTIVE_CALIBRATION_REPORT_EXISTS') {
      throw new Error('Este instrumento ainda possui um certificado ativo. Exclua o certificado antes de iniciar uma nova calibração.');
    }
    throw new Error('Não foi possível remover o certificado e reabrir a calibração.');
  }
  return payload as CalibrationReopenResult;
};

export async function deleteReportDoc(
  reportId: string,
): Promise<CalibrationReopenResult> {
  const headers = await corporateFileAuthHeaders();
  const response = await fetch(
    `/api/internal/calibration-reports/${encodeURIComponent(reportId)}/delete-and-reopen`,
    {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
    },
  );
  const result = await parseCalibrationReopenResponse(response);
  if (result.instrument) {
    mergeInstrumentIntoCache(result.instrument);
    notifyInstrumentSubscribers();
  }
  return result;
}

export interface AdminCalibrationReplacementResult {
  success: true;
  archivedReportIds: string[];
  instrument: Instrument;
}

export async function prepareAdminCalibrationReplacementDoc(
  instrumentId: string,
  credentials: { username: string; password: string; reason: string },
): Promise<AdminCalibrationReplacementResult> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const token = await user.getIdToken();
  const response = await fetch(
    `/api/internal/instruments/${encodeURIComponent(instrumentId)}/admin-replace-calibration`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success !== true) {
    if (payload?.error === 'ADMIN_REAUTH_REQUIRED') throw new Error('Senha administrativa inválida.');
    if (payload?.error === 'ADMIN_REPLACEMENT_ALREADY_PENDING') throw new Error(payload?.message || 'A substituição administrativa já está liberada.');
    if (payload?.error === 'RNC_REPLACEMENT_NOT_ALLOWED') throw new Error(payload?.message || 'Instrumentos com RNC devem seguir o fluxo específico.');
    if (payload?.error === 'ACTIVE_CALIBRATION_REPORT_NOT_FOUND') throw new Error(payload?.message || 'Não foi encontrada ficha ativa para substituir.');
    throw new Error(payload?.message || payload?.error || 'Não foi possível liberar a substituição da ficha de calibração.');
  }
  const result = payload as AdminCalibrationReplacementResult;
  if (result.instrument) {
    mergeInstrumentIntoCache(result.instrument);
    notifyInstrumentSubscribers();
  }

  // The archive/replacement authorization is already committed by the backend.
  // Refresh browser claims for the direct Firestore writes that follow, but do
  // not report the archive itself as failed if token refresh is temporarily
  // unavailable; saveCalibrationDoc performs the same refresh again before save.
  try {
    await refreshCurrentInternalClaims();
  } catch (error) {
    console.warn('Substituição administrativa autorizada, mas não foi possível atualizar o token imediatamente:', error);
  }
  return result;
}

export async function recoverArchivedCalibrationDoc(
  instrumentId: string,
): Promise<CalibrationReopenResult> {
  const headers = await corporateFileAuthHeaders();
  const response = await fetch(
    `/api/internal/instruments/${encodeURIComponent(instrumentId)}/recover-archived-calibration`,
    {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
    },
  );
  const result = await parseCalibrationReopenResponse(response);
  if (result.instrument) {
    mergeInstrumentIntoCache(result.instrument);
    notifyInstrumentSubscribers();
  }
  return result;
}

// 4. Contact Messages / Leads
export async function syncMessages(callback: (messages: ContactMessage[]) => void) {
  const shared = createSharedSync<ContactMessage[]>(
    'contactMessages',
    'contactMessages',
    [],
    (onData, onError) => {
      const colRef = collection(db, 'contactMessages');
      return onSnapshot(colRef, (snapshot) => {
        const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as ContactMessage));
        onData(list, !snapshot.metadata.fromCache);
      }, onError);
    },
    { persistCache: true, cacheBackend: 'indexedDB', userScopedCache: true },
  );
  return shared(callback);
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
  const fallback = { prefix: 'COMA-', nextNumber: 1, year: new Date().getFullYear() };
  callback(getLocalCache<CertSequenceConfig>('certSequence', fallback));
  const docRef = doc(db, 'systemSettings', 'certSequence');
  return onSnapshot(docRef, (snapshot) => {
    const config = snapshot.exists() ? snapshot.data() as CertSequenceConfig : fallback;
    setLocalCache('certSequence', config);
    callback(config);
  }, (err) => {
    console.error('Firestore syncCertSequenceConfig error:', err);
    callback(getLocalCache<CertSequenceConfig>('certSequence', fallback));
  });
}

export async function saveCertSequenceConfig(config: CertSequenceConfig): Promise<void> {
  try {
    const docRef = doc(db, 'systemSettings', 'certSequence');
    await setDoc(docRef, config);
    setLocalCache('certSequence', config);
  } catch (err) {
    console.error('Error saving certSequence config:', err);
  }
}

export interface IntakeSequenceConfig {
  prefix: string;
  nextNumber: number;
}

export async function syncIntakeSequenceConfig(callback: (config: IntakeSequenceConfig) => void) {
  const fallback = { prefix: 'C-', nextNumber: 19928 };
  const cached = getLocalCache<IntakeSequenceConfig>('intakeSequence', fallback);
  callback(cached);
  const docRef = doc(db, 'systemSettings', 'intakeSequence');
  return onSnapshot(docRef, (snapshot) => {
    if (!snapshot.exists()) {
      const defaultConfig = fallback;
      setLocalCache('intakeSequence', defaultConfig);
      localStorage.setItem('comanins_intake_sequence', JSON.stringify(defaultConfig));
      void setDoc(docRef, defaultConfig).catch(() => {});
      callback(defaultConfig);
    } else {
      const data = snapshot.data();
      const config = {
        prefix: data.prefix ?? 'C-',
        nextNumber: data.nextNumber ?? 19928
      };
      setLocalCache('intakeSequence', config);
      localStorage.setItem('comanins_intake_sequence', JSON.stringify(config));
      callback(config);
    }
  }, (err) => {
    console.error('Firestore syncIntakeSequenceConfig error:', err);
    callback(getLocalCache<IntakeSequenceConfig>('intakeSequence', cached));
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
  cargos: [
    "Administrador",
    "Técnico de Laboratório",
    "Técnico de Instrumentação",
    "Instrumentista Júnior",
    "Instrumentista Pleno",
    "Instrumentista Sênior",
    "Instrumentista",
    "Financeiro",
    "Recursos Humanos (RH)",
    "Comercial"
  ]
};

export function ensureArray(val: any): string[] {
  if (!val) return [];
  
  let rawItems: string[] = [];
  if (Array.isArray(val)) {
    if (val.length > 1 && val.every((item) => typeof item === 'string' && item.length === 1)) {
      rawItems = [val.join('')];
    } else {
      let singleCharBuffer = "";
      for (const item of val) {
        if (typeof item === 'string') {
          if (item.length === 1) {
            singleCharBuffer += item;
          } else {
            if (singleCharBuffer) {
              rawItems.push(singleCharBuffer);
              singleCharBuffer = "";
            }
            rawItems.push(item);
          }
        } else if (item) {
          rawItems.push(String(item));
        }
      }
      if (singleCharBuffer) {
        rawItems.push(singleCharBuffer);
      }
    }
  } else if (typeof val === 'string') {
    rawItems = [val];
  } else {
    rawItems = [String(val)];
  }

  const result: string[] = [];
  for (const item of rawItems) {
    if (!item) continue;
    const parts = item
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    result.push(...parts);
  }

  return Array.from(new Set(result));
}

export function normalizeDropdownOptions(raw: any): DropdownOptions {
  const result: any = { ...DEFAULT_DROPDOWN_OPTIONS };
  if (!raw || typeof raw !== 'object') return result;

  for (const key of Object.keys(DEFAULT_DROPDOWN_OPTIONS) as (keyof DropdownOptions)[]) {
    if (raw[key] !== undefined) {
      const cleaned = ensureArray(raw[key]);
      if (cleaned.length > 0) {
        result[key] = Array.from(new Set(cleaned));
      }
    }
  }
  return result;
}

export function syncDropdownOptions(callback: (options: DropdownOptions) => void) {
  callback(normalizeDropdownOptions(getLocalCache<DropdownOptions>('dropdownOptions', DEFAULT_DROPDOWN_OPTIONS)));
  const docRef = doc(db, 'systemSettings', 'dropdownOptions');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      const rawData = snapshot.data();
      const normalized = normalizeDropdownOptions(rawData);
      setLocalCache('dropdownOptions', normalized);
      callback(normalized);
      const needsRepair = Object.keys(normalized).some((key) => {
        const k = key as keyof DropdownOptions;
        return !Array.isArray(rawData[k]) || JSON.stringify(rawData[k]) !== JSON.stringify(normalized[k]);
      });
      if (needsRepair) {
        saveDropdownOptions(normalized).catch(() => {});
      }
    } else {
      callback(DEFAULT_DROPDOWN_OPTIONS);
    }
  }, (err) => {
    console.error('Firestore syncDropdownOptions error:', err);
    callback(normalizeDropdownOptions(getLocalCache<DropdownOptions>('dropdownOptions', DEFAULT_DROPDOWN_OPTIONS)));
  });
}

export async function saveDropdownOptions(options: DropdownOptions): Promise<void> {
  try {
    const docRef = doc(db, 'systemSettings', 'dropdownOptions');
    const normalized = normalizeDropdownOptions(options);
    await setDoc(docRef, normalized);
    setLocalCache('dropdownOptions', normalized);
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

const normalizeIntakeNumberKey = (value: unknown): string =>
  String(value || '').trim().replace(/\s+/g, '').toUpperCase();

const intakeDataWeight = (intake: SavedIntake): number => {
  let weight = 0;
  if (intake.deliveryFinalizedAt) weight += 10000;
  if (intake.deliveryLocked) weight += 5000;
  weight += Array.isArray(intake.photos) ? intake.photos.length * 50 : 0;
  weight += Array.isArray(intake.devolutionRows) ? intake.devolutionRows.length * 20 : 0;
  weight += intake.photoDevolution ? 100 : 0;
  weight += Array.isArray(intake.deliveryInstrumentPhotos) ? intake.deliveryInstrumentPhotos.length * 50 : 0;
  weight += Array.isArray(intake.deliveryFormPhotos) ? intake.deliveryFormPhotos.length * 50 : 0;
  weight += Array.isArray(intake.rows) ? intake.rows.length * 10 : 0;
  return weight;
};

/**
 * Colapsa duplicidades históricas apenas na camada de leitura. Nenhum documento é
 * excluído automaticamente. O registro com maior evidência operacional é
 * preservado; em empate, o ID mais recente vence.
 */
export function deduplicateIntakesByNumber(intakes: SavedIntake[]): SavedIntake[] {
  const byNumber = new Map<string, SavedIntake>();
  let duplicateCount = 0;

  for (const intake of intakes) {
    const normalizedNumber = normalizeIntakeNumberKey(intake.numEntrada);
    const key = normalizedNumber || `__id__:${intake.id}`;
    const existing = byNumber.get(key);
    if (!existing) {
      byNumber.set(key, intake);
      continue;
    }

    duplicateCount += 1;
    const existingWeight = intakeDataWeight(existing);
    const candidateWeight = intakeDataWeight(intake);
    if (
      candidateWeight > existingWeight ||
      (candidateWeight === existingWeight && String(intake.id) > String(existing.id))
    ) {
      byNumber.set(key, intake);
    }
  }

  if (duplicateCount > 0) {
    console.warn(`[DATA INTEGRITY] ${duplicateCount} entrada(s) duplicada(s) por número foram ocultadas da interface sem excluir dados.`);
  }

  return Array.from(byNumber.values()).sort((a, b) => String(b.id).localeCompare(String(a.id)));
}

export async function syncIntakes(callback: (intakes: SavedIntake[]) => void) {
  const cached = deduplicateIntakesByNumber(
    getLocalCache<SavedIntake[]>('savedIntakes', []).filter(intake => intake.isDeleted !== true),
  );
  if (cached.length > 0) callback(cached);
  const q = query(collection(db, 'savedIntakes'));
  return onSnapshot(q, async (snapshot) => {
    const active = snapshot.docs
      .map(d => ({ ...d.data(), id: d.id } as SavedIntake))
      .filter(intake => intake.isDeleted !== true);
    const list = deduplicateIntakesByNumber(active);
    setLocalCache('savedIntakes', list);
    callback(list);
  }, (err) => {
    handleQuotaOrError(err);
    callback(deduplicateIntakesByNumber(
      getLocalCache<SavedIntake[]>('savedIntakes', []).filter(intake => intake.isDeleted !== true),
    ));
  });
}

export async function createIntakeDoc(
  intake: Omit<SavedIntake, 'id'>,
): Promise<SavedIntake> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');

  const response = await fetch('/api/internal/intakes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify(intake),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success !== true || !data?.intake?.id) {
    if (data?.error === 'INTAKE_NUMBER_ALREADY_EXISTS') {
      throw new Error('INTAKE_NUMBER_ALREADY_EXISTS');
    }
    if (data?.error === 'MODULE_EDIT_DENIED') {
      throw new Error('MODULE_EDIT_DENIED');
    }
    if (data?.error === 'CLIENT_PROFILE_NOT_FOUND') {
      throw new Error('O cliente selecionado não foi encontrado no cadastro. Atualize a tela e tente novamente.');
    }
    if (data?.error === 'INVALID_INTAKE_ROWS' || data?.error === 'INVALID_INTAKE_ROW_QUANTITY') {
      throw new Error('Revise os equipamentos e as quantidades informadas na Entrada.');
    }
    if (data?.error === 'INTAKE_TOO_LARGE') {
      throw new Error('A Entrada ultrapassou o limite seguro de dados. Reduza a quantidade de itens por guia.');
    }
    throw new Error(data?.error || 'Não foi possível registrar a Guia de Entrada.');
  }
  return data.intake as SavedIntake;
}

export async function saveIntakeDoc(intake: SavedIntake): Promise<void> {
  if (!intake?.id) throw new Error('Entrada sem identificador válido.');
  await updateDoc(doc(db, 'savedIntakes', intake.id), intake as any);
}


export type BoxLabelSheetSlotStatus = 'available' | 'unavailable' | 'printed';

export interface BoxLabelSheetSlot {
  position: number;
  status: BoxLabelSheetSlotStatus;
  certificateNumber?: string;
  instrumentId?: string;
  clientName?: string;
  printedAt?: string;
  printedBy?: string;
  printedById?: string;
}

export interface BoxLabelSheetRecord {
  id: string;
  model: 'PIMACO_A4363';
  displayCode: string;
  status: 'open' | 'completed';
  slots: BoxLabelSheetSlot[];
  createdAt: string;
  createdBy: string;
  createdById?: string;
  updatedAt: string;
  updatedBy?: string;
  updatedById?: string;
}

const normalizeBoxLabelSlots = (slots: unknown): BoxLabelSheetSlot[] => {
  const source = Array.isArray(slots) ? slots : [];
  const byPosition = new Map<number, BoxLabelSheetSlot>();
  for (const item of source) {
    const position = Math.trunc(Number((item as any)?.position));
    if (position < 1 || position > 14 || byPosition.has(position)) continue;
    const rawStatus = String((item as any)?.status || 'available');
    const status: BoxLabelSheetSlotStatus =
      rawStatus === 'printed' || rawStatus === 'unavailable' ? rawStatus : 'available';
    byPosition.set(position, {
      position,
      status,
      certificateNumber: String((item as any)?.certificateNumber || '').trim() || undefined,
      instrumentId: String((item as any)?.instrumentId || '').trim() || undefined,
      clientName: String((item as any)?.clientName || '').trim() || undefined,
      printedAt: String((item as any)?.printedAt || '').trim() || undefined,
      printedBy: String((item as any)?.printedBy || '').trim() || undefined,
      printedById: String((item as any)?.printedById || '').trim() || undefined,
    });
  }
  return Array.from({ length: 14 }, (_, index) => byPosition.get(index + 1) || {
    position: index + 1,
    status: 'available' as const,
  });
};

const sanitizeBoxLabelSheet = (id: string, raw: any): BoxLabelSheetRecord => {
  const slots = normalizeBoxLabelSlots(raw?.slots);
  const createdAt = String(raw?.createdAt || new Date().toISOString());
  return {
    id,
    model: 'PIMACO_A4363',
    displayCode: String(raw?.displayCode || id),
    status: raw?.status === 'completed' || slots.every((slot) => slot.status !== 'available') ? 'completed' : 'open',
    slots,
    createdAt,
    createdBy: String(raw?.createdBy || 'Usuário interno'),
    createdById: String(raw?.createdById || '').trim() || undefined,
    updatedAt: String(raw?.updatedAt || createdAt),
    updatedBy: String(raw?.updatedBy || '').trim() || undefined,
    updatedById: String(raw?.updatedById || '').trim() || undefined,
  };
};

const isBoxLabelPermissionDenied = (error: any): boolean => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || error || '').toLowerCase();
  return code.includes('permission-denied') || message.includes('missing or insufficient permissions');
};

const boxLabelPermissionMessage = (error: any): string => {
  if (!isBoxLabelPermissionDenied(error)) {
    return String(error?.message || 'Não foi possível acessar as folhas A4363.');
  }
  return 'Permissão do Firebase recusada para Etiqueta Caixa. A sessão foi atualizada, mas o banco continua negando a operação. Verifique se as regras Firestore atuais foram publicadas e se o perfil possui Entrada de Material (material_intake) com permissão de edição.';
};

const refreshBoxLabelAuthToken = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente antes de usar Etiqueta Caixa.');
  await user.getIdToken(true);
};

const runBoxLabelWrite = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    await refreshBoxLabelAuthToken();
  } catch (error) {
    console.warn('Não foi possível atualizar o token antes da operação A4363:', error);
  }

  try {
    return await operation();
  } catch (error: any) {
    if (!isBoxLabelPermissionDenied(error)) throw error;
    try {
      await refreshBoxLabelAuthToken();
      return await operation();
    } catch (retryError: any) {
      if (isBoxLabelPermissionDenied(retryError)) {
        throw new Error(boxLabelPermissionMessage(retryError));
      }
      throw retryError;
    }
  }
};

export async function syncBoxLabelSheets(
  callback: (sheets: BoxLabelSheetRecord[]) => void,
  onError?: (message: string) => void,
) {
  // Força a renovação das custom claims antes de abrir o listener. Isso evita
  // permission-denied quando o perfil foi atualizado depois do login.
  try {
    await refreshBoxLabelAuthToken();
  } catch (error) {
    console.warn('Não foi possível atualizar o token antes de ler folhas A4363:', error);
  }

  // Buscamos diretamente todas as folhas ainda abertas. Assim, uma folha parcial
  // antiga nunca desaparece apenas porque existem muitas folhas concluídas mais
  // recentes. A ordenação é local para evitar exigir índice composto no Firestore.
  const q = query(collection(db, 'boxLabelSheets'), where('status', '==', 'open'));
  return onSnapshot(q, (snapshot) => {
    const sheets = snapshot.docs
      .map((item) => sanitizeBoxLabelSheet(item.id, item.data()))
      .filter((sheet) => sheet.status === 'open')
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    callback(sheets);
  }, (err) => {
    handleQuotaOrError(err);
    callback([]);
    onError?.(boxLabelPermissionMessage(err));
  });
}

const boxLabelDisplayCode = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `A4363-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

export async function createBoxLabelSheetDoc(actor: { id?: string; name?: string }): Promise<BoxLabelSheetRecord> {
  const now = new Date();
  const nowIso = now.toISOString();
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const id = `a4363_${random}`;
  const record: BoxLabelSheetRecord = {
    id,
    model: 'PIMACO_A4363',
    displayCode: boxLabelDisplayCode(now),
    status: 'open',
    slots: Array.from({ length: 14 }, (_, index) => ({ position: index + 1, status: 'available' as const })),
    createdAt: nowIso,
    createdBy: String(actor?.name || 'Usuário interno'),
    createdById: String(actor?.id || '').trim() || undefined,
    updatedAt: nowIso,
    updatedBy: String(actor?.name || 'Usuário interno'),
    updatedById: String(actor?.id || '').trim() || undefined,
  };
  await runBoxLabelWrite(() => setDoc(doc(db, 'boxLabelSheets', id), stripUndefinedDeep(record)));
  return record;
}

export async function saveBoxLabelSheetDoc(
  id: string,
  updates: Partial<Omit<BoxLabelSheetRecord, 'id' | 'model' | 'displayCode' | 'createdAt' | 'createdBy'>>,
): Promise<void> {
  if (!id) throw new Error('Folha A4363 sem identificador válido.');
  const payload: Record<string, any> = { ...updates };
  if (updates.slots) payload.slots = normalizeBoxLabelSlots(updates.slots);
  if (!payload.updatedAt) payload.updatedAt = new Date().toISOString();
  await runBoxLabelWrite(() => setDoc(doc(db, 'boxLabelSheets', id), stripUndefinedDeep(payload), { merge: true }));
}

export async function updateIntakeDevolutionPhoto(id: string, photoBase64: string): Promise<void> {
  const ref = doc(db, 'savedIntakes', id);
  if (photoBase64) {
    await updateDoc(ref, { photoDevolution: photoBase64 });
  } else {
    await updateDoc(ref, { photoDevolution: deleteField() });
  }
}

export async function updateIntakeDevolutionDraft(
  id: string,
  updates: Pick<SavedIntake, 'devolutionGeneratedAt' | 'devolutionGeneratedBy' | 'devolutionRows'>,
): Promise<void> {
  await updateDoc(doc(db, 'savedIntakes', id), updates);
}

export async function finalizeIntakeDelivery(
  id: string,
  updates: Pick<
    SavedIntake,
    | 'deliveryInstrumentPhotos'
    | 'deliveryFormPhotos'
    | 'deliveryFinalizedAt'
    | 'deliveryFinalizedBy'
    | 'deliveryLocked'
  >,
): Promise<void> {
  await updateDoc(doc(db, 'savedIntakes', id), updates);
}

export async function uploadIntakeDeliveryImage(
  intakeId: string,
  category: 'instruments' | 'signed-form',
  imageDataUrl: string,
  sequence: number,
): Promise<string> {
  const response = await fetch(imageDataUrl);
  const blob = await response.blob();
  const contentType = blob.type || 'image/jpeg';
  const extension = contentType.includes('png')
    ? 'png'
    : contentType.includes('webp')
      ? 'webp'
      : 'jpg';
  const safeIntakeId = String(intakeId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = `intake-deliveries/${safeIntakeId}/${category}/${Date.now()}_${sequence}.${extension}`;
  const storageRef = ref(storage, filePath);
  await uploadBytes(storageRef, blob, { contentType });
  return await getDownloadURL(storageRef);
}

export async function uploadIntakeEntryImage(
  intakeId: string,
  imageDataUrl: string,
  sequence: number,
): Promise<{ url: string; path: string }> {
  const blob = await dataUrlToBlob(imageDataUrl);
  const contentType = blob.type || 'image/jpeg';
  if (!contentType.match(/^image\/(jpeg|png|webp)$/i)) {
    throw new Error('Formato de imagem não permitido.');
  }
  if (blob.size > 5 * 1024 * 1024) {
    throw new Error('A imagem ultrapassa o limite de 5 MB.');
  }

  // Prefer the authenticated backend. It writes with Admin SDK after validating
  // the internal identity, so browser Storage-rule/cache timing cannot make an
  // operational upload disappear. Direct Storage remains as a fallback only.
  try {
    return await uploadOperationalImageViaBackend('intake-entry', intakeId, imageDataUrl, sequence);
  } catch (backendError) {
    console.warn('Backend intake image upload failed; trying direct Storage fallback:', backendError);
    const extension = extensionFromContentType(contentType);
    const path = `intake-entry-photos/${safeStorageSegment(intakeId)}/${Date.now()}_${sequence}.${extension}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, { contentType });
    return { url: await getDownloadURL(storageRef), path };
  }
}

export async function uploadInstrumentPhotoToStorage(
  instrumentId: string,
  category: 'registration' | 'calibrated',
  imageDataUrl: string,
): Promise<{ url: string; path: string }> {
  const blob = await dataUrlToBlob(imageDataUrl);
  const contentType = blob.type || 'image/jpeg';
  if (!contentType.match(/^image\/(jpeg|png|webp)$/i)) {
    throw new Error('Formato de imagem não permitido.');
  }
  if (blob.size > 5 * 1024 * 1024) {
    throw new Error('A imagem ultrapassa o limite de 5 MB.');
  }

  const purpose = category === 'registration' ? 'instrument-registration' : 'instrument-calibrated';
  try {
    return await uploadOperationalImageViaBackend(purpose, instrumentId, imageDataUrl);
  } catch (backendError) {
    console.warn('Backend instrument image upload failed; trying direct Storage fallback:', backendError);
    const extension = extensionFromContentType(contentType);
    const path = `instrument-photos/${safeStorageSegment(instrumentId)}/${category}/${Date.now()}.${extension}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, { contentType });
    return { url: await getDownloadURL(storageRef), path };
  }
}

export async function uploadInventoryAttachment(
  file: File,
  category: 'item' | 'transaction',
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  if (file.size > 10 * 1024 * 1024) {
    throw new Error(`O arquivo ${file.name} excede o limite de 10 MB.`);
  }
  const safeName = safeStorageSegment(file.name.replace(/\.[^.]+$/, '')) || 'arquivo';
  const extension = file.name.includes('.')
    ? file.name.split('.').pop()!.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)
    : extensionFromContentType(file.type);
  const path = `inventory-attachments/${safeStorageSegment(user.uid)}/${category}/${Date.now()}_${safeName}.${extension || 'bin'}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || 'application/octet-stream' });
  return await getDownloadURL(storageRef);
}

export async function updateIntakePhotosDoc(id: string, photos: string[]): Promise<void> {
  await updateDoc(doc(db, 'savedIntakes', id), { photos });
}

export async function deleteIntakeDoc(id: string): Promise<void> {
  await archiveCriticalRecord('savedIntakes', id);
}

// 6. Portal Users
export async function syncPortalUsers(callback: (users: PortalUser[]) => void) {
  const colRef = collection(db, 'portalUsers');

  // Employee records are intentionally not cached in localStorage.
  // This listener must only be started after an authenticated internal login.
  return onSnapshot(colRef, (snapshot) => {
    const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as PortalUser));
    callback(list);
  }, (err) => {
    console.warn('Firestore syncPortalUsers notice:', err);
    if (err && String(err).includes('Quota limit exceeded')) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: err }));
      }
    }
    callback([]);
  });
}

export async function addPortalUserDoc(user: Omit<PortalUser, 'id'>): Promise<PortalUser> {
  const newId = 'user_' + Date.now();
  const fullUser: PortalUser = { ...user, id: newId };
  await setDoc(doc(db, 'portalUsers', newId), fullUser);
  return fullUser;
}

export async function updatePortalUserDoc(id: string, updates: Partial<PortalUser>): Promise<void> {
  await updateDoc(doc(db, 'portalUsers', id), updates);
}

export async function uploadSignatureImage(file: File, userId: string, version: number): Promise<string> {
  const fileExtension = file.name.split('.').pop() || 'png';
  const filePath = `signatures/${userId}/signature_v${version}.${fileExtension}`;
  const storageRef = ref(storage, filePath);
  
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

export async function deletePortalUserDoc(idOrUsername: string): Promise<void> {
  await deleteDoc(doc(db, 'portalUsers', idOrUsername));
}

// 7. Employee Birthdays
export async function syncEmployeeBirthdays(callback: (birthdays: EmployeeBirthday[]) => void) {
  const cached = getLocalCache<EmployeeBirthday[]>('employeeBirthdays', []);
  if (cached.length > 0) callback(cached);
  const q = query(collection(db, 'employeeBirthdays'), limit(25));
  return onSnapshot(q, async (snapshot) => {
    const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as EmployeeBirthday)).filter((item: any) => item.isDeleted !== true);
    setLocalCache('employeeBirthdays', list);
    callback(list);
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
  await archiveCriticalRecord('employeeBirthdays', id);
}



// 8. Trainings
export async function syncTrainings(callback: (trainings: Training[]) => void) {
  const shared = createSharedSync<Training[]>(
    'trainings', 'trainings', [],
    (onData, onError) => onSnapshot(collection(db, 'trainings'), (snapshot) => {
      onData(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Training)).filter((item: any) => item.isDeleted !== true), !snapshot.metadata.fromCache);
    }, onError),
    { persistCache: true, cacheBackend: 'indexedDB', userScopedCache: true },
  );
  return shared(callback);
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
  await archiveCriticalRecord('trainings', id);
}

// 8.5 Employee ASOs
export async function syncEmployeeAsos(callback: (records: EmployeeAsoRecord[]) => void) {
  const shared = createSharedSync<EmployeeAsoRecord[]>(
    'employeeAsos', 'employeeAsos', [],
    (onData, onError) => onSnapshot(collection(db, 'employeeAsos'), (snapshot) => {
      onData(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as EmployeeAsoRecord)).filter((item: any) => item.isDeleted !== true), !snapshot.metadata.fromCache);
    }, onError),
    { persistCache: true, cacheBackend: 'indexedDB', userScopedCache: true },
  );
  return shared(callback);
}

export async function addEmployeeAsoDoc(data: Omit<EmployeeAsoRecord, 'id'>): Promise<EmployeeAsoRecord> {
  const newId = 'easo_' + Date.now();
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
  const fullItem: any = { ...cleanData, id: newId };
  await setDoc(doc(db, 'employeeAsos', newId), fullItem);
  return fullItem;
}

export async function updateEmployeeAsoDoc(id: string, data: Partial<EmployeeAsoRecord>): Promise<void> {
  await updateDoc(doc(db, 'employeeAsos', id), data);
}

export async function deleteEmployeeAsoDoc(id: string): Promise<void> {
  await archiveCriticalRecord('employeeAsos', id);
}

// 9. Employee Trainings
export async function syncEmployeeTrainings(callback: (records: EmployeeTrainingRecord[]) => void) {
  const shared = createSharedSync<EmployeeTrainingRecord[]>(
    'employeeTrainings', 'employeeTrainings', [],
    (onData, onError) => onSnapshot(collection(db, 'employeeTrainings'), (snapshot) => {
      onData(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as EmployeeTrainingRecord)).filter((item: any) => item.isDeleted !== true), !snapshot.metadata.fromCache);
    }, onError),
    { persistCache: true, cacheBackend: 'indexedDB', userScopedCache: true },
  );
  return shared(callback);
}

export async function addEmployeeTrainingDoc(data: Omit<EmployeeTrainingRecord, 'id'>): Promise<EmployeeTrainingRecord> {
  const newId = 'etr_' + Date.now();
  
  // Clean undefined values
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
  
  const fullItem: any = { ...cleanData, id: newId };
  await setDoc(doc(db, 'employeeTrainings', newId), fullItem);
  return fullItem;
}

export async function updateEmployeeTrainingDoc(id: string, data: Partial<EmployeeTrainingRecord>): Promise<void> {
  await updateDoc(doc(db, 'employeeTrainings', id), data);
}

export async function deleteEmployeeTrainingDoc(id: string): Promise<void> {
  await archiveCriticalRecord('employeeTrainings', id);
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
    if (err && err.code === 'permission-denied') {
      console.warn('Firestore sync permission denied (expected if not logged in).');
    } else {
      console.error('Firestore sync error:', err);
    }
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
    if (err && err.code === 'permission-denied') {
      console.warn('Firestore sync permission denied (expected if not logged in).');
    } else {
      console.error('Firestore sync error:', err);
    }
    callback('');
  });
}

export async function syncCalibrationLogoConfig(callback: (url: string) => void) {
  const docRef = doc(db, 'systemSettings', 'calibrationLogo');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback(data?.url || '');
      return;
    }
    callback('');
  }, (err) => {
    console.error('Error syncing calibrationLogo config:', err);
  });
}



export async function saveCalibrationLogoConfig(url: string): Promise<void> {
  const normalizedUrl = String(url || '').trim();
  const isAcceptedSource =
    normalizedUrl === '' ||
    normalizedUrl.startsWith('data:image/') ||
    normalizedUrl.startsWith('/') ||
    /^https:\/\//i.test(normalizedUrl);

  if (!isAcceptedSource) {
    throw new Error('A logomarca deve ser uma imagem enviada ou uma URL HTTPS válida.');
  }

  if (normalizedUrl.length > 750_000) {
    throw new Error('A logomarca ficou muito grande. Selecione uma imagem menor.');
  }

  const docRef = doc(db, 'systemSettings', 'calibrationLogo');
  await setDoc(docRef, { url: normalizedUrl });
}

export async function syncBoxLabelLogoConfig(callback: (url: string) => void) {
  const docRef = doc(db, 'systemSettings', 'boxLabelLogo');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback(data?.url || '');
      return;
    }
    callback('');
  }, (err) => {
    if (err && err.code === 'permission-denied') {
      console.warn('Firestore sync boxLabelLogo permission denied.');
    } else {
      console.error('Error syncing boxLabelLogo config:', err);
    }
    callback('');
  });
}

export async function saveBoxLabelLogoConfig(url: string): Promise<void> {
  const normalizedUrl = String(url || '').trim();
  const isAcceptedSource =
    normalizedUrl === '' ||
    normalizedUrl.startsWith('data:image/') ||
    normalizedUrl.startsWith('/') ||
    /^https:\/\//i.test(normalizedUrl);

  if (!isAcceptedSource) {
    throw new Error('A logomarca deve ser uma imagem enviada ou uma URL HTTPS válida.');
  }

  if (normalizedUrl.length > 750_000) {
    throw new Error('A logomarca ficou muito grande. Selecione uma imagem menor.');
  }

  const docRef = doc(db, 'systemSettings', 'boxLabelLogo');
  await setDoc(docRef, { url: normalizedUrl });
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
  const cached = getLocalCache<any>('companyInfo', null);
  if (cached) callback(cached);
  const docRef = doc(db, 'systemSettings', 'companyInfo');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      setLocalCache('companyInfo', data);
      callback(data);
    }
  }, (err) => {
    if (err && err.code === 'permission-denied') {
      console.warn('Firestore sync permission denied (expected if not logged in).');
    } else {
      console.error('Firestore sync error:', err);
    }
    if (cached) callback(cached);
  });
}

export async function saveCompanySettings(data: any): Promise<void> {
  try {
    const docRef = doc(db, 'systemSettings', 'companyInfo');
    await setDoc(docRef, data);
    setLocalCache('companyInfo', data);
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
    if (err && err.code === 'permission-denied') {
      console.warn('Firestore sync permission denied (expected if not logged in).');
    } else {
      console.error('Firestore sync error:', err);
    }
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
  const cached = getLocalCache<InventoryItem[]>('inventoryItems', []).filter((item) => item.isDeleted !== true);
  if (cached.length > 0) callback(cached);
  const q = query(collection(db, 'inventoryItems'), limit(500));
  return onSnapshot(q, (snapshot) => {
    const items: InventoryItem[] = [];
    snapshot.forEach(doc => {
      const item = { id: doc.id, ...doc.data() } as InventoryItem;
      if (item.isDeleted !== true) items.push(item);
    });
    setLocalCache('inventoryItems', items);
    callback(items);
  }, (err) => {
    handleQuotaOrError(err);
    callback(getLocalCache<InventoryItem[]>('inventoryItems', []));
  });
};

export const addInventoryItemDoc = async (item: Omit<InventoryItem, 'id'>) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const token = await user.getIdToken();
  const response = await fetch('/api/inventory/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(item),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.error || 'Não foi possível cadastrar o item.');
  const newItem = { id: String(payload.id || ''), ...item } as InventoryItem;
  const cached = getLocalCache<InventoryItem[]>('inventoryItems', []);
  const updated = [newItem, ...cached.filter(i => i.id !== newItem.id)];
  setLocalCache('inventoryItems', updated);
};

export const updateInventoryItemDoc = async (id: string, updates: Partial<InventoryItem>) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const token = await user.getIdToken();
  const response = await fetch(`/api/inventory/items/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.error || 'Não foi possível atualizar o item.');
  const appliedUpdates = payload?.updates || updates;
  const cached = getLocalCache<InventoryItem[]>('inventoryItems', []);
  const updated = cached.map(i => i.id === id ? { ...i, ...appliedUpdates } : i);
  setLocalCache('inventoryItems', updated);
};

export const deleteInventoryItemDoc = async (id: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const token = await user.getIdToken();
  const response = await fetch(`/api/inventory/items/${encodeURIComponent(id)}/archive`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || 'Não foi possível arquivar o item.');
  }
  const cached = getLocalCache<InventoryItem[]>('inventoryItems', []);
  const updated = cached.filter(i => i.id !== id);
  setLocalCache('inventoryItems', updated);
};

// Inventory Transactions
export const syncInventoryTransactions = (callback: (transactions: InventoryTransaction[]) => void) => {
  const cached = getLocalCache<InventoryTransaction[]>('inventoryTransactions', []);
  if (cached.length > 0) callback(cached);
  const q = query(collection(db, 'inventoryTransactions'), orderBy('date', 'desc'), limit(500));
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
  const newTx = { id: newRef.id, ...transaction } as InventoryTransaction;
  await setDoc(newRef, transaction);
  const cached = getLocalCache<InventoryTransaction[]>('inventoryTransactions', []);
  const updated = [newTx, ...cached.filter(t => t.id !== newRef.id)];
  setLocalCache('inventoryTransactions', updated);
};

export async function moveInventoryAtomically(input: {
  itemId: string;
  type: 'entrada' | 'saida';
  quantity: number;
  reason: string;
  employeeId?: string;
  attachments?: string[];
}): Promise<{ transactionId: string; newQuantity: number }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const token = await user.getIdToken();
  const response = await fetch('/api/inventory/move', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (payload?.error === 'INSUFFICIENT_STOCK') {
      throw new Error('A quantidade em estoque não pode ficar negativa.');
    }
    if (payload?.error === 'ITEM_NOT_FOUND') {
      throw new Error('Item de estoque não encontrado ou inativo.');
    }
    throw new Error(payload?.message || payload?.error || 'Não foi possível registrar a movimentação.');
  }
  return {
    transactionId: String(payload.transactionId || ''),
    newQuantity: Number(payload.newQuantity || 0),
  };
}

// Reference Standards (Padrões de Referência)
export function syncReferenceStandards(callback: (standards: ReferenceStandard[]) => void) {
  const cached = getLocalCache<ReferenceStandard[]>('referenceStandards', [])
    .filter(standard => standard.isDeleted !== true);
  if (cached.length > 0) callback(cached);
  const q = query(collection(db, 'referenceStandards'), limit(500));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs
      .map(d => ({ ...d.data(), id: d.id } as ReferenceStandard))
      .filter(standard => standard.isDeleted !== true);
    setLocalCache('referenceStandards', list);
    callback(list);
  }, (err) => {
    handleQuotaOrError(err);
    callback(getLocalCache<ReferenceStandard[]>('referenceStandards', []).filter(standard => standard.isDeleted !== true));
  });
}

export async function addReferenceStandardDoc(data: Omit<ReferenceStandard, 'id'>): Promise<ReferenceStandard> {
  const newId = 'std_' + Date.now();
  const item: ReferenceStandard = { ...data, id: newId };
  await setDoc(doc(db, 'referenceStandards', newId), item);
  
  const cached = getLocalCache<ReferenceStandard[]>('referenceStandards', []);
  const updated = [item, ...cached.filter(s => s.id !== newId)];
  setLocalCache('referenceStandards', updated);
  
  return item;
}

export async function updateReferenceStandardDoc(id: string, updates: Partial<ReferenceStandard>): Promise<void> {
  await updateDoc(doc(db, 'referenceStandards', id), updates);
  
  const cached = getLocalCache<ReferenceStandard[]>('referenceStandards', []);
  const updated = cached.map(s => s.id === id ? { ...s, ...updates } : s);
  setLocalCache('referenceStandards', updated);
}

export async function deleteReferenceStandardDoc(id: string): Promise<void> {
  await archiveCriticalRecord('referenceStandards', id);
  
  const cached = getLocalCache<ReferenceStandard[]>('referenceStandards', []);
  const updated = cached.filter(s => s.id !== id);
  setLocalCache('referenceStandards', updated);
}

export async function syncMedicalExams(callback: (exams: MedicalExam[]) => void) {
  const shared = createSharedSync<MedicalExam[]>(
    'medical_exams', 'medical_exams', [],
    (onData, onError) => {
      const q = query(collection(db, 'medical_exams'), limit(25));
      return onSnapshot(q, (snapshot) => {
        onData(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as MedicalExam)).filter((item: any) => item.isDeleted !== true), !snapshot.metadata.fromCache);
      }, onError);
    },
    { persistCache: true, cacheBackend: 'indexedDB', userScopedCache: true },
  );
  return shared(callback);
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
  await archiveCriticalRecord('medical_exams', id);
}

export async function syncExamTypes(callback: (types: ExamTypeItem[]) => void) {
  const defaults: ExamTypeItem[] = [
    { id: '1', name: 'Admissional', description: 'Realizado antes de o funcionário iniciar suas atividades.', validityMonths: null },
    { id: '2', name: 'Demissional', description: 'Realizado no desligamento do funcionário.', validityMonths: null },
    { id: '3', name: 'Periódico', description: 'Realizado em intervalos regulares.', validityMonths: 12 },
    { id: '4', name: 'Retorno ao Trabalho', description: 'Após afastamento igual ou superior a 30 dias por doença ou acidente.', validityMonths: null },
    { id: '5', name: 'Mudança de Função', description: 'Antes da mudança de função ou setor que implique alteração de risco.', validityMonths: null },
    { id: '6', name: 'Audiometria', description: 'Avaliação da capacidade auditiva.', validityMonths: 6 }
  ];
  callback(getLocalCache<ExamTypeItem[]>('examTypes', defaults));
  const docRef = doc(db, 'systemSettings', 'examTypes');
  return onSnapshot(docRef, (snapshot) => {
    const types = snapshot.exists() ? snapshot.data().types as ExamTypeItem[] : defaults;
    setLocalCache('examTypes', types);
    callback(types);
  }, (err) => {
    console.error('Firestore syncExamTypes error:', err);
    callback(getLocalCache<ExamTypeItem[]>('examTypes', defaults));
  });
}

export async function saveExamTypes(types: ExamTypeItem[]): Promise<void> {
  await setDoc(doc(db, 'systemSettings', 'examTypes'), { types });
  setLocalCache('examTypes', types);
}

// Destructive production reset helpers were removed. Restore data only from an explicit backup/recovery workflow.

// 8. Payslips (Contra-cheques)
export async function syncPayslips(callback: (payslips: Payslip[]) => void, employeeId?: string) {
  const scopeKey = employeeId ? `payslips_${employeeId}` : 'payslips_all';
  const shared = createSharedSync<Payslip[]>(
    scopeKey, scopeKey, [],
    (onData, onError) => {
      const q = employeeId
        ? query(collection(db, 'payslips'), where('employeeId', '==', employeeId))
        : query(collection(db, 'payslips'));
      return onSnapshot(q, (snapshot) => {
        onData(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Payslip)).filter((item: any) => item.isDeleted !== true), !snapshot.metadata.fromCache);
      }, onError);
    },
    { persistCache: true, cacheBackend: 'indexedDB', userScopedCache: true },
  );
  return shared(callback);
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
  await archiveCriticalRecord('payslips', id);
}

// 9. Calibration Audit Logs (Auditoria de Tempo de Calibração)
export async function syncCalibrationAuditLogs(callback: (logs: CalibrationAuditLog[]) => void) {
  const cached = getLocalCache<CalibrationAuditLog[]>('calibrationAuditLogs', [])
    .filter(log => log.isDeleted !== true)
    .sort((a, b) => new Date(b.endTime || b.startTime).getTime() - new Date(a.endTime || a.startTime).getTime());
  if (cached.length > 0) callback(cached);

  // IMPORTANT: do not combine an unordered limit with timestamp-based document ids.
  // The old query used limit(25) without orderBy, which could keep returning the
  // oldest document ids forever and made the audit dashboard appear frozen.
  // The audit screen needs the complete active history for totals, filters and stats.
  const q = query(collection(db, 'calibrationAuditLogs'), orderBy('endTime', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs
      .map(d => ({ ...d.data(), id: d.id } as CalibrationAuditLog))
      .filter(log => log.isDeleted !== true);
    setLocalCache('calibrationAuditLogs', list);
    callback(list);
  }, (err) => {
    handleQuotaOrError(err);
    callback(
      getLocalCache<CalibrationAuditLog[]>('calibrationAuditLogs', [])
        .filter(log => log.isDeleted !== true)
        .sort((a, b) => new Date(b.endTime || b.startTime).getTime() - new Date(a.endTime || a.startTime).getTime()),
    );
  });
}

export async function addCalibrationAuditLogDoc(data: Omit<CalibrationAuditLog, 'id'>): Promise<CalibrationAuditLog> {
  const newId = 'audit_' + Date.now();
  const logEntry: CalibrationAuditLog = { ...data, id: newId };
  await setDoc(doc(db, 'calibrationAuditLogs', newId), logEntry);
  return logEntry;
}

export async function deleteCalibrationAuditLogDoc(id: string): Promise<void> {
  await archiveCriticalRecord('calibrationAuditLogs', id);
}

// 10. RNC Reports (Relatórios de Não Conformidade)
export async function syncRncReports(callback: (reports: RncReport[]) => void) {
  const cached = getLocalCache<RncReport[]>('rncReports', [])
    .filter(report => report.isDeleted !== true);
  if (cached.length > 0) callback(cached);
  const q = query(collection(db, 'rncReports'), orderBy('date', 'desc'), limit(25));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs
      .map(d => ({ ...d.data(), id: d.id } as RncReport))
      .filter(report => report.isDeleted !== true);
    setLocalCache('rncReports', list);
    callback(list);
  }, (err) => {
    handleQuotaOrError(err);
    callback(getLocalCache<RncReport[]>('rncReports', []).filter(report => report.isDeleted !== true));
  });
}

export async function saveRncReportDoc(data: RncReport): Promise<void> {
  let clientId = String(data.clientId || '').trim();

  // Registros novos devem sempre carregar o vínculo do cliente. Para chamadas
  // antigas/restaurações que ainda não enviem clientId, resolvemos pelo
  // instrumento antes de gravar.
  if (!clientId && data.instrumentId) {
    const instrumentSnap = await getDoc(doc(db, 'instruments', data.instrumentId));
    if (instrumentSnap.exists()) {
      clientId = String(instrumentSnap.data()?.clientId || '').trim();
    }
  }

  const payload: RncReport = clientId ? { ...data, clientId } : data;
  await setDoc(doc(db, 'rncReports', data.id), payload);
}

export async function deleteRncDoc(id: string): Promise<void> {
  await archiveCriticalRecord('rncReports', id);
}





// --- RENTAL MODULE ---

const rentalApiRequest = async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const token = await user.getIdToken();
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(url, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = String(payload?.error || payload?.message || 'RENTAL_REQUEST_FAILED');
    const messages: Record<string, string> = {
      MODULE_EDIT_DENIED: 'Seu perfil permite apenas visualizar o módulo de Locação.',
      RENTAL_NOT_FOUND: 'Locação não encontrada.',
      RENTAL_ASSET_NOT_AVAILABLE: 'Um ou mais equipamentos selecionados não estão disponíveis.',
      RENTAL_ASSET_NOT_FOUND: 'Equipamento locável não encontrado.',
      RENTAL_ASSET_IN_USE: 'Este equipamento está vinculado a uma locação ativa e não pode ser excluído.',
      RENTAL_ASSET_CALIBRATION_EXPIRED: 'Um ou mais manômetros estão com a calibração vencida. Atualize a calibração antes de registrar a saída da locação.',
      RENTAL_NOT_ACTIVE: 'Esta locação não está ativa.',
      RENTAL_ALREADY_DISPATCHED: 'A saída desta locação já foi registrada.',
      RENTAL_NO_ACTIVE_ITEMS: 'Não existem itens ativos para faturar.',
      RENTAL_INVOICE_SEQUENCE_NOT_CONFIGURED: 'Configure o próximo número da fatura antes de emitir.',
      RENTAL_INVOICE_ALREADY_EXISTS: 'A fatura deste ciclo já foi gerada.',
      RENTAL_BILLING_CYCLE_NOT_STARTED: 'O próximo ciclo mensal ainda não começou. A renovação só pode ser faturada a partir do primeiro dia do respectivo ciclo.',
      RENTAL_INVALID_INVOICE_SEQUENCE: 'O próximo número da fatura é inválido ou já foi utilizado.',
      INVALID_RENTAL_DATA: 'Revise os dados obrigatórios da locação.',
      FORBIDDEN: 'Somente o perfil Administrador pode executar esta exclusão.',
      DELETE_REASON_REQUIRED: 'Informe o motivo da exclusão administrativa.',
      RENTAL_DELETE_TOO_MANY_LINKED_RECORDS: 'A locação possui vínculos demais para uma exclusão segura em uma única operação. Acione o suporte técnico.',
    };
    throw new Error(messages[code] || code);
  }
  return payload as T;
};

export const syncRentalServices = (callback: (items: RentalService[]) => void) => {
  const shared = createSharedSync<RentalService[]>(
    'rentalServices', 'rentalServices', [],
    (onData, onError) => {
      const q = query(collection(db, 'rentalServices'), orderBy('name', 'asc'), limit(500));
      return onSnapshot(q, (snapshot) => onData(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RentalService)), !snapshot.metadata.fromCache), onError);
    },
    { persistCache: true, cacheBackend: 'indexedDB', userScopedCache: true },
  );
  return shared(callback);
};

export const saveRentalService = async (service: Partial<RentalService>): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const now = new Date().toISOString();
  const id = String(service.id || '').trim() || `rsvc_${Date.now()}`;
  const refDoc = doc(db, 'rentalServices', id);
  const existing = await getDoc(refDoc);
  const payload = {
    name: String(service.name || '').trim(),
    description: String(service.description || '').trim(),
    monthlyPrice: Number(service.monthlyPrice || 0),
    cnaeCode: String(service.cnaeCode || '7739-0/99').trim(),
    cnaeDescription: String(service.cnaeDescription || 'Atividade de aluguel de outras máquinas e equipamentos comerciais e industriais não especificados anteriormente, sem operador.').trim(),
    active: service.active !== false,
    updatedAt: now,
    updatedBy: user.displayName || user.email || 'Usuário interno',
    updatedByUid: user.uid,
    ...(existing.exists() ? {} : {
      createdAt: now,
      createdBy: user.displayName || user.email || 'Usuário interno',
      createdByUid: user.uid,
    }),
  };
  await setDoc(refDoc, payload, { merge: true });
  return id;
};

export const syncRentalAssets = (callback: (items: RentalAsset[]) => void) => {
  const shared = createSharedSync<RentalAsset[]>(
    'rentalAssets', 'rentalAssets', [],
    (onData, onError) => {
      const q = query(collection(db, 'rentalAssets'), orderBy('assetCode', 'asc'), limit(1000));
      return onSnapshot(q, (snapshot) => onData(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RentalAsset)), !snapshot.metadata.fromCache), onError);
    },
    { persistCache: true, cacheBackend: 'indexedDB', userScopedCache: true },
  );
  return shared(callback);
};

export const saveRentalAsset = async (asset: Partial<RentalAsset>): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const now = new Date().toISOString();
  const id = String(asset.id || '').trim() || `rasset_${Date.now()}`;
  const refDoc = doc(db, 'rentalAssets', id);
  const existing = await getDoc(refDoc);
  const payload = {
    assetCode: String(asset.assetCode || '').trim(),
    tag: String(asset.tag || '').trim(),
    description: String(asset.description || 'Manômetro com base').trim(),
    brand: String(asset.brand || '').trim(),
    model: String(asset.model || '').trim(),
    serialNumber: String(asset.serialNumber || '').trim(),
    rangeMin: asset.rangeMin === undefined || asset.rangeMin === null ? null : Number(asset.rangeMin),
    rangeMax: asset.rangeMax === undefined || asset.rangeMax === null ? null : Number(asset.rangeMax),
    unit: String(asset.unit || '').trim(),
    baseIdentification: String(asset.baseIdentification || '').trim(),
    calibrationCertificateNumber: String(asset.calibrationCertificateNumber || '').trim(),
    calibrationDueDate: String(asset.calibrationDueDate || '').trim(),
    defaultServiceId: String(asset.defaultServiceId || '').trim(),
    status: asset.status || 'disponivel',
    notes: String(asset.notes || '').trim(),
    updatedAt: now,
    updatedBy: user.displayName || user.email || 'Usuário interno',
    updatedByUid: user.uid,
    ...(existing.exists() ? {} : {
      createdAt: now,
      createdBy: user.displayName || user.email || 'Usuário interno',
      createdByUid: user.uid,
    }),
  };
  await setDoc(refDoc, payload, { merge: true });
  return id;
};

export const syncRentalContracts = (callback: (items: RentalContract[]) => void) => {
  const shared = createSharedSync<RentalContract[]>(
    'rentalContracts', 'rentalContracts', [],
    (onData, onError) => {
      const q = query(collection(db, 'rentalContracts'), orderBy('createdAt', 'desc'), limit(1000));
      return onSnapshot(q, (snapshot) => onData(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RentalContract)), !snapshot.metadata.fromCache), onError);
    },
    { persistCache: true, cacheBackend: 'indexedDB', userScopedCache: true },
  );
  return shared(callback);
};

export const syncRentalInvoices = (callback: (items: RentalInvoice[]) => void) => {
  const shared = createSharedSync<RentalInvoice[]>(
    'rentalInvoices', 'rentalInvoices', [],
    (onData, onError) => {
      const q = query(collection(db, 'rentalInvoices'), orderBy('createdAt', 'desc'), limit(1000));
      return onSnapshot(q, (snapshot) => onData(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RentalInvoice)), !snapshot.metadata.fromCache), onError);
    },
    { persistCache: true, cacheBackend: 'indexedDB', userScopedCache: true },
  );
  return shared(callback);
};

export const syncRentalMovements = (callback: (items: RentalMovement[]) => void) => {
  const shared = createSharedSync<RentalMovement[]>(
    'rentalMovements', 'rentalMovements', [],
    (onData, onError) => {
      const q = query(collection(db, 'rentalMovements'), orderBy('createdAt', 'desc'), limit(1000));
      return onSnapshot(q, (snapshot) => onData(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RentalMovement)), !snapshot.metadata.fromCache), onError);
    },
    { persistCache: true, cacheBackend: 'indexedDB', userScopedCache: true },
  );
  return shared(callback);
};

export const syncRentalSettings = (callback: (settings: RentalSettings | null) => void) => {
  const shared = createSharedSync<RentalSettings | null>(
    'rentalSettings', 'rentalSettings', null,
    (onData, onError) => onSnapshot(doc(db, 'systemSettings', 'rentalBilling'), (snapshot) => {
      onData(snapshot.exists() ? snapshot.data() as RentalSettings : null, !snapshot.metadata.fromCache);
    }, onError),
    { persistCache: true, cacheBackend: 'indexedDB', userScopedCache: true },
  );
  return shared(callback);
};

export const saveRentalSettings = async (settings: Partial<RentalSettings>): Promise<RentalSettings> => {
  const result = await rentalApiRequest<{ success: true; settings: RentalSettings }>('/api/rentals/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  return result.settings;
};

export const createRentalContract = async (payload: Record<string, unknown>): Promise<RentalContract> => {
  const result = await rentalApiRequest<{ success: true; rental: RentalContract }>('/api/rentals/contracts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return result.rental;
};

export const updateRentalContract = async (id: string, payload: Record<string, unknown>): Promise<RentalContract> => {
  const result = await rentalApiRequest<{ success: true; rental: RentalContract }>(`/api/rentals/contracts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return result.rental;
};

export const dispatchRentalContract = async (
  id: string,
  payload: { responsibleClient: string; responsibleClientDocument?: string; notes?: string; date?: string },
): Promise<{ rental: RentalContract; movement: RentalMovement }> => {
  const result = await rentalApiRequest<{ success: true; rental: RentalContract; movement: RentalMovement }>(`/api/rentals/contracts/${encodeURIComponent(id)}/dispatch`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { rental: result.rental, movement: result.movement };
};

export const returnRentalItems = async (
  id: string,
  payload: { responsibleClient: string; responsibleClientDocument?: string; attachments?: string[]; notes?: string; date?: string; items: Array<{ assetId: string; condition: string; notes?: string }> },
): Promise<{ rental: RentalContract; movement: RentalMovement }> => {
  const result = await rentalApiRequest<{ success: true; rental: RentalContract; movement: RentalMovement }>(`/api/rentals/contracts/${encodeURIComponent(id)}/return`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { rental: result.rental, movement: result.movement };
};

export const generateRentalInvoice = async (id: string, payload: { invoiceNumber?: string; dueDate?: string } = {}): Promise<{ invoice: RentalInvoice; financeTransactionId: string }> => {
  const result = await rentalApiRequest<{ success: true; invoice: RentalInvoice; financeTransactionId: string }>(`/api/rentals/contracts/${encodeURIComponent(id)}/invoices`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { invoice: result.invoice, financeTransactionId: result.financeTransactionId };
};

export const deleteRentalAsset = async (id: string, reason: string): Promise<void> => {
  await rentalApiRequest<{ success: true }>(`/api/rentals/assets/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
};

export const deleteRentalInvoice = async (id: string, reason: string): Promise<{ deletedFinanceTransactionId?: string }> => {
  const result = await rentalApiRequest<{ success: true; deletedFinanceTransactionId?: string }>(`/api/rentals/invoices/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
  return { deletedFinanceTransactionId: result.deletedFinanceTransactionId };
};

export const deleteRentalContract = async (id: string, reason: string): Promise<{ deletedInvoices: number; deletedFinanceTransactions: number; deletedMovements: number; releasedAssets: number }> => {
  const result = await rentalApiRequest<{ success: true; deletedInvoices: number; deletedFinanceTransactions: number; deletedMovements: number; releasedAssets: number }>(`/api/rentals/contracts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
  return {
    deletedInvoices: Number(result.deletedInvoices || 0),
    deletedFinanceTransactions: Number(result.deletedFinanceTransactions || 0),
    deletedMovements: Number(result.deletedMovements || 0),
    releasedAssets: Number(result.releasedAssets || 0),
  };
};


// --- FINANCE MODULE ---

import { FinanceTransaction, FinanceContract, FinanceMeasurement, FinanceOperation, FinanceOperationKind, FinanceBankStatementItem, FinanceAuditEntry } from '../types';

export const syncFinanceTransactions = (callback: (transactions: FinanceTransaction[]) => void) => {
  const shared = createSharedSync<FinanceTransaction[]>(
    'financeTransactions',
    'financeTransactions',
    [],
    (onData, onError) => {
      const q = query(collection(db, 'financeTransactions'), orderBy('date', 'desc'), limit(1000));
      return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinanceTransaction)).filter((item: any) => item.isDeleted !== true);
        onData(items, !snapshot.metadata.fromCache);
      }, onError);
    },
    { persistCache: true, cacheBackend: 'indexedDB', userScopedCache: true }
  );
  return shared(callback);
};

export const addFinanceTransaction = async (transaction: Omit<FinanceTransaction, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date().toISOString();
  const originalAmount = Math.max(0, Number(transaction.amount || 0));
  const paidAmount = Math.max(0, Math.min(originalAmount, Number(transaction.paidAmount || 0)));
  const openBalance = Math.max(0, originalAmount - paidAmount);
  const docRef = await addDoc(collection(db, 'financeTransactions'), {
    ...transaction,
    amount: originalAmount,
    paidAmount,
    openBalance,
    status: openBalance <= 0 && originalAmount > 0 ? 'pago' : transaction.status,
    settlements: Array.isArray(transaction.settlements) ? transaction.settlements : [],
    createdByUid: auth.currentUser?.uid || transaction.createdByUid || '',
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
};

export const updateFinanceTransaction = async (id: string, updates: Partial<FinanceTransaction>) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const docRef = doc(db, 'financeTransactions', id);
  await updateDoc(docRef, {
    ...updates,
    updatedByUid: user.uid,
    updatedAt: new Date().toISOString(),
  });
};

export async function settleFinanceTransaction(input: {
  transactionId: string;
  amount: number;
  date: string;
  bankAccount?: string;
  paymentMethod?: string;
  notes?: string;
}): Promise<{ paidAmount: number; openBalance: number; status: FinanceTransaction['status'] }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const token = await user.getIdToken();
  const response = await fetch(`/api/finance/transactions/${encodeURIComponent(input.transactionId)}/settle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (payload?.error === 'SETTLEMENT_EXCEEDS_BALANCE') throw new Error('O valor da baixa excede o saldo em aberto do título.');
    if (payload?.error === 'TRANSACTION_NOT_FOUND') throw new Error('Lançamento financeiro não encontrado.');
    throw new Error(payload?.message || payload?.error || 'Não foi possível registrar a baixa financeira.');
  }
  return {
    paidAmount: Number(payload.paidAmount || 0),
    openBalance: Number(payload.openBalance || 0),
    status: payload.status || 'pendente',
  };
}

export async function importFinanceTransactions(items: Array<Partial<FinanceTransaction>>): Promise<{ imported: number; skipped: number; errors: Array<{ row: number; message: string }> }> {
  if (!Array.isArray(items) || items.length === 0) return { imported: 0, skipped: 0, errors: [] };
  if (items.length > 1000) throw new Error('O limite por importação é de 1.000 lançamentos.');
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const token = await user.getIdToken();
  const response = await fetch('/api/finance/transactions/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ items }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.error || 'Não foi possível importar os lançamentos financeiros.');
  return { imported: Number(payload.imported || 0), skipped: Number(payload.skipped || 0), errors: Array.isArray(payload.errors) ? payload.errors : [] };
}

export async function importFinanceModuleRows(
  entity: 'contracts' | 'measurements' | 'bankAccounts' | 'categories',
  items: Array<Record<string, any>>
): Promise<{ imported: number; skipped: number; errors: Array<{ row: number; message: string }> }> {
  if (!Array.isArray(items) || items.length === 0) return { imported: 0, skipped: 0, errors: [] };
  if (items.length > 1000) throw new Error('O limite por importação é de 1.000 registros.');
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const token = await user.getIdToken();
  const response = await fetch('/api/finance/module-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ entity, items }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.error || 'Não foi possível importar os dados financeiros.');
  return {
    imported: Number(payload.imported || 0),
    skipped: Number(payload.skipped || 0),
    errors: Array.isArray(payload.errors) ? payload.errors : [],
  };
}

export const deleteFinanceTransaction = async (id: string) => {
  await archiveCriticalRecord('financeTransactions', id);
};

export const syncFinanceContracts = (callback: (contracts: FinanceContract[]) => void) => {
  const shared = createSharedSync<FinanceContract[]>(
    'financeContracts',
    'financeContracts',
    [],
    (onData, onError) => {
      const q = query(collection(db, 'financeContracts'), limit(1000));
      return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinanceContract)).filter((item: any) => item.isDeleted !== true);
        onData(items, !snapshot.metadata.fromCache);
      }, onError);
    },
    { persistCache: true, cacheBackend: 'indexedDB', userScopedCache: true }
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
  await archiveCriticalRecord('financeContracts', id);
};

export const syncFinanceMeasurements = (callback: (measurements: FinanceMeasurement[]) => void) => {
  const shared = createSharedSync<FinanceMeasurement[]>(
    'financeMeasurements',
    'financeMeasurements',
    [],
    (onData, onError) => {
      const q = query(collection(db, 'financeMeasurements'), orderBy('createdAt', 'desc'), limit(1000));
      return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinanceMeasurement)).filter((item: any) => item.isDeleted !== true);
        onData(items, !snapshot.metadata.fromCache);
      }, onError);
    },
    { persistCache: true, cacheBackend: 'indexedDB', userScopedCache: true }
  );
  return shared(callback);
};

export const addFinanceMeasurement = async (measurement: Omit<FinanceMeasurement, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'financeMeasurements'), stripUndefinedDeep({
    ...measurement,
    createdAt: now,
    updatedAt: now,
  }));
  return docRef.id;
};

export const updateFinanceMeasurement = async (id: string, updates: Partial<FinanceMeasurement>) => {
  const docRef = doc(db, 'financeMeasurements', id);
  await updateDoc(docRef, stripUndefinedDeep({
    ...updates,
    updatedAt: new Date().toISOString(),
  }));
};

export const deleteFinanceMeasurement = async (id: string) => {
  await archiveCriticalRecord('financeMeasurements', id);
};

// Generic Finance Operations
export const syncFinanceCollection = <T>(collectionName: string, callback: (data: T[]) => void, maxItems = 25) => {
  const shared = createSharedSync<T[]>(
    `financeCollection_${collectionName}`,
    collectionName,
    [],
    (onData, onError) => {
      const q = query(collection(db, collectionName), limit(Math.max(1, Math.min(1000, Math.floor(maxItems || 25)))));
      return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T)).filter((item: any) => item?.isDeleted !== true);
        onData(items, !snapshot.metadata.fromCache);
      }, onError);
    },
    { persistCache: true, cacheBackend: 'indexedDB', userScopedCache: true }
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
  await archiveCriticalRecord(collectionName, id);
};


export const syncFinanceOperations = (callback: (items: FinanceOperation[]) => void) => {
  const shared = createSharedSync<FinanceOperation[]>(
    'financeOperations',
    'financeOperations',
    [],
    (onData, onError) => {
      const q = query(collection(db, 'financeOperations'), orderBy('updatedAt', 'desc'), limit(1000));
      return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs
          .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as FinanceOperation))
          .filter((item: any) => item?.isDeleted !== true);
        onData(items, !snapshot.metadata.fromCache);
      }, onError);
    },
    { persistCache: true, cacheBackend: 'indexedDB', userScopedCache: true }
  );
  return shared(callback);
};

async function financeAuthorizedRequest<T = any>(url: string, init: RequestInit = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const token = await user.getIdToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = String(payload?.error || '');
    const known: Record<string, string> = {
      INVALID_FINANCE_OPERATION: 'Preencha os campos obrigatórios da operação financeira.',
      FINANCE_OPERATION_NOT_FOUND: 'Registro financeiro não encontrado.',
      FINANCE_OPERATION_LOCKED: 'Este registro já gerou lançamento financeiro. Os campos financeiros estão bloqueados para preservar o histórico.',
      FINANCE_OPERATION_ALREADY_DECIDED: 'Esta solicitação já foi aprovada ou rejeitada.',
      INVALID_FINANCE_OPERATION_IMPORT: 'A planilha contém dados inválidos.',
      INVALID_BANK_STATEMENT: 'O extrato não contém movimentações válidas.',
      BANK_STATEMENT_ITEM_NOT_FOUND: 'Movimento bancário não encontrado.',
      FINANCE_RECONCILIATION_AMOUNT_MISMATCH: 'O valor do movimento bancário não é compatível com o saldo do lançamento selecionado.',
      FINANCE_RECONCILIATION_TYPE_MISMATCH: 'O movimento bancário e o lançamento selecionado são de naturezas diferentes.',
      TRANSACTION_NOT_FOUND: 'Lançamento financeiro não encontrado.',
    };
    throw new Error(payload?.message || known[code] || code || 'Não foi possível concluir a operação financeira.');
  }
  return payload as T;
}

export async function createFinanceOperation(input: Partial<FinanceOperation> & { kind: FinanceOperationKind }): Promise<{ id: string; financeTransactionIds: string[] }> {
  const result = await financeAuthorizedRequest<{ success: true; id: string; financeTransactionIds?: string[] }>('/api/finance/operations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return { id: result.id, financeTransactionIds: result.financeTransactionIds || [] };
}

export async function updateFinanceOperationRecord(id: string, input: Partial<FinanceOperation>): Promise<void> {
  await financeAuthorizedRequest(`/api/finance/operations/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function decideFinanceOperation(id: string, decision: 'aprovar' | 'rejeitar'): Promise<{ financeTransactionIds: string[] }> {
  const result = await financeAuthorizedRequest<{ success: true; financeTransactionIds?: string[] }>(`/api/finance/operations/${encodeURIComponent(id)}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  });
  return { financeTransactionIds: result.financeTransactionIds || [] };
}

export async function importFinanceOperations(items: Array<Record<string, any>>): Promise<{ imported: number; skipped: number; errors: Array<{ row: number; message: string }> }> {
  if (!Array.isArray(items) || items.length === 0) return { imported: 0, skipped: 0, errors: [] };
  if (items.length > 200) throw new Error('O limite por importação é de 200 registros operacionais.');
  const result = await financeAuthorizedRequest<{ success: true; imported: number; skipped: number; errors?: Array<{ row: number; message: string }> }>('/api/finance/operations/import', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
  return { imported: Number(result.imported || 0), skipped: Number(result.skipped || 0), errors: Array.isArray(result.errors) ? result.errors : [] };
}

export const archiveFinanceOperation = async (id: string) => {
  await archiveCriticalRecord('financeOperations', id);
};

export const syncFinanceBankStatementItems = (callback: (items: FinanceBankStatementItem[]) => void) => {
  const shared = createSharedSync<FinanceBankStatementItem[]>(
    'financeBankStatementItems',
    'financeBankStatementItems',
    [],
    (onData, onError) => {
      const q = query(collection(db, 'financeBankStatementItems'), orderBy('date', 'desc'), limit(1000));
      return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs
          .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as FinanceBankStatementItem))
          .filter((item: any) => item?.isDeleted !== true);
        onData(items, !snapshot.metadata.fromCache);
      }, onError);
    },
    { persistCache: true, cacheBackend: 'indexedDB', userScopedCache: true }
  );
  return shared(callback);
};

export async function importFinanceBankStatement(input: {
  bankAccountId: string;
  bankAccountLabel: string;
  endingBalance?: number | null;
  items: Array<{ date: string; description: string; amount: number; externalId?: string; documentNumber?: string }>;
}): Promise<{ imported: number; skipped: number }> {
  const result = await financeAuthorizedRequest<{ success: true; imported: number; skipped: number }>('/api/finance/reconciliation/import', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return { imported: Number(result.imported || 0), skipped: Number(result.skipped || 0) };
}

export async function reconcileFinanceBankStatementItem(
  id: string,
  input: { action: 'match' | 'create_and_match' | 'ignore'; transactionId?: string }
): Promise<void> {
  await financeAuthorizedRequest(`/api/finance/reconciliation/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchFinanceAudit(limitItems = 150): Promise<FinanceAuditEntry[]> {
  const result = await financeAuthorizedRequest<{ success: true; items?: FinanceAuditEntry[] }>(`/api/finance/audit?limit=${Math.max(10, Math.min(300, Math.floor(limitItems || 150)))}`, {
    method: 'GET',
  });
  return Array.isArray(result.items) ? result.items : [];
}


export async function syncInternalTickets(callback: (tickets: InternalTicket[]) => void) {
  try {
    const cached = getLocalCache<InternalTicket[]>('internal_tickets', [])
      .filter(ticket => ticket.isDeleted !== true);
    if (cached.length > 0) callback(cached);
    const q = query(collection(db, "internal_tickets"));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map(d => ({ ...d.data(), id: d.id } as InternalTicket))
          .filter(ticket => ticket.isDeleted !== true);
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLocalCache('internal_tickets', list);
        callback(list);
      },
      (error) => {
        handleQuotaOrError(error);
        callback(getLocalCache<InternalTicket[]>('internal_tickets', []).filter(ticket => ticket.isDeleted !== true));
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
    await archiveCriticalRecord('internal_tickets', id);
  } catch (err) {
    console.error("Error archiving internal ticket:", err);
    throw err;
  }
}

export function syncCompanyCommunications(callback: (communications: CompanyCommunication[]) => void) {
  try {
    const cached = getLocalCache<CompanyCommunication[]>('company_communications', [])
      .filter(c => c.isDeleted !== true);
    if (cached.length > 0) callback(cached);
    const q = query(collection(db, "company_communications"));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map(d => ({ ...d.data(), id: d.id } as CompanyCommunication))
          .filter(c => c.isDeleted !== true);
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLocalCache('company_communications', list);
        callback(list);
      },
      (error) => {
        handleQuotaOrError(error);
        callback(getLocalCache<CompanyCommunication[]>('company_communications', []).filter(c => c.isDeleted !== true));
      }
    );
  } catch (err) {
    console.error("Error setting up company communications sync:", err);
    return () => {};
  }
}

export async function saveCompanyCommunication(comm: CompanyCommunication): Promise<void> {
  try {
    const docRef = doc(db, "company_communications", comm.id);
    await setDoc(docRef, comm);
    const cached = getLocalCache<CompanyCommunication[]>('company_communications', []);
    const existingIndex = cached.findIndex(c => c.id === comm.id);
    if (existingIndex >= 0) {
      cached[existingIndex] = comm;
    } else {
      cached.unshift(comm);
    }
    setLocalCache('company_communications', cached);
  } catch (err) {
    console.error("Error saving company communication:", err);
    throw err;
  }
}

export async function markCompanyCommunicationAsRead(
  communicationId: string,
  user: { id?: string; username?: string; name?: string }
): Promise<void> {
  try {
    const userKey = user.username || user.id || "anonymous";
    const userName = user.name || user.username || "Colaborador";
    const docRef = doc(db, "company_communications", communicationId);
    const readPayload = {
      readAt: new Date().toISOString(),
      userName,
      userId: user.id || user.username
    };

    await updateDoc(docRef, {
      [`readBy.${userKey}`]: readPayload
    });

    const cached = getLocalCache<CompanyCommunication[]>('company_communications', []);
    const existing = cached.find(c => c.id === communicationId);
    if (existing) {
      existing.readBy = existing.readBy || {};
      existing.readBy[userKey] = readPayload;
      setLocalCache('company_communications', cached);
    }
  } catch (err) {
    console.error("Error marking company communication as read:", err);
  }
}

export async function deleteCompanyCommunication(id: string): Promise<void> {
  try {
    const docRef = doc(db, "company_communications", id);
    await updateDoc(docRef, {
      isDeleted: true,
      deletedAt: new Date().toISOString()
    });
    const cached = getLocalCache<CompanyCommunication[]>('company_communications', []);
    setLocalCache('company_communications', cached.filter(c => c.id !== id));
  } catch (err) {
    console.error("Error deleting company communication:", err);
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

export async function syncClientIntakes(clientId: string, callback: (intakes: SavedIntake[]) => void) {
  const q = query(collection(db, 'savedIntakes'), where('clientId', '==', clientId));
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const list = snapshot.docs
        .map(d => ({ ...d.data(), id: d.id } as SavedIntake))
        .filter(intake => intake.isDeleted !== true);
      callback(deduplicateIntakesByNumber(list));
    } else {
      callback([]);
    }
  });
}

export interface FieldServiceRecord {
  id: string;
  clientId?: string;
  cliente: string;
  tag: string;
  equipamento: string;
  localizacao: string;
  certificate: string;
  dataCalibracao?: string;
  interventionDate: string;
  technician: string;
  area: string;
  range: string;
  operacao: string;
  unidadeMedida: string;
  categoria: string;
  emissaoPdf: string;
  ordemServico: string;
  tipoServico: string;
  observacao: string;
  unidade: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletedByUid?: string;
  updatedAt?: string;
  normalizedTag?: string;
  normalizedCertificate?: string;
}

const FIELD_SERVICE_PAGE_SIZE = 1000; // paginação em lotes de 1000 para sincronizar a base completa sem truncamento
const FIELD_SERVICE_CHANGE_FEED_SIZE = 1000;
const FIELD_SERVICE_AUTO_REFRESH_MAX_AGE_MS = 15_000;
const FIELD_SERVICE_PERSIST_DB_NAME = 'comanins_field_service_cache_v1';
const FIELD_SERVICE_PERSIST_STORE = 'snapshots';
const FIELD_SERVICE_PERSIST_KEY = 'active_records';
const FIELD_SERVICE_CACHE_SCHEMA_VERSION = 2;

let fieldServiceCache: FieldServiceRecord[] = [];
let fieldServiceLoadPromise: Promise<void> | null = null;
let fieldServiceInitialLoadComplete = false;
let fieldServiceLastFullRefreshAt = 0;
let fieldServiceLastServerSyncAt = '';
let fieldServiceLiveUnsubscribe: (() => void) | null = null;
let fieldServicePersistTimer: ReturnType<typeof setTimeout> | null = null;
const fieldServiceSubscribers = new Set<(records: FieldServiceRecord[]) => void>();

type PersistedFieldServiceCache = {
  schemaVersion: number;
  records: FieldServiceRecord[];
  syncedAt: string;
  savedAt: string;
};

type FieldServiceSnapshotPayload = {
  records: FieldServiceRecord[];
  generatedAt: string;
};

type FieldServiceDeltaPayload = {
  records: FieldServiceRecord[];
  syncedAt: string;
  truncated: boolean;
  reset: boolean;
};

const openFieldServiceCacheDb = (): Promise<IDBDatabase | null> => new Promise((resolve) => {
  if (typeof indexedDB === 'undefined') {
    resolve(null);
    return;
  }
  try {
    const request = indexedDB.open(FIELD_SERVICE_PERSIST_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const dbHandle = request.result;
      if (!dbHandle.objectStoreNames.contains(FIELD_SERVICE_PERSIST_STORE)) {
        dbHandle.createObjectStore(FIELD_SERVICE_PERSIST_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  } catch {
    resolve(null);
  }
});

const readPersistedFieldServiceCache = async (): Promise<PersistedFieldServiceCache | null> => {
  const dbHandle = await openFieldServiceCacheDb();
  if (!dbHandle) return null;
  try {
    const value = await new Promise<any>((resolve) => {
      const tx = dbHandle.transaction(FIELD_SERVICE_PERSIST_STORE, 'readonly');
      const request = tx.objectStore(FIELD_SERVICE_PERSIST_STORE).get(FIELD_SERVICE_PERSIST_KEY);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => resolve(null);
    });
    if (!value || value.schemaVersion !== FIELD_SERVICE_CACHE_SCHEMA_VERSION || !Array.isArray(value.records)) return null;
    if (value.records.length > 0 && value.records.length < 5000) return null; // descarta cache parcial/truncado para forçar carga completa
    return {
      schemaVersion: FIELD_SERVICE_CACHE_SCHEMA_VERSION,
      records: value.records
        .filter((record: any) => record && record.id && record.isDeleted !== true)
        .map((record: any) => ({ ...record, id: String(record.id) } as FieldServiceRecord)),
      syncedAt: String(value.syncedAt || ''),
      savedAt: String(value.savedAt || ''),
    };
  } finally {
    dbHandle.close();
  }
};

const writePersistedFieldServiceCache = async (): Promise<void> => {
  const dbHandle = await openFieldServiceCacheDb();
  if (!dbHandle) return;
  const payload: PersistedFieldServiceCache = {
    schemaVersion: FIELD_SERVICE_CACHE_SCHEMA_VERSION,
    records: fieldServiceCache.filter((record) => record.isDeleted !== true),
    syncedAt: fieldServiceLastServerSyncAt,
    savedAt: new Date().toISOString(),
  };
  try {
    await new Promise<void>((resolve) => {
      const tx = dbHandle.transaction(FIELD_SERVICE_PERSIST_STORE, 'readwrite');
      tx.objectStore(FIELD_SERVICE_PERSIST_STORE).put(payload, FIELD_SERVICE_PERSIST_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } finally {
    dbHandle.close();
  }
};

const clearPersistedFieldServiceCache = async (): Promise<void> => {
  const dbHandle = await openFieldServiceCacheDb();
  if (!dbHandle) return;
  try {
    await new Promise<void>((resolve) => {
      const tx = dbHandle.transaction(FIELD_SERVICE_PERSIST_STORE, 'readwrite');
      tx.objectStore(FIELD_SERVICE_PERSIST_STORE).delete(FIELD_SERVICE_PERSIST_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } finally {
    dbHandle.close();
  }
};

const schedulePersistFieldServiceCache = () => {
  if (fieldServicePersistTimer) clearTimeout(fieldServicePersistTimer);
  fieldServicePersistTimer = setTimeout(() => {
    fieldServicePersistTimer = null;
    void writePersistedFieldServiceCache();
  }, 1500);
};

const normalizeFieldServiceApiRecords = (records: any[]): FieldServiceRecord[] => records
  .filter((record: any) => record && record.id && record.isDeleted !== true)
  .map((record: any) => ({ ...record, id: String(record.id) } as FieldServiceRecord));

const fetchFieldServiceSnapshot = async (forceFresh = false): Promise<FieldServiceSnapshotPayload | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  const token = await user.getIdToken();
  const response = await fetch(`/api/field-service/snapshot${forceFresh ? '?fresh=1' : ''}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`FIELD_SERVICE_SNAPSHOT_HTTP_${response.status}`);
  }
  const payload = await response.json().catch(() => null);
  if (!payload?.success || !Array.isArray(payload.records)) {
    throw new Error('FIELD_SERVICE_SNAPSHOT_INVALID');
  }
  // Se o snapshot do servidor contiver menos de 5.000 registros (quando sabemos que existem > 17.000),
  // rejeita o snapshot truncado para acionar a carga paginada completa do Firestore.
  if (payload.records.length > 0 && payload.records.length < 5000 && !forceFresh) {
    throw new Error('FIELD_SERVICE_SNAPSHOT_SUSPICIOUSLY_TRUNCATED');
  }
  return {
    records: normalizeFieldServiceApiRecords(payload.records),
    generatedAt: String(payload.generatedAt || new Date().toISOString()),
  };
};

const fetchFieldServiceChanges = async (since: string): Promise<FieldServiceDeltaPayload | null> => {
  const user = auth.currentUser;
  if (!user || !since) return null;
  const token = await user.getIdToken();
  const params = new URLSearchParams({ since });
  const response = await fetch(`/api/field-service/changes?${params.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`FIELD_SERVICE_CHANGES_HTTP_${response.status}`);
  }
  const payload = await response.json().catch(() => null);
  if (!payload?.success || !Array.isArray(payload.records)) {
    throw new Error('FIELD_SERVICE_CHANGES_INVALID');
  }
  return {
    records: payload.records.map((record: any) => ({ ...record, id: String(record.id || '') } as FieldServiceRecord)),
    syncedAt: String(payload.syncedAt || new Date().toISOString()),
    truncated: payload.truncated === true,
    reset: payload.reset === true,
  };
};

const notifyFieldServiceSubscribers = () => {
  const snapshot = [...fieldServiceCache];
  fieldServiceSubscribers.forEach((subscriber) => subscriber(snapshot));
};

const mergeFieldServiceRecords = (changes: FieldServiceRecord[]) => {
  if (changes.length === 0) return false;
  const byId = new Map(fieldServiceCache.map((record) => [record.id, record]));
  let changed = false;
  for (const incoming of changes) {
    if (!incoming?.id) continue;
    if (incoming.isDeleted === true) {
      if (byId.delete(incoming.id)) changed = true;
      continue;
    }
    const previous = byId.get(incoming.id);
    if (!previous || previous.updatedAt !== incoming.updatedAt || JSON.stringify(previous) !== JSON.stringify(incoming)) {
      byId.set(incoming.id, incoming);
      changed = true;
    }
  }
  if (changed) fieldServiceCache = Array.from(byId.values());
  return changed;
};

const mergeFieldServiceChangeSnapshot = (snapshot: any) => {
  if (!snapshot || snapshot.empty) return;
  // Não permite que o feed em tempo real (limitado a 1000 itens)
  // popule precocemente o cache vazio antes da carga completa
  if (!fieldServiceInitialLoadComplete && fieldServiceCache.length === 0) return;
  const changes: FieldServiceRecord[] = [];
  snapshot.docChanges().forEach((change: any) => {
    // 'removed' pode significar apenas saída da janela dos 1000 registros mais
    // recentes; exclusão real é identificada por isDeleted=true.
    if (change.type === 'removed') return;
    changes.push({ id: change.doc.id, ...change.doc.data() } as FieldServiceRecord);
  });
  if (mergeFieldServiceRecords(changes)) {
    notifyFieldServiceSubscribers();
    schedulePersistFieldServiceCache();
  }
};

const startFieldServiceLiveFeed = () => {
  if (fieldServiceLiveUnsubscribe || fieldServiceSubscribers.size === 0) return;
  const changesQuery = query(
    collection(db, 'fieldServiceRecords'),
    orderBy('updatedAt', 'desc'),
    limit(FIELD_SERVICE_CHANGE_FEED_SIZE),
  );

  fieldServiceLiveUnsubscribe = onSnapshot(
    changesQuery,
    mergeFieldServiceChangeSnapshot,
    (err) => {
      // Registros legados sem updatedAt continuam cobertos pelo snapshot/delta.
      console.warn('Field Service live change feed unavailable:', err);
    },
  );
};

const hydrateFieldServiceCacheFromIndexedDb = async (): Promise<boolean> => {
  if (fieldServiceCache.length > 0) return true;
  const persisted = await readPersistedFieldServiceCache();
  if (!persisted || !persisted.syncedAt) return false;
  fieldServiceCache = persisted.records;
  fieldServiceLastServerSyncAt = persisted.syncedAt;
  notifyFieldServiceSubscribers();
  return true;
};

type FieldServiceDeltaSyncResult = 'synced' | 'truncated' | 'unavailable';

const synchronizeFieldServiceDelta = async (): Promise<FieldServiceDeltaSyncResult> => {
  if (!fieldServiceLastServerSyncAt) return 'unavailable';
  const delta = await fetchFieldServiceChanges(fieldServiceLastServerSyncAt);
  if (!delta) return 'unavailable';
  if (delta.reset) {
    fieldServiceCache = [];
    fieldServiceLastServerSyncAt = delta.syncedAt;
    fieldServiceLastFullRefreshAt = Date.now();
    fieldServiceInitialLoadComplete = true;
    notifyFieldServiceSubscribers();
    await clearPersistedFieldServiceCache();
    schedulePersistFieldServiceCache();
    return 'synced';
  }
  if (delta.truncated) return 'truncated';
  const changed = mergeFieldServiceRecords(delta.records);
  fieldServiceLastServerSyncAt = delta.syncedAt;
  fieldServiceLastFullRefreshAt = Date.now();
  fieldServiceInitialLoadComplete = true;
  if (changed) notifyFieldServiceSubscribers();
  schedulePersistFieldServiceCache();
  return 'synced';
};

const loadFieldServiceRecordsInPages = async (force = false, silent = false): Promise<void> => {
  if (fieldServiceInitialLoadComplete && !force) return;
  if (fieldServiceLoadPromise) return fieldServiceLoadPromise;

  const task = (async () => {
    let requireFreshSnapshot = force;
    if (!force) {
      await hydrateFieldServiceCacheFromIndexedDb();
      if (fieldServiceLastServerSyncAt) {
        try {
          const deltaResult = await synchronizeFieldServiceDelta();
          if (deltaResult === 'synced') return;
          if (deltaResult === 'truncated') requireFreshSnapshot = true;
        } catch (deltaError) {
          console.warn('Field Service delta sync unavailable; falling back to full snapshot:', deltaError);
        }
      }
    }

    // Snapshot completo é usado apenas no primeiro acesso do navegador ou quando
    // o delta ficou grande demais. Nas aberturas seguintes, IndexedDB + delta
    // disponibilizam a base imediatamente sem reler 17 mil registros.
    try {
      const serverSnapshot = await fetchFieldServiceSnapshot(requireFreshSnapshot);
      if (serverSnapshot) {
        fieldServiceCache = serverSnapshot.records;
        fieldServiceLastServerSyncAt = serverSnapshot.generatedAt;
        fieldServiceInitialLoadComplete = true;
        fieldServiceLastFullRefreshAt = Date.now();
        notifyFieldServiceSubscribers();
        schedulePersistFieldServiceCache();

        // Fecha a pequena janela entre o instante de geração do snapshot e a
        // entrega ao navegador sem forçar outra leitura completa.
        try {
          const delta = await fetchFieldServiceChanges(fieldServiceLastServerSyncAt);
          if (delta?.reset) {
            fieldServiceCache = [];
            fieldServiceLastServerSyncAt = delta.syncedAt;
            notifyFieldServiceSubscribers();
            await clearPersistedFieldServiceCache();
            schedulePersistFieldServiceCache();
          } else if (delta?.truncated && !requireFreshSnapshot) {
            const freshSnapshot = await fetchFieldServiceSnapshot(true);
            if (freshSnapshot) {
              fieldServiceCache = freshSnapshot.records;
              fieldServiceLastServerSyncAt = freshSnapshot.generatedAt;
              notifyFieldServiceSubscribers();
              schedulePersistFieldServiceCache();
            }
          } else if (delta && !delta.truncated) {
            const changed = mergeFieldServiceRecords(delta.records);
            fieldServiceLastServerSyncAt = delta.syncedAt;
            if (changed) notifyFieldServiceSubscribers();
            schedulePersistFieldServiceCache();
          }
        } catch (deltaError) {
          console.warn('Post-snapshot Field Service delta sync failed:', deltaError);
        }
        return;
      }
    } catch (snapshotError) {
      console.warn('Field Service snapshot API unavailable; using Firestore fallback:', snapshotError);
    }

    // Fallback de segurança: continua funcional mesmo se a API estiver indisponível.
    const loaded: FieldServiceRecord[] = [];
    let cursor: QueryDocumentSnapshot<DocumentData> | null = null;
    let isFirstPage = true;
    const fallbackStartedAt = new Date().toISOString();

    while (true) {
      const pageQuery = cursor
        ? query(
            collection(db, 'fieldServiceRecords'),
            orderBy(documentId()),
            startAfter(cursor),
            limit(FIELD_SERVICE_PAGE_SIZE),
          )
        : query(
            collection(db, 'fieldServiceRecords'),
            orderBy(documentId()),
            limit(FIELD_SERVICE_PAGE_SIZE),
          );
      const page = await getDocs(pageQuery);
      page.docs.forEach((recordDoc) => {
        const record = { id: recordDoc.id, ...recordDoc.data() } as FieldServiceRecord;
        if (record.isDeleted !== true) loaded.push(record);
      });

      if (!silent && loaded.length > 0) {
        fieldServiceCache = [...loaded];
        notifyFieldServiceSubscribers();
      }
      isFirstPage = false;

      if (page.size < FIELD_SERVICE_PAGE_SIZE) break;
      cursor = page.docs[page.docs.length - 1] || null;
      if (!cursor) break;
    }

    fieldServiceCache = [...loaded];
    fieldServiceLastServerSyncAt = fallbackStartedAt;
    fieldServiceInitialLoadComplete = true;
    fieldServiceLastFullRefreshAt = Date.now();
    notifyFieldServiceSubscribers();
    schedulePersistFieldServiceCache();
  })().finally(() => {
    if (fieldServiceLoadPromise === task) fieldServiceLoadPromise = null;
  });

  fieldServiceLoadPromise = task;
  return task;
};

export async function syncFieldServiceRecords(callback: (records: FieldServiceRecord[]) => void) {
  fieldServiceSubscribers.add(callback);
  if (fieldServiceCache.length > 0) callback([...fieldServiceCache]);

  loadFieldServiceRecordsInPages()
    .then(() => startFieldServiceLiveFeed())
    .catch((err) => {
      console.error('Error loading field service records:', err);
    });

  return () => {
    // Mantém o feed incremental enquanto o Portal Interno permanecer aberto.
    fieldServiceSubscribers.delete(callback);
  };
}

export interface RefreshFieldServiceOptions {
  force?: boolean;
  silent?: boolean;
  maxAgeMs?: number;
}

export async function refreshFieldServiceRecords(options: RefreshFieldServiceOptions = {}): Promise<boolean> {
  const maxAgeMs = options.maxAgeMs ?? FIELD_SERVICE_AUTO_REFRESH_MAX_AGE_MS;
  const age = Date.now() - fieldServiceLastFullRefreshAt;
  if (!options.force && fieldServiceInitialLoadComplete && fieldServiceLastFullRefreshAt > 0 && age < maxAgeMs) {
    startFieldServiceLiveFeed();
    return false;
  }

  // Atualização normal = delta pequeno, nunca uma releitura completa dos 17 mil.
  if (!options.force && fieldServiceLastServerSyncAt) {
    try {
      const deltaResult = await synchronizeFieldServiceDelta();
      if (deltaResult === 'synced') {
        startFieldServiceLiveFeed();
        return true;
      }
      if (deltaResult === 'truncated') options.force = true;
    } catch (deltaError) {
      console.warn('Field Service delta refresh failed:', deltaError);
    }
  }

  fieldServiceInitialLoadComplete = false;
  await loadFieldServiceRecordsInPages(Boolean(options.force), options.silent !== false);
  startFieldServiceLiveFeed();
  return true;
}

export interface FieldServiceBulkRejectedOperation {
  type: 'add' | 'update';
  id?: string;
  index: number;
  reason: 'DUPLICATE_TAG' | 'DUPLICATE_CERTIFICATE' | 'RECORD_NOT_FOUND' | 'DUPLICATE_TARGET' | 'WRITE_FAILED';
  field?: 'tag' | 'certificate';
  value?: string;
  conflictRecordIds?: string[];
}

export interface FieldServiceBulkUpsertResult {
  addedCount: number;
  updatedCount: number;
  rejected: FieldServiceBulkRejectedOperation[];
}

export interface FieldServiceBulkUpsertProgress {
  stage: 'preparing' | 'validating' | 'writing' | 'snapshot' | 'done';
  processed: number;
  total: number;
  applied: number;
  rejected: number;
  percent: number;
  message?: string;
}

const fieldServiceApiRequest = async (path: string, body: unknown): Promise<any> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const token = await user.getIdToken();
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 409 && payload?.error === 'FIELD_SERVICE_DUPLICATE') {
      const label = payload?.field === 'tag' ? 'TAG do Cliente' : 'Certificado';
      const value = String(payload?.value || '').trim();
      const error: any = new Error(`${label}${value ? ` "${value}"` : ''} já está vinculado a outro registro.`);
      error.code = payload?.reason || 'FIELD_SERVICE_DUPLICATE';
      error.details = payload;
      throw error;
    }
    if (response.status === 404 && payload?.error === 'FIELD_SERVICE_RECORD_NOT_FOUND') {
      throw new Error('O registro de Serviço de Campo não existe mais ou foi arquivado.');
    }
    throw new Error(payload?.message || payload?.error || 'Não foi possível salvar o registro de Serviço de Campo.');
  }
  return payload;
};

export async function addFieldServiceRecord(data: Omit<FieldServiceRecord, 'id'>): Promise<FieldServiceRecord> {
  const payload = await fieldServiceApiRequest('/api/field-service/upsert', { data });
  const created = payload?.record as FieldServiceRecord;
  if (!created?.id) throw new Error('O servidor não retornou o registro criado.');
  fieldServiceCache = [created, ...fieldServiceCache.filter((record) => record.id !== created.id)];
  notifyFieldServiceSubscribers();
  schedulePersistFieldServiceCache();
  return created;
}

export async function updateFieldServiceRecord(id: string, data: Partial<FieldServiceRecord>): Promise<void> {
  const payload = await fieldServiceApiRequest('/api/field-service/upsert', { id, data });
  const updated = payload?.record as FieldServiceRecord;
  if (!updated?.id) throw new Error('O servidor não retornou o registro atualizado.');
  fieldServiceCache = fieldServiceCache.map((record) =>
    record.id === id ? { ...record, ...updated } : record,
  );
  notifyFieldServiceSubscribers();
  schedulePersistFieldServiceCache();
}

export async function deleteFieldServiceRecord(id: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const token = await user.getIdToken();
  const response = await fetch(`/api/field-service/${encodeURIComponent(id)}/archive`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || payload?.error || 'Não foi possível arquivar o registro.');
  fieldServiceCache = fieldServiceCache.filter((record) => record.id !== id);
  notifyFieldServiceSubscribers();
  schedulePersistFieldServiceCache();
}

export async function bulkAddFieldServiceRecords(records: Omit<FieldServiceRecord, 'id'>[]): Promise<FieldServiceBulkUpsertResult> {
  return bulkUpsertFieldServiceRecords([], records);
}

export interface FieldServiceClearProgress {
  stage: 'validating' | 'counting' | 'archiving' | 'finalizing' | 'done';
  processed: number;
  total: number;
  clearedCount: number;
  percent: number;
  message?: string;
}

export async function clearAllFieldServiceRecords(
  password: string,
  onProgress?: (progress: FieldServiceClearProgress) => void,
): Promise<number> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  if (!password) throw new Error('Digite a senha do administrador logado.');

  const token = await user.getIdToken();
  const response = await fetch('/api/field-service/clear-all', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/x-ndjson',
    },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401 && payload?.error === 'INVALID_CURRENT_ADMIN_PASSWORD') {
      throw new Error('Senha incorreta para o administrador atualmente logado.');
    }
    if (response.status === 403) {
      throw new Error('Somente o administrador logado pode limpar os dados de Serviço de Campo.');
    }
    throw new Error(payload?.message || payload?.error || 'Não foi possível limpar os dados de Serviço de Campo.');
  }

  let clearedCount = 0;
  const reader = response.body?.getReader();
  if (reader) {
    const decoder = new TextDecoder();
    let pending = '';
    while (true) {
      const { value, done } = await reader.read();
      if (value) pending += decoder.decode(value, { stream: !done });
      const lines = pending.split('\n');
      pending = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const event = JSON.parse(trimmed);
        if (event.type === 'error') throw new Error(event.message || 'Falha durante a limpeza do Serviço de Campo.');
        if (event.type === 'progress' || event.type === 'done') {
          const progress: FieldServiceClearProgress = {
            stage: event.stage || (event.type === 'done' ? 'done' : 'archiving'),
            processed: Number(event.processed || 0),
            total: Number(event.total || 0),
            clearedCount: Number(event.clearedCount || 0),
            percent: Number(event.percent || 0),
            message: String(event.message || ''),
          };
          clearedCount = progress.clearedCount;
          onProgress?.(progress);
        }
      }
      if (done) break;
    }
    const trimmed = pending.trim();
    if (trimmed) {
      const event = JSON.parse(trimmed);
      if (event.type === 'error') throw new Error(event.message || 'Falha durante a limpeza do Serviço de Campo.');
      if (event.type === 'done') {
        clearedCount = Number(event.clearedCount || 0);
        onProgress?.({
          stage: 'done',
          processed: Number(event.processed || event.total || 0),
          total: Number(event.total || 0),
          clearedCount,
          percent: 100,
          message: String(event.message || ''),
        });
      }
    }
  } else {
    const payload = await response.json().catch(() => ({}));
    clearedCount = Number(payload?.clearedCount || 0);
  }

  fieldServiceCache = [];
  fieldServiceInitialLoadComplete = true;
  fieldServiceLastFullRefreshAt = Date.now();
  fieldServiceLastServerSyncAt = new Date().toISOString();
  notifyFieldServiceSubscribers();
  await clearPersistedFieldServiceCache();
  return clearedCount;
}

export async function bulkUpsertFieldServiceRecords(
  updates: { id: string; data: Partial<FieldServiceRecord> }[],
  adds: Omit<FieldServiceRecord, 'id'>[],
  onProgress?: (progress: FieldServiceBulkUpsertProgress) => void,
): Promise<FieldServiceBulkUpsertResult> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão expirada. Faça login novamente.');
  const token = await user.getIdToken();

  const requestImportStream = (path: string) => fetch(path, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/x-ndjson',
    },
    body: JSON.stringify({ updates, adds }),
  });

  // LOTE 47: quando a base acabou de ser limpa e a importação é uma carga
  // integral (somente inclusões), tenta primeiro o caminho BulkWriter sem uma
  // transação por registro/chunk. Se a base não estiver realmente vazia ou o
  // usuário não for administrador, cai automaticamente no fluxo transacional
  // seguro do LOTE 46.
  const preferInitialFastLoad = updates.length === 0 && adds.length >= 500;
  let response = await requestImportStream(
    preferInitialFastLoad
      ? '/api/field-service/bulk-initial-load-stream'
      : '/api/field-service/bulk-upsert-stream',
  );

  if (!response.ok && preferInitialFastLoad) {
    const fastError = await response.json().catch(() => ({}));
    const canFallback = response.status === 409 || response.status === 403 ||
      fastError?.error === 'FIELD_SERVICE_FAST_IMPORT_NOT_AVAILABLE';
    if (canFallback) {
      response = await requestImportStream('/api/field-service/bulk-upsert-stream');
    } else {
      throw new Error(fastError?.message || fastError?.error || 'Não foi possível iniciar a carga acelerada de Serviço de Campo.');
    }
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message || payload?.error || 'Não foi possível gravar a importação de Serviço de Campo.');
  }

  let finalPayload: any = null;
  const reader = response.body?.getReader();
  if (reader) {
    const decoder = new TextDecoder();
    let pending = '';
    while (true) {
      const { value, done } = await reader.read();
      if (value) pending += decoder.decode(value, { stream: !done });
      const lines = pending.split('\n');
      pending = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const event = JSON.parse(trimmed);
        if (event.type === 'error') throw new Error(event.message || 'Falha durante a gravação da importação.');
        if (event.type === 'progress') {
          const rawStage = String(event.stage || 'writing');
          const stage: FieldServiceBulkUpsertProgress['stage'] =
            rawStage === 'preparing' ? 'preparing' :
            rawStage === 'validating' ? 'validating' :
            rawStage === 'snapshot' ? 'snapshot' : 'writing';
          onProgress?.({
            stage,
            processed: Number(event.processed || 0),
            total: Number(event.total || 0),
            applied: Number(event.applied || 0),
            rejected: Number(event.rejected || 0),
            percent: Number(event.percent || 0),
            message: String(event.message || ''),
          });
        }
        if (event.type === 'done') finalPayload = event;
      }
      if (done) break;
    }
    const trimmed = pending.trim();
    if (trimmed) {
      const event = JSON.parse(trimmed);
      if (event.type === 'error') throw new Error(event.message || 'Falha durante a gravação da importação.');
      if (event.type === 'done') finalPayload = event;
    }
  } else {
    finalPayload = await response.json().catch(() => null);
  }

  if (!finalPayload) throw new Error('A importação foi interrompida antes da confirmação final do servidor.');

  const acceptedUpdates = Array.isArray(finalPayload?.updated) ? finalPayload.updated : [];
  const acceptedAdds = Array.isArray(finalPayload?.added) ? finalPayload.added : [];
  const rejected = (Array.isArray(finalPayload?.rejected) ? finalPayload.rejected : []) as FieldServiceBulkRejectedOperation[];

  const appliedUpdates = new Map<string, Partial<FieldServiceRecord>>();
  for (const item of acceptedUpdates) {
    const index = Number(item?.index);
    if (!Number.isInteger(index) || index < 0 || index >= updates.length) continue;
    const source = updates[index];
    if (!source) continue;
    appliedUpdates.set(source.id, { ...source.data, updatedAt: String(item?.updatedAt || new Date().toISOString()) });
  }

  const createdRecords: FieldServiceRecord[] = [];
  for (const item of acceptedAdds) {
    const index = Number(item?.index);
    if (!Number.isInteger(index) || index < 0 || index >= adds.length) continue;
    const source = adds[index];
    const id = String(item?.id || '');
    if (!source || !id) continue;
    createdRecords.push({
      id,
      ...source,
      updatedAt: String(item?.updatedAt || new Date().toISOString()),
    } as FieldServiceRecord);
  }

  fieldServiceCache = fieldServiceCache.map((record) => {
    const patch = appliedUpdates.get(record.id);
    return patch ? { ...record, ...patch } : record;
  });
  const createdIds = new Set(createdRecords.map((created) => created.id));
  fieldServiceCache = [...createdRecords, ...fieldServiceCache.filter((record) => !createdIds.has(record.id))];
  fieldServiceLastServerSyncAt = new Date().toISOString();
  fieldServiceLastFullRefreshAt = Date.now();
  notifyFieldServiceSubscribers();
  schedulePersistFieldServiceCache();

  onProgress?.({
    stage: 'done',
    processed: updates.length + adds.length,
    total: updates.length + adds.length,
    applied: createdRecords.length + appliedUpdates.size,
    rejected: rejected.length,
    percent: 100,
    message: 'Gravação concluída.',
  });

  return {
    addedCount: createdRecords.length,
    updatedCount: appliedUpdates.size,
    rejected,
  };
}

export async function syncHealthProgramDocs(callback: (docs: HealthProgramDocument[]) => void) {
  const shared = createSharedSync<HealthProgramDocument[]>(
    'health_program_docs', 'health_program_docs', [],
    (onData, onError) => {
      const q = query(collection(db, 'health_program_docs'), limit(100));
      return onSnapshot(q, (snapshot) => {
        onData(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as HealthProgramDocument)).filter((item: any) => item.isDeleted !== true), !snapshot.metadata.fromCache);
      }, onError);
    },
    { persistCache: true, cacheBackend: 'indexedDB', userScopedCache: true },
  );
  return shared(callback);
}

export async function addHealthProgramDoc(data: Omit<HealthProgramDocument, 'id'>, idOverride?: string): Promise<HealthProgramDocument> {
  const newId = idOverride || ('hpdoc_' + Date.now());
  const docData: HealthProgramDocument = { ...data, id: newId };
  await setDoc(doc(db, 'health_program_docs', newId), docData);

  return docData;
}

export async function updateHealthProgramDoc(id: string, updates: Partial<HealthProgramDocument>): Promise<void> {
  await updateDoc(doc(db, 'health_program_docs', id), updates);
}

export async function deleteHealthProgramDoc(id: string): Promise<void> {
  await archiveCriticalRecord('health_program_docs', id);
}

export async function uploadRentalAttachment(rentalId: string, file: File): Promise<string> {
  const path = `rental-attachments/${safeStorageSegment(rentalId)}/${Date.now()}_${safeStorageSegment(file.name)}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || 'application/octet-stream' });
  return await getDownloadURL(storageRef);
}
