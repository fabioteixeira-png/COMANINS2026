import express from "express";
import type { NextFunction, Response } from "express";
import path from "path";
import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { requireAuth } from './src/middleware/auth.ts';
import type { AuthRequest } from './src/middleware/auth.ts';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { adminAuth, adminDb, adminStorage, adminStorageBucketName } from './src/lib/firebase-admin.ts';
import { FieldPath, FieldValue, type DocumentReference } from 'firebase-admin/firestore';
import {
  ACCESS_MODULE_CATALOG,
  ALL_ACCESS_MODULES,
  DEFAULT_ACCESS_PROFILES,
  getDefaultAccessProfile,
  isAdministratorAccess,
  legacyPermissionLevelForProfile,
  resolveLegacyAccessProfileId,
  resolveUserAccessModules,
  resolveUserEditableModules,
  sanitizeAccessModules,
  sanitizeModulePermissions,
  modulesFromPermissions,
  editableModulesFromPermissions,
  userHasAccessModule,
  userCanEditModule,
  type AccessModuleId,
  type AccessProfileDefinition,
} from './src/access-control.ts';

let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8')
  );
} catch (e) {
  console.warn("⚠️ Arquivo firebase-applet-config.json não encontrado ou inválido.");
}

const firestoreDb = adminDb;

const normalizeAccessValue = (value: unknown) => String(value || '').trim().toLowerCase();

const isAdministratorProfile = (profile: any): boolean => {
  return isAdministratorAccess(profile);
};

const isRhProfile = (profile: any): boolean => {
  return userHasAccessModule(profile, 'hr');
};

const isFinanceProfile = (profile: any): boolean => {
  return userHasAccessModule(profile, 'finance');
};

const isRhEditor = (profile: any): boolean => {
  return userCanEditModule(profile, 'hr');
};

const isFinanceEditor = (profile: any): boolean => {
  return userCanEditModule(profile, 'finance');
};

const isInternalDecodedToken = (decoded: any): boolean => {
  const accountType = normalizeAccessValue(decoded?.accountType);
  const email = String(decoded?.email || '').trim().toLowerCase();
  return accountType === 'internal' && email.endsWith('@comanins.internal');
};

const requireInternalAccount = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !isInternalDecodedToken(req.user)) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }
  next();
};

const requireAdministratorAccount = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !isInternalDecodedToken(req.user) || !isAdministratorProfile(req.user)) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }
  next();
};

const requireAccessModule = (moduleId: AccessModuleId) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !isInternalDecodedToken(req.user) || !userHasAccessModule(req.user as any, moduleId)) {
      return res.status(403).json({ error: 'MODULE_ACCESS_DENIED', moduleId });
    }
    next();
  };

const requireEditModule = (moduleId: AccessModuleId) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !isInternalDecodedToken(req.user) || !userCanEditModule(req.user as any, moduleId)) {
      return res.status(403).json({ error: 'MODULE_EDIT_DENIED', moduleId });
    }
    next();
  };

type RateLimitBucket = { count: number; resetAt: number };
const apiRateLimitBuckets = new Map<string, RateLimitBucket>();

const createRateLimiter = (scope: string, windowMs: number, maxRequests: number) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    const now = Date.now();
    if (apiRateLimitBuckets.size > 5000) {
      for (const [key, bucket] of apiRateLimitBuckets) {
        if (bucket.resetAt <= now) apiRateLimitBuckets.delete(key);
      }
    }

    const identity = req.user?.uid || req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${scope}:${identity}`;
    const current = apiRateLimitBuckets.get(key);
    if (!current || current.resetAt <= now) {
      apiRateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({ error: 'RATE_LIMITED', retryAfterSeconds });
    }

    current.count += 1;
    apiRateLimitBuckets.set(key, current);
    next();
  };

const aiApiRateLimit = createRateLimiter('ai-api', 5 * 60 * 1000, 30);
const emailApiRateLimit = createRateLimiter('email-api', 10 * 60 * 1000, 30);
const adminApiRateLimit = createRateLimiter('admin-api', 5 * 60 * 1000, 30);
const writeApiRateLimit = createRateLimiter('write-api', 60 * 1000, 120);
const publicContactRateLimit = createRateLimiter('public-contact', 15 * 60 * 1000, 5);
const passwordResetRateLimit = createRateLimiter('password-reset', 15 * 60 * 1000, 5);

const asLimitedString = (value: unknown, maxLength: number): string =>
  String(value ?? '').trim().slice(0, maxLength);

const normalizeIntakeNumberServer = (value: unknown): string =>
  asLimitedString(value, 80).replace(/\s+/g, '').toUpperCase();

const intakeNumberLockId = (normalizedNumber: string): string =>
  createHash('sha256').update(normalizedNumber, 'utf8').digest('hex');

const activeIntakeFromSnapshot = (snapshot: any): any | null =>
  snapshot.docs.find((doc: any) => doc.data()?.isDeleted !== true) || null;

const intakeReadWeightServer = (intake: any): number => {
  let weight = 0;
  if (intake?.deliveryFinalizedAt) weight += 10000;
  if (intake?.deliveryLocked) weight += 5000;
  weight += Array.isArray(intake?.photos) ? intake.photos.length * 50 : 0;
  weight += Array.isArray(intake?.devolutionRows) ? intake.devolutionRows.length * 20 : 0;
  weight += intake?.photoDevolution ? 100 : 0;
  weight += Array.isArray(intake?.deliveryInstrumentPhotos) ? intake.deliveryInstrumentPhotos.length * 50 : 0;
  weight += Array.isArray(intake?.deliveryFormPhotos) ? intake.deliveryFormPhotos.length * 50 : 0;
  weight += Array.isArray(intake?.rows) ? intake.rows.length * 10 : 0;
  return weight;
};

const deduplicateIntakesForReadServer = (intakes: any[]): any[] => {
  const byNumber = new Map<string, any>();
  for (const intake of intakes) {
    const normalized = normalizeIntakeNumberServer(intake?.numEntrada);
    const key = normalized || `__id__:${String(intake?.id || '')}`;
    const existing = byNumber.get(key);
    if (!existing) {
      byNumber.set(key, intake);
      continue;
    }
    const currentWeight = intakeReadWeightServer(existing);
    const candidateWeight = intakeReadWeightServer(intake);
    if (
      candidateWeight > currentWeight ||
      (candidateWeight === currentWeight && String(intake?.id || '') > String(existing?.id || ''))
    ) {
      byNumber.set(key, intake);
    }
  }
  return Array.from(byNumber.values()).sort((a, b) => String(b?.id || '').localeCompare(String(a?.id || '')));
};

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const isValidEmailAddress = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;

const sanitizeClientForInternalDirectory = (value: any) => {
  const { password, portalAccessCredentialEnc, portalAccessVersion, ...safe } = value || {};
  return safe;
};

const decodeOperationalDataUrl = (value: unknown): { buffer: Buffer; contentType: string; extension: string } => {
  const raw = String(value || '');
  const match = raw.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=\r\n]+)$/i);
  if (!match) throw new Error('INVALID_IMAGE_DATA');
  const format = match[1].toLowerCase();
  const contentType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
  const extension = format === 'jpeg' ? 'jpg' : format;
  const buffer = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) throw new Error('IMAGE_TOO_LARGE');
  return { buffer, contentType, extension };
};

const safeStorageSegmentServer = (value: unknown): string =>
  String(value || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);

const safeStorageFileNameServer = (value: unknown): string => {
  const decoded = (() => {
    try { return decodeURIComponent(String(value || 'arquivo')); } catch { return String(value || 'arquivo'); }
  })();
  const normalized = decoded
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 180);
  return normalized || 'arquivo';
};

const CORPORATE_FILE_MAX_BYTES = 20 * 1024 * 1024;
const CORPORATE_FILE_PURPOSES = new Set([
  'employee-document',
  'employee-aso',
  'employee-training',
  'payslip',
  'health-program',
  'finance-document',
]);
const CORPORATE_FILE_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const decodeUploadHeader = (value: unknown): string => {
  const raw = String(value || '');
  try { return decodeURIComponent(raw); } catch { return raw; }
};

const resolveCorporateContentType = (reportedType: string, fileName: string): string => {
  const reported = reportedType.split(';')[0].trim().toLowerCase();
  if (CORPORATE_FILE_CONTENT_TYPES.has(reported)) return reported;
  const extension = path.extname(fileName).toLowerCase();
  const byExtension: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
    '.heic': 'image/heic', '.heif': 'image/heif',
    '.txt': 'text/plain',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return byExtension[extension] || reported;
};

const isOwnEmployeeId = (decoded: any, employeeId: unknown): boolean => {
  const normalized = String(employeeId || '').trim().toLowerCase();
  if (!normalized) return false;
  return [decoded?.portalUserId, decoded?.username]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
};

const canUploadCorporatePurpose = (decoded: any, purpose: string): boolean => {
  if (isAdministratorProfile(decoded)) return true;
  if (purpose === 'payslip') return isRhEditor(decoded) || isFinanceEditor(decoded);
  if (purpose === 'finance-document') return isFinanceEditor(decoded);
  if (purpose === 'health-program') return userCanEditModule(decoded, 'health_programs');
  if (purpose === 'employee-aso' || purpose === 'employee-document' || purpose === 'employee-training') {
    return isRhEditor(decoded);
  }
  return false;
};

const canDownloadCorporatePurpose = (decoded: any, metadata: Record<string, any>): boolean => {
  if (isAdministratorProfile(decoded)) return true;
  const purpose = String(metadata?.purpose || '');
  const employeeId = String(metadata?.employeeId || '');
  if (purpose === 'finance-document') return isFinanceProfile(decoded);
  if (purpose === 'health-program') return userHasAccessModule(decoded, 'health_programs');
  if (purpose === 'employee-aso') return isRhProfile(decoded);
  if (purpose === 'payslip') return isRhProfile(decoded) || isFinanceProfile(decoded) || isOwnEmployeeId(decoded, employeeId);
  if (purpose === 'employee-document' || purpose === 'employee-training') {
    return isRhProfile(decoded) || isOwnEmployeeId(decoded, employeeId);
  }
  return false;
};

const corporateFileFolder = (purpose: string, entityId: string): string => {
  if (purpose === 'finance-document') return `secure-documents/finance/${entityId}`;
  if (purpose === 'health-program') return `secure-documents/hr/health-programs/${entityId}`;
  return `secure-documents/hr/employees/${entityId}/${purpose}`;
};

const findPortalUserForAuth = async (decoded: any): Promise<any> => {
  if (!firestoreDb) {
    throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  }
  const usersRef = firestoreDb.collection('portalUsers');

  const byUid = await usersRef.where('authUid', '==', decoded.uid).limit(1).get();
  if (!byUid.empty) {
    const doc = byUid.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  const email = String(decoded.email || '').trim().toLowerCase();

  // Legacy username linking is allowed only for Firebase accounts that were
  // already marked as internal by the trusted Admin SDK. A public Firebase
  // sign-up cannot set custom claims, so it cannot claim an unlinked employee.
  if (normalizeAccessValue(decoded?.accountType) !== 'internal') return null;

  const username = email.endsWith('@comanins.internal')
    ? email.slice(0, -'@comanins.internal'.length)
    : '';

  if (!username) return null;

  const snapshot = await usersRef.get();
  const match = snapshot.docs.find((doc) =>
    String(doc.data()?.username || '').trim().toLowerCase() === username
  );

  if (!match) return null;

  const data = match.data();
  const existingAuthUid = String(data?.authUid || '').trim();
  if (existingAuthUid && existingAuthUid !== decoded.uid) {
    throw new Error('AUTH_UID_CONFLICT');
  }

  return { id: match.id, ...data };
};

const cloneDefaultAccessProfile = (profile: AccessProfileDefinition): AccessProfileDefinition => ({
  ...profile,
  modules: [...profile.modules],
  modulePermissions: { ...profile.modulePermissions },
});

const normalizeStoredAccessProfile = (
  id: string,
  data: any,
  fallback?: AccessProfileDefinition,
): AccessProfileDefinition => {
  const isAdministrator = id === 'administrator';
  const modulePermissions = isAdministrator
    ? sanitizeModulePermissions(Object.fromEntries(ALL_ACCESS_MODULES.map((moduleId) => [moduleId, 'edit'])))
    : sanitizeModulePermissions(
        data?.modulePermissions,
        data?.modules ?? fallback?.modules,
      );
  return {
    ...(fallback ? cloneDefaultAccessProfile(fallback) : {}),
    id,
    name: asLimitedString(data?.name || fallback?.name || 'Perfil de acesso', 100),
    description: asLimitedString(data?.description || fallback?.description || '', 400),
    modules: modulesFromPermissions(modulePermissions),
    modulePermissions,
    isSystem: fallback?.isSystem === true,
    isAdministrator,
    active: data?.active !== false,
    version: Math.max(1, Number(data?.version || fallback?.version || 1) || 1),
    createdAt: data?.createdAt ? String(data.createdAt) : undefined,
    createdBy: data?.createdBy ? String(data.createdBy) : undefined,
    updatedAt: data?.updatedAt ? String(data.updatedAt) : undefined,
    updatedBy: data?.updatedBy ? String(data.updatedBy) : undefined,
  };
};

const getAccessProfileById = async (profileId: string): Promise<AccessProfileDefinition | null> => {
  if (!firestoreDb) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  const safeProfileId = String(profileId || '').trim();
  if (!safeProfileId) return null;

  const fallback = getDefaultAccessProfile(safeProfileId);
  const snapshot = await firestoreDb.collection('accessProfiles').doc(safeProfileId).get();
  if (!snapshot.exists && !fallback) return null;

  return normalizeStoredAccessProfile(
    safeProfileId,
    snapshot.exists ? snapshot.data() : fallback,
    fallback,
  );
};

const listAccessProfiles = async (): Promise<AccessProfileDefinition[]> => {
  if (!firestoreDb) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  const snapshot = await firestoreDb.collection('accessProfiles').get();
  const storedById = new Map(snapshot.docs.map((doc) => [doc.id, doc.data()]));
  const profiles = DEFAULT_ACCESS_PROFILES.map((fallback) =>
    normalizeStoredAccessProfile(fallback.id, storedById.get(fallback.id) || fallback, fallback),
  );

  snapshot.docs.forEach((doc) => {
    if (!getDefaultAccessProfile(doc.id)) {
      profiles.push(normalizeStoredAccessProfile(doc.id, doc.data()));
    }
  });

  return profiles
    .filter((profile) => profile.active !== false)
    .sort((a, b) => {
      if (a.id === 'administrator') return -1;
      if (b.id === 'administrator') return 1;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
};

const resolveAccessProfileForUser = async (
  user: any,
  requestedProfileId?: string,
): Promise<AccessProfileDefinition> => {
  const profileId = String(
    requestedProfileId || user?.accessProfileId || resolveLegacyAccessProfileId(user),
  ).trim();
  const resolved = await getAccessProfileById(profileId);
  if (resolved?.active !== false) return resolved;

  const fallbackId = isAdministratorAccess(user) ? 'administrator' : 'limited';
  return (await getAccessProfileById(fallbackId)) || cloneDefaultAccessProfile(
    getDefaultAccessProfile(fallbackId)!,
  );
};

const hydrateUserAccess = async (profile: any, requestedProfileId?: string) => {
  const accessProfile = await resolveAccessProfileForUser(profile, requestedProfileId);
  return {
    ...profile,
    accessProfileId: accessProfile.id,
    accessProfileName: accessProfile.name,
    accessProfileVersion: accessProfile.version || 1,
    allowedModules: accessProfile.isAdministrator
      ? [...ALL_ACCESS_MODULES]
      : [...accessProfile.modules],
    editableModules: accessProfile.isAdministrator
      ? [...ALL_ACCESS_MODULES]
      : editableModulesFromPermissions(accessProfile.modulePermissions),
  };
};

const refreshInternalUserClaims = async (profile: any) => {
  if (!adminAuth) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  const hydratedProfile = await hydrateUserAccess(profile);
  const authUid = String(hydratedProfile?.authUid || '').trim();
  if (!authUid) return hydratedProfile;

  const authUser = await adminAuth.getUser(authUid);
  await adminAuth.setCustomUserClaims(authUid, {
    ...(authUser.customClaims || {}),
    ...buildInternalClaims(hydratedProfile),
  });
  return hydratedProfile;
};

const buildInternalClaims = (profile: any) => {
  const claims: Record<string, string | boolean | number | string[]> = {
    accountType: 'internal',
    portalUserId: String(profile.id),
    passwordChangeRequired:
      profile?.passwordChangeRequired !== false || profile?.mustChangePassword === true,
    accessProfileId: String(profile?.accessProfileId || resolveLegacyAccessProfileId(profile)),
    accessProfileVersion: Math.max(1, Number(profile?.accessProfileVersion || 1) || 1),
    allowedModules: resolveUserAccessModules(profile),
    editableModules: resolveUserEditableModules(profile),
  };

  if (profile?.username) claims.username = String(profile.username).trim().toLowerCase();
  if (profile?.name) claims.name = String(profile.name).trim().slice(0, 160);
  if (profile?.role) claims.role = String(profile.role);
  if (profile?.permissionLevel) claims.permissionLevel = String(profile.permissionLevel);

  return claims;
};

const sanitizePortalUserForClient = (profile: any) => {
  if (!profile) return profile;
  const { password, ...safeProfile } = profile;
  return safeProfile;
};

// Directory view used by ordinary internal accounts. It contains only the
// professional fields needed by operational modules (technician selection,
// signatures, stock assignments, etc.) and deliberately excludes CPF, salary,
// address, banking, health, emergency and attached RH data.
const sanitizePortalUserForDirectory = (profile: any) => {
  if (!profile) return profile;
  return {
    id: String(profile.id || ''),
    name: String(profile.name || ''),
    username: String(profile.username || ''),
    role: String(profile.role || ''),
    permissionLevel: profile.permissionLevel ? String(profile.permissionLevel) : undefined,
    accessProfileId: profile.accessProfileId ? String(profile.accessProfileId) : undefined,
    accessProfileName: profile.accessProfileName ? String(profile.accessProfileName) : undefined,
    accessProfileVersion: Number.isFinite(Number(profile.accessProfileVersion))
      ? Number(profile.accessProfileVersion)
      : undefined,
    allowedModules: sanitizeAccessModules(profile.allowedModules),
    editableModules: sanitizeAccessModules(profile.editableModules),
    register: profile.register ? String(profile.register) : '',
    workEmail: profile.workEmail ? String(profile.workEmail) : '',
    companyUnit: profile.companyUnit ? String(profile.companyUnit) : '',
    department: profile.department ? String(profile.department) : '',
    costCenter: profile.costCenter ? String(profile.costCenter) : '',
    manager: profile.manager ? String(profile.manager) : '',
    workplace: profile.workplace ? String(profile.workplace) : '',
    status: profile.status ? String(profile.status) : undefined,
    professionalReg: profile.professionalReg ? String(profile.professionalReg) : '',
    signaturePath: profile.signaturePath ? String(profile.signaturePath) : '',
    signatureVersion: Number.isFinite(Number(profile.signatureVersion))
      ? Number(profile.signatureVersion)
      : undefined,
    signatureDate: profile.signatureDate ? String(profile.signatureDate) : '',
  };
};

const normalizeCnpj = (value: unknown) => String(value || '').replace(/\D/g, '');

const sanitizeClientForPortal = (profile: any) => {
  if (!profile) return profile;
  const {
    password,
    portalAccessCredentialEnc,
    portalAccessVersion,
    ...safeProfile
  } = profile;
  return safeProfile;
};

const CLIENT_PORTAL_URL = 'https://www.comanins.com.br';
const CLIENT_PORTAL_KEY_B64 = String(process.env.CLIENT_PORTAL_CREDENTIAL_KEY_B64 || '').trim();

const getClientPortalCredentialKey = (): Buffer => {
  if (!CLIENT_PORTAL_KEY_B64) {
    throw new Error('CLIENT_PORTAL_CREDENTIAL_KEY_NOT_CONFIGURED');
  }

  let key: Buffer;
  try {
    key = Buffer.from(CLIENT_PORTAL_KEY_B64, 'base64');
  } catch {
    throw new Error('CLIENT_PORTAL_CREDENTIAL_KEY_INVALID');
  }

  if (key.length !== 32) {
    throw new Error('CLIENT_PORTAL_CREDENTIAL_KEY_INVALID');
  }
  return key;
};

const encryptClientPortalPassword = (password: string): string => {
  const key = getClientPortalCredentialKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
};

const decryptClientPortalPassword = (payload: string): string => {
  const [version, ivB64, tagB64, encryptedB64] = String(payload || '').split('.');
  if (version !== 'v1' || !ivB64 || !tagB64 || !encryptedB64) {
    throw new Error('CLIENT_PORTAL_CREDENTIAL_INVALID');
  }

  const key = getClientPortalCredentialKey();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, 'base64url')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
};

const generateClientPortalPassword = (): string => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;
  const pick = (chars: string) => chars[randomBytes(1)[0] % chars.length];

  const raw = [
    pick(upper),
    pick(lower),
    pick(digits),
    ...Array.from({ length: 9 }, () => pick(all)),
  ];

  // Shuffle with cryptographically secure random bytes, then group for easier typing.
  for (let i = raw.length - 1; i > 0; i -= 1) {
    const j = randomBytes(1)[0] % (i + 1);
    [raw[i], raw[j]] = [raw[j], raw[i]];
  }
  return `${raw.slice(0, 4).join('')}-${raw.slice(4, 8).join('')}-${raw.slice(8, 12).join('')}`;
};

const requireInternalPortalRequester = async (decoded: any) => {
  const accountType = String(decoded?.accountType || '').trim().toLowerCase();
  const email = String(decoded?.email || '').trim().toLowerCase();
  if (accountType !== 'internal' || !email.endsWith('@comanins.internal')) {
    throw new Error('NOT_INTERNAL_ACCOUNT');
  }
  const profile = await findPortalUserForAuth(decoded);
  if (!profile) throw new Error('INTERNAL_PROFILE_NOT_FOUND');
  return hydrateUserAccess(profile);
};

const ensureOfficialClientAuthUser = async (
  clientRef: any,
  client: any,
  authEmail: string,
  password: string,
) => {
  if (!adminAuth || !firestoreDb) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');

  let authUser: any = null;
  const staleUid = String(client?.authUid || '').trim();

  if (staleUid) {
    try {
      authUser = await adminAuth.getUser(staleUid);
    } catch (error: any) {
      if (error?.code !== 'auth/user-not-found') throw error;
      console.warn(`Client ${client.id}: stale authUid ${staleUid}; recovering by official email.`);
    }
  }

  if (!authUser) {
    try {
      const emailUser = await adminAuth.getUserByEmail(authEmail);
      const bound = await firestoreDb
        .collection('clients')
        .where('authUid', '==', emailUser.uid)
        .limit(1)
        .get();

      if (!bound.empty && bound.docs[0].id !== client.id) {
        throw new Error('CLIENT_AUTH_UID_CONFLICT');
      }

      if (bound.empty) {
        // CNPJ-based Firebase emails are predictable. An unbound account is not
        // trusted as the official client identity; replace it with one created
        // by the COMANINS backend using the persisted fixed credential.
        await adminAuth.deleteUser(emailUser.uid);
        authUser = await adminAuth.createUser({ email: authEmail, password });
      } else {
        authUser = emailUser;
      }
    } catch (error: any) {
      if (error?.message === 'CLIENT_AUTH_UID_CONFLICT') throw error;
      if (error?.code !== 'auth/user-not-found') throw error;
      authUser = await adminAuth.createUser({ email: authEmail, password });
    }
  }

  // The encrypted credential is the source of truth. Re-applying it here makes
  // recovery deterministic if an Auth user was recreated, partially migrated,
  // or had a stale UID in the client document.
  authUser = await adminAuth.updateUser(authUser.uid, {
    email: authEmail,
    password,
  });

  await adminAuth.setCustomUserClaims(authUser.uid, {
    ...(authUser.customClaims || {}),
    accountType: 'client',
    clientId: client.id,
    passwordChangeRequired: false,
  });

  await clientRef.update({
    authUid: authUser.uid,
    authEmail,
    passwordChangeRequired: false,
    mustChangePassword: false,
    password: FieldValue.delete(),
  });

  return authUser;
};

const ensureClientPortalAccess = async (clientId: string) => {
  if (!adminAuth || !firestoreDb) {
    throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  }

  const normalizedClientId = String(clientId || '').trim();
  if (!normalizedClientId) throw new Error('CLIENT_PROFILE_NOT_FOUND');

  const clientRef = firestoreDb.collection('clients').doc(normalizedClientId);
  const clientSnap = await clientRef.get();
  if (!clientSnap.exists) throw new Error('CLIENT_PROFILE_NOT_FOUND');

  const client: any = { id: clientSnap.id, ...clientSnap.data() };
  const cleanCnpj = normalizeCnpj(client.cnpj);
  if (!cleanCnpj) throw new Error('CLIENT_CNPJ_REQUIRED');
  const authEmail = `${cleanCnpj}@comanins.client`;

  const credentialRef = firestoreDb.collection('clientPortalCredentials').doc(client.id);
  const credentialSnap = await credentialRef.get();
  const credentialData: any = credentialSnap.exists ? credentialSnap.data() : null;

  let password: string;
  let created = false;

  if (credentialData?.encryptedPassword) {
    password = decryptClientPortalPassword(credentialData.encryptedPassword);
  } else {
    password = generateClientPortalPassword();
    created = true;
  }

  const authUser = await ensureOfficialClientAuthUser(
    clientRef,
    client,
    authEmail,
    password,
  );

  if (created) {
    const encrypted = encryptClientPortalPassword(password);
    await credentialRef.set({
      encryptedPassword: encrypted,
      version: 1,
      clientId: client.id,
      authUid: authUser.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await clientRef.update({
      portalAccessProvisionedAt: new Date().toISOString(),
    });
  } else if (credentialData?.authUid !== authUser.uid) {
    await credentialRef.set({
      authUid: authUser.uid,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  return {
    clientId: client.id,
    cnpj: client.cnpj || cleanCnpj,
    password,
    portalUrl: CLIENT_PORTAL_URL,
    created,
  };
};

const findClientForAuth = async (decoded: any) => {
  if (!firestoreDb) {
    throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  }

  const clientsRef = firestoreDb.collection('clients');
  const byUid = await clientsRef.where('authUid', '==', decoded.uid).limit(1).get();
  if (!byUid.empty) {
    const doc = byUid.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  const email = String(decoded.email || '').trim().toLowerCase();
  if (!email.endsWith('@comanins.client')) return null;

  // A client may use the legacy email/CNPJ lookup only when the token already
  // carries server-issued client claims. This prevents someone from creating a
  // public Firebase account for a known CNPJ and claiming an unprovisioned client.
  if (normalizeAccessValue(decoded?.accountType) !== 'client') return null;
  const claimedClientId = String(decoded?.clientId || '').trim();
  if (!claimedClientId) return null;

  const claimedDoc = await clientsRef.doc(claimedClientId).get();
  if (!claimedDoc.exists) return null;
  const claimedData = claimedDoc.data();
  const cnpjFromEmail = normalizeCnpj(email.slice(0, -'@comanins.client'.length));
  if (!cnpjFromEmail || normalizeCnpj(claimedData?.cnpj) !== cnpjFromEmail) return null;
  const match = claimedDoc;

  const data = match.data();
  const existingAuthUid = String(data?.authUid || '').trim();
  if (existingAuthUid && existingAuthUid !== decoded.uid) {
    throw new Error('CLIENT_AUTH_UID_CONFLICT');
  }

  return { id: match.id, ...data };
};

const buildClientClaims = (profile: any) => ({
  accountType: 'client',
  clientId: String(profile.id),
  passwordChangeRequired: false,
});

const syncClientAuthProfile = async (decoded: any) => {
  if (!adminAuth || !firestoreDb) {
    throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  }

  const email = String(decoded.email || '').trim().toLowerCase();
  if (!email.endsWith('@comanins.client')) {
    throw new Error('NOT_CLIENT_ACCOUNT');
  }

  const profile: any = await findClientForAuth(decoded);
  if (!profile) return null;

  const updates: Record<string, string> = {};
  if (profile.authUid !== decoded.uid) updates.authUid = decoded.uid;
  if (profile.authEmail !== email) updates.authEmail = email;
  if (Object.keys(updates).length > 0) {
    await firestoreDb.collection('clients').doc(profile.id).update(updates);
  }

  const mergedProfile = { ...profile, ...updates };
  const authUser = await adminAuth.getUser(decoded.uid);
  await adminAuth.setCustomUserClaims(decoded.uid, {
    ...(authUser.customClaims || {}),
    ...buildClientClaims(mergedProfile),
  });

  return mergedProfile;
};

const syncInternalAuthProfile = async (decoded: any) => {
  if (!adminAuth || !firestoreDb) {
    throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  }

  const email = String(decoded.email || '').trim().toLowerCase();
  if (!email.endsWith('@comanins.internal')) {
    throw new Error('NOT_INTERNAL_ACCOUNT');
  }

  const profile: any = await findPortalUserForAuth(decoded);
  if (!profile) return null;

  const updates: Record<string, string> = {};
  if (profile.authUid !== decoded.uid) updates.authUid = decoded.uid;
  if (profile.authEmail !== email) updates.authEmail = email;

  if (Object.keys(updates).length > 0) {
    await firestoreDb.collection('portalUsers').doc(profile.id).update(updates);
  }

  const mergedProfile = await hydrateUserAccess({ ...profile, ...updates });
  const authUser = await adminAuth.getUser(decoded.uid);
  await adminAuth.setCustomUserClaims(decoded.uid, {
    ...(authUser.customClaims || {}),
    ...buildInternalClaims(mergedProfile),
  });

  return mergedProfile;
};

const CLIENT_LINK_MIGRATION_ID = 'clientLinksV1';
let clientLinkMigrationReady = false;
let clientLinkMigrationPromise: Promise<void> | null = null;

const isClientLinkMigrationComplete = async (): Promise<boolean> => {
  if (clientLinkMigrationReady) return true;
  if (!firestoreDb) return false;

  try {
    const marker = await firestoreDb
      .collection('securityMigrations')
      .doc(CLIENT_LINK_MIGRATION_ID)
      .get();
    clientLinkMigrationReady = marker.exists && marker.data()?.completed === true;
    return clientLinkMigrationReady;
  } catch (error) {
    console.error('[MIGRATION] Could not read client link migration status:', error);
    return false;
  }
};

const backfillClientLinks = async (): Promise<void> => {
  if (!firestoreDb) return;
  if (clientLinkMigrationPromise) return clientLinkMigrationPromise;

  const migrationPromise = (async () => {
    const markerRef = firestoreDb.collection('securityMigrations').doc(CLIENT_LINK_MIGRATION_ID);
    const marker = await markerRef.get();
    if (marker.exists && marker.data()?.completed === true) {
      clientLinkMigrationReady = true;
      return;
    }

    console.log('[MIGRATION] Starting clientId backfill for calibrationReports and rncReports...');

    const [instrumentSnap, reportSnap, rncSnap] = await Promise.all([
      firestoreDb.collection('instruments').select('clientId').get(),
      firestoreDb.collection('calibrationReports').select('instrumentId', 'clientId').get(),
      firestoreDb.collection('rncReports').select('instrumentId', 'clientId').get(),
    ]);

    const clientIdByInstrument = new Map<string, string>();
    for (const doc of instrumentSnap.docs) {
      const clientId = String(doc.data()?.clientId || '').trim();
      if (clientId) clientIdByInstrument.set(doc.id, clientId);
    }

    let batch = firestoreDb.batch();
    let pendingWrites = 0;
    let calibrationReportsUpdated = 0;
    let rncReportsUpdated = 0;
    let calibrationReportsOrphaned = 0;
    let rncReportsOrphaned = 0;

    const flushBatch = async () => {
      if (pendingWrites === 0) return;
      await batch.commit();
      batch = firestoreDb.batch();
      pendingWrites = 0;
    };

    const queueClientLink = async (
      doc: any,
      kind: 'calibration' | 'rnc',
    ) => {
      const data: any = doc.data();
      const instrumentId = String(data?.instrumentId || '').trim();
      const authoritativeClientId = instrumentId ? clientIdByInstrument.get(instrumentId) : undefined;

      if (!authoritativeClientId) {
        if (kind === 'calibration') calibrationReportsOrphaned += 1;
        else rncReportsOrphaned += 1;
        return;
      }

      if (String(data?.clientId || '').trim() === authoritativeClientId) return;

      batch.update(doc.ref, { clientId: authoritativeClientId });
      pendingWrites += 1;
      if (kind === 'calibration') calibrationReportsUpdated += 1;
      else rncReportsUpdated += 1;

      // Firestore limits batches to 500 writes. Keep headroom for compatibility.
      if (pendingWrites >= 400) await flushBatch();
    };

    for (const doc of reportSnap.docs) await queueClientLink(doc, 'calibration');
    for (const doc of rncSnap.docs) await queueClientLink(doc, 'rnc');
    await flushBatch();

    await markerRef.set({
      completed: true,
      version: 1,
      completedAt: new Date().toISOString(),
      calibrationReportsUpdated,
      rncReportsUpdated,
      calibrationReportsOrphaned,
      rncReportsOrphaned,
    }, { merge: true });

    clientLinkMigrationReady = true;
    console.log(
      `[MIGRATION] clientId backfill complete. calibrationReports=${calibrationReportsUpdated}, ` +
      `rncReports=${rncReportsUpdated}, orphanedCalibration=${calibrationReportsOrphaned}, ` +
      `orphanedRnc=${rncReportsOrphaned}`,
    );
  })()
    .catch((error) => {
      clientLinkMigrationReady = false;
      console.error('[MIGRATION] clientId backfill failed; legacy portal filtering remains active:', error);
    })
    .finally(() => {
      clientLinkMigrationPromise = null;
    });

  clientLinkMigrationPromise = migrationPromise;
  return migrationPromise;
};

const FIELD_SERVICE_LINK_MIGRATION_ID = 'fieldServiceClientLinksV1';
let fieldServiceLinkMigrationReady = false;
let fieldServiceLinkMigrationPromise: Promise<void> | null = null;

const isFieldServiceLinkMigrationComplete = async (): Promise<boolean> => {
  if (fieldServiceLinkMigrationReady) return true;
  if (!firestoreDb) return false;
  try {
    const marker = await firestoreDb.collection('securityMigrations').doc(FIELD_SERVICE_LINK_MIGRATION_ID).get();
    fieldServiceLinkMigrationReady = marker.exists && marker.data()?.completed === true;
    return fieldServiceLinkMigrationReady;
  } catch (error) {
    console.error('[MIGRATION] Could not read field service link migration status:', error);
    return false;
  }
};

const backfillFieldServiceClientLinks = async (): Promise<void> => {
  if (!firestoreDb) return;
  if (fieldServiceLinkMigrationPromise) return fieldServiceLinkMigrationPromise;

  const migrationPromise = (async () => {
    const markerRef = firestoreDb.collection('securityMigrations').doc(FIELD_SERVICE_LINK_MIGRATION_ID);
    const marker = await markerRef.get();
    const markerData: any = marker.exists ? marker.data() : {};
    if (markerData?.completed === true) {
      fieldServiceLinkMigrationReady = true;
      return;
    }

    console.log('[MIGRATION] Starting/resuming clientId backfill for fieldServiceRecords...');
    const instrumentSnap = await firestoreDb
      .collection('instruments')
      .select('clientId', 'certificateNumber', 'coma', 'tag')
      .get();

    const byCertificate = new Map<string, string>();
    const byTag = new Map<string, string | null>();
    const normalize = (value: unknown) => String(value || '').trim().toUpperCase();

    for (const instrumentDoc of instrumentSnap.docs) {
      const data: any = instrumentDoc.data();
      const clientId = String(data?.clientId || '').trim();
      if (!clientId) continue;
      const certificate = normalize(data?.certificateNumber || data?.coma);
      const coma = normalize(data?.coma);
      const tag = normalize(data?.tag);
      if (certificate) byCertificate.set(certificate, clientId);
      if (coma) byCertificate.set(coma, clientId);
      if (tag) {
        const previous = byTag.get(tag);
        if (previous === undefined) byTag.set(tag, clientId);
        else if (previous !== clientId) byTag.set(tag, null);
      }
    }

    let updated = Number(markerData?.updated || 0);
    let orphaned = Number(markerData?.orphaned || 0);
    let totalScanned = Number(markerData?.totalScanned || 0);
    let lastDocumentId = String(markerData?.lastDocumentId || '').trim();
    const pageSize = 500;

    await markerRef.set({
      completed: false,
      status: 'running',
      startedAt: markerData?.startedAt || new Date().toISOString(),
      resumedAt: new Date().toISOString(),
      updated,
      orphaned,
      totalScanned,
      lastDocumentId: lastDocumentId || null,
    }, { merge: true });

    while (true) {
      let pageQuery: any = firestoreDb
        .collection('fieldServiceRecords')
        .orderBy(FieldPath.documentId())
        .limit(pageSize);
      if (lastDocumentId) pageQuery = pageQuery.startAfter(lastDocumentId);

      const page = await pageQuery.select('clientId', 'certificate', 'tag').get();
      if (page.empty) break;

      let batch = firestoreDb.batch();
      let pendingWrites = 0;
      let pageUpdated = 0;
      let pageOrphaned = 0;

      for (const recordDoc of page.docs) {
        const data: any = recordDoc.data();
        const currentClientId = String(data?.clientId || '').trim();
        if (!currentClientId) {
          const certificate = normalize(data?.certificate);
          const tag = normalize(data?.tag);
          const resolvedClientId =
            (certificate && byCertificate.get(certificate)) ||
            (tag ? byTag.get(tag) : undefined);
          if (resolvedClientId) {
            batch.update(recordDoc.ref, { clientId: resolvedClientId });
            pendingWrites += 1;
            pageUpdated += 1;
          } else {
            pageOrphaned += 1;
          }
        }
        lastDocumentId = recordDoc.id;
      }

      if (pendingWrites > 0) await batch.commit();
      updated += pageUpdated;
      orphaned += pageOrphaned;
      totalScanned += page.size;

      await markerRef.set({
        completed: false,
        status: 'running',
        updated,
        orphaned,
        totalScanned,
        lastDocumentId,
        lastProgressAt: new Date().toISOString(),
      }, { merge: true });

      if (page.size < pageSize) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    await markerRef.set({
      completed: true,
      status: 'completed',
      version: 2,
      completedAt: new Date().toISOString(),
      updated,
      orphaned,
      totalScanned,
      lastDocumentId: lastDocumentId || null,
    }, { merge: true });

    fieldServiceLinkMigrationReady = true;
    console.log(`[MIGRATION] fieldService clientId backfill complete. updated=${updated}, orphaned=${orphaned}, scanned=${totalScanned}`);
  })()
    .catch(async (error) => {
      fieldServiceLinkMigrationReady = false;
      console.error('[MIGRATION] fieldService clientId backfill failed; legacy filtering remains active:', error);
      try {
        if (firestoreDb) {
          await firestoreDb.collection('securityMigrations').doc(FIELD_SERVICE_LINK_MIGRATION_ID).set({
            completed: false,
            status: 'failed',
            lastError: error instanceof Error ? error.message : String(error),
            failedAt: new Date().toISOString(),
          }, { merge: true });
        }
      } catch (markerError) {
        console.error('[MIGRATION] Could not persist field service migration failure:', markerError);
      }
    })
    .finally(() => {
      fieldServiceLinkMigrationPromise = null;
    });

  fieldServiceLinkMigrationPromise = migrationPromise;
  return migrationPromise;
};

const scrubLegacyInternalPasswordFields = async (): Promise<void> => {
  if (!firestoreDb) return;
  try {
    const snapshot = await firestoreDb.collection('portalUsers').get();
    const legacyDocs = snapshot.docs.filter((doc) =>
      Object.prototype.hasOwnProperty.call(doc.data() || {}, 'password')
    );

    if (legacyDocs.length === 0) return;

    const batch = firestoreDb.batch();
    for (const doc of legacyDocs) {
      batch.update(doc.ref, { password: FieldValue.delete() });
    }
    await batch.commit();
    console.log(`[SECURITY] Removed legacy password field from ${legacyDocs.length} portalUsers document(s).`);
  } catch (error) {
    // A falha de limpeza não pode derrubar o site público.
    console.error('[SECURITY] Could not remove legacy portalUsers password fields:', error);
  }
};


const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Temporary migration/admin seed routes removed after Firebase Auth rollout.

const PORT = 3000;

app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));


app.get('/api/health', (req, res) => {
  res.json({ status: "ok" });
});

app.post('/api/inventory/items', requireAuth, requireInternalAccount, requireEditModule('inventory'), writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });

  const name = asLimitedString(req.body?.name, 180);
  const description = asLimitedString(req.body?.description, 1000);
  const category = asLimitedString(req.body?.category, 120);
  const quantity = Number(req.body?.quantity ?? 0);
  const minQuantity = Number(req.body?.minQuantity ?? 0);
  const unit = asLimitedString(req.body?.unit, 50);
  const location = asLimitedString(req.body?.location, 180);
  const attachments = Array.isArray(req.body?.attachments)
    ? req.body.attachments.slice(0, 20).map((value: unknown) => asLimitedString(value, 2048)).filter(Boolean)
    : [];

  if (!name || !category || !unit || !Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(minQuantity) || minQuantity < 0) {
    return res.status(400).json({ error: 'INVALID_INVENTORY_ITEM' });
  }

  try {
    const itemRef = firestoreDb.collection('inventoryItems').doc();
    const auditRef = firestoreDb.collection('systemAuditLogs').doc();
    const initialTransactionRef = quantity > 0 ? firestoreDb.collection('inventoryTransactions').doc() : null;
    const nowIso = new Date().toISOString();
    const actorName = asLimitedString(req.user?.name || req.user?.username || req.user?.email, 160) || 'Usuário interno';
    const actorUid = asLimitedString(req.user?.uid, 160);
    const actorRole = asLimitedString(req.user?.permissionLevel || req.user?.role, 100);

    await firestoreDb.runTransaction(async (transaction) => {
      transaction.set(itemRef, {
        name, description, category, quantity, minQuantity, unit, location, attachments,
        createdAt: nowIso, createdBy: actorName, createdByUid: actorUid,
        updatedAt: nowIso, updatedBy: actorName, updatedByUid: actorUid,
        isDeleted: false,
      });

      if (initialTransactionRef) {
        transaction.set(initialTransactionRef, {
          itemId: itemRef.id, type: 'entrada', quantity, date: nowIso,
          reason: 'Saldo inicial do cadastro', responsible: actorName, responsibleUid: actorUid,
          employeeId: '', attachments: [], previousQuantity: 0, resultingQuantity: quantity, createdAt: nowIso,
        });
      }

      transaction.set(auditRef, {
        action: 'INVENTORY_ITEM_CREATED', entityType: 'inventoryItem', entityId: itemRef.id,
        actorUid, actorName, actorRole, createdAt: nowIso, immutable: true,
        summary: `Item de estoque criado: ${name}`,
        metadata: { category, initialQuantity: quantity, minQuantity, unit, initialTransactionId: initialTransactionRef?.id || null },
      });
    });

    return res.status(201).json({ success: true, id: itemRef.id });
  } catch (error) {
    console.error('Inventory item creation failed:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.patch('/api/inventory/items/:id', requireAuth, requireInternalAccount, requireEditModule('inventory'), writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const itemId = asLimitedString(req.params.id, 160);
  if (!itemId) return res.status(400).json({ error: 'INVALID_ITEM_ID' });

  const updates: Record<string, unknown> = {};
  if (req.body?.name !== undefined) updates.name = asLimitedString(req.body.name, 180);
  if (req.body?.description !== undefined) updates.description = asLimitedString(req.body.description, 1000);
  if (req.body?.category !== undefined) updates.category = asLimitedString(req.body.category, 120);
  if (req.body?.minQuantity !== undefined) {
    const value = Number(req.body.minQuantity);
    if (!Number.isFinite(value) || value < 0) return res.status(400).json({ error: 'INVALID_MIN_QUANTITY' });
    updates.minQuantity = value;
  }
  if (req.body?.unit !== undefined) updates.unit = asLimitedString(req.body.unit, 50);
  if (req.body?.location !== undefined) updates.location = asLimitedString(req.body.location, 180);
  if (req.body?.attachments !== undefined) {
    updates.attachments = Array.isArray(req.body.attachments)
      ? req.body.attachments.slice(0, 20).map((value: unknown) => asLimitedString(value, 2048)).filter(Boolean)
      : [];
  }

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'NO_ALLOWED_UPDATES' });
  if (updates.name === '' || updates.category === '' || updates.unit === '') return res.status(400).json({ error: 'INVALID_INVENTORY_ITEM' });

  try {
    const itemRef = firestoreDb.collection('inventoryItems').doc(itemId);
    const auditRef = firestoreDb.collection('systemAuditLogs').doc();
    const nowIso = new Date().toISOString();
    const actorName = asLimitedString(req.user?.name || req.user?.username || req.user?.email, 160) || 'Usuário interno';
    const actorUid = asLimitedString(req.user?.uid, 160);
    const actorRole = asLimitedString(req.user?.permissionLevel || req.user?.role, 100);

    await firestoreDb.runTransaction(async (transaction) => {
      const itemSnap = await transaction.get(itemRef);
      if (!itemSnap.exists || itemSnap.data()?.isDeleted === true) {
        const error: any = new Error('ITEM_NOT_FOUND'); error.code = 'ITEM_NOT_FOUND'; throw error;
      }
      transaction.update(itemRef, { ...updates, updatedAt: nowIso, updatedBy: actorName, updatedByUid: actorUid });
      transaction.set(auditRef, {
        action: 'INVENTORY_ITEM_UPDATED', entityType: 'inventoryItem', entityId: itemId,
        actorUid, actorName, actorRole, createdAt: nowIso, immutable: true,
        summary: `Cadastro de item de estoque atualizado`,
        metadata: { changedFields: Object.keys(updates) },
      });
    });
    return res.json({ success: true, updates });
  } catch (error: any) {
    const code = String(error?.code || error?.message || '');
    if (code.includes('ITEM_NOT_FOUND')) return res.status(404).json({ error: 'ITEM_NOT_FOUND' });
    console.error('Inventory item update failed:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.post('/api/inventory/move', requireAuth, requireInternalAccount, requireEditModule('inventory'), writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });

  const itemId = asLimitedString(req.body?.itemId, 160);
  const type = req.body?.type === 'entrada' || req.body?.type === 'saida' ? req.body.type : '';
  const quantity = Number(req.body?.quantity);
  const reason = asLimitedString(req.body?.reason, 500);
  const employeeId = asLimitedString(req.body?.employeeId, 160);
  const attachments = Array.isArray(req.body?.attachments)
    ? req.body.attachments
        .slice(0, 20)
        .map((value: unknown) => asLimitedString(value, 2048))
        .filter(Boolean)
    : [];

  if (!itemId || !type || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000 || !reason) {
    return res.status(400).json({ error: 'INVALID_INVENTORY_MOVEMENT' });
  }

  try {
    const itemRef = firestoreDb.collection('inventoryItems').doc(itemId);
    const transactionRef = firestoreDb.collection('inventoryTransactions').doc();
    const auditRef = firestoreDb.collection('systemAuditLogs').doc();
    const nowIso = new Date().toISOString();
    let resultingQuantity = 0;

    await firestoreDb.runTransaction(async (transaction) => {
      const itemSnap = await transaction.get(itemRef);
      if (!itemSnap.exists || itemSnap.data()?.isDeleted === true) {
        const error: any = new Error('ITEM_NOT_FOUND');
        error.code = 'ITEM_NOT_FOUND';
        throw error;
      }

      const itemData: any = itemSnap.data() || {};
      const currentQuantity = Number(itemData.quantity || 0);
      if (!Number.isFinite(currentQuantity)) {
        const error: any = new Error('INVALID_STOCK_STATE');
        error.code = 'INVALID_STOCK_STATE';
        throw error;
      }

      resultingQuantity = type === 'entrada'
        ? currentQuantity + quantity
        : currentQuantity - quantity;

      if (resultingQuantity < 0) {
        const error: any = new Error('INSUFFICIENT_STOCK');
        error.code = 'INSUFFICIENT_STOCK';
        throw error;
      }

      const actorName = asLimitedString(req.user?.name || req.user?.username || req.user?.email, 160) || 'Usuário interno';
      const actorUid = asLimitedString(req.user?.uid, 160);
      const actorRole = asLimitedString(req.user?.permissionLevel || req.user?.role, 100);

      transaction.update(itemRef, {
        quantity: resultingQuantity,
        updatedAt: nowIso,
        updatedByUid: actorUid,
        updatedBy: actorName,
      });

      transaction.set(transactionRef, {
        itemId, type, quantity, date: nowIso, reason,
        responsible: actorName,
        responsibleUid: actorUid,
        employeeId: employeeId || '',
        attachments,
        previousQuantity: currentQuantity,
        resultingQuantity,
        createdAt: nowIso,
      });

      transaction.set(auditRef, {
        action: 'INVENTORY_MOVEMENT',
        entityType: 'inventoryItem',
        entityId: itemId,
        actorUid, actorName, actorRole,
        createdAt: nowIso,
        immutable: true,
        summary: `${type === 'entrada' ? 'Entrada' : 'Saída'} de ${quantity} unidade(s)`,
        metadata: {
          transactionId: transactionRef.id,
          previousQuantity: currentQuantity,
          resultingQuantity,
          reason,
          employeeId: employeeId || null,
        },
      });
    });

    return res.json({ success: true, transactionId: transactionRef.id, newQuantity: resultingQuantity });
  } catch (error: any) {
    const code = String(error?.code || error?.message || '');
    if (code.includes('ITEM_NOT_FOUND')) return res.status(404).json({ error: 'ITEM_NOT_FOUND' });
    if (code.includes('INSUFFICIENT_STOCK')) return res.status(409).json({ error: 'INSUFFICIENT_STOCK' });
    if (code.includes('INVALID_STOCK_STATE')) return res.status(409).json({ error: 'INVALID_STOCK_STATE' });
    console.error('Atomic inventory movement failed:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

const financeBusinessDate = (): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bahia', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};

const normalizeFinanceDate = (value: unknown): string => {
  const text = asLimitedString(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return '';
  const parsed = new Date(`${text}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text ? '' : text;
};

const normalizeFinanceAmount = (value: unknown): number | null => {
  if (typeof value === 'string') {
    const normalized = value.trim().replace(/\s/g, '').replace(/R\$/gi, '').replace(/\./g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};


const FINANCE_OPERATION_KINDS = new Set([
  'orcamento', 'emprestimo', 'cartao', 'despesa_cartao', 'reembolso',
  'custo_pessoal', 'rateio', 'ativo', 'tributo',
]);

const financeActor = (req: AuthRequest) => ({
  actorName: asLimitedString(req.user?.name || req.user?.username || req.user?.email, 160) || 'Usuário interno',
  actorUid: asLimitedString(req.user?.uid, 160),
  actorRole: asLimitedString(req.user?.permissionLevel || req.user?.role, 100),
});

const financeAddMonths = (value: string, months: number, preferredDay?: number): string => {
  const normalized = normalizeFinanceDate(value);
  if (!normalized) return '';
  const source = new Date(`${normalized}T12:00:00.000Z`);
  const targetYear = source.getUTCFullYear();
  const targetMonth = source.getUTCMonth() + months;
  const first = new Date(Date.UTC(targetYear, targetMonth, 1, 12));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12)).getUTCDate();
  const day = Math.max(1, Math.min(lastDay, Math.floor(preferredDay || source.getUTCDate())));
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), day, 12)).toISOString().slice(0, 10);
};


const financeCardInvoiceDueDate = (purchaseDate: string, closingDayInput: unknown, dueDayInput: unknown): string => {
  const normalized = normalizeFinanceDate(purchaseDate);
  if (!normalized) return '';
  const source = new Date(`${normalized}T12:00:00.000Z`);
  const closingDay = Math.max(1, Math.min(31, Math.floor(Number(closingDayInput || 0) || 1)));
  const dueDay = Math.max(1, Math.min(31, Math.floor(Number(dueDayInput || 0) || 10)));
  const closingMonthOffset = source.getUTCDate() > closingDay ? 1 : 0;
  const closingMonth = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + closingMonthOffset, 1, 12));
  const dueMonthOffset = dueDay > closingDay ? 0 : 1;
  const dueMonth = new Date(Date.UTC(closingMonth.getUTCFullYear(), closingMonth.getUTCMonth() + dueMonthOffset, 1, 12));
  const lastDay = new Date(Date.UTC(dueMonth.getUTCFullYear(), dueMonth.getUTCMonth() + 1, 0, 12)).getUTCDate();
  dueMonth.setUTCDate(Math.min(dueDay, lastDay));
  return dueMonth.toISOString().slice(0, 10);
};

const normalizeFinanceOperationKind = (value: unknown): string => {
  const kind = asLimitedString(value, 40).toLowerCase();
  return FINANCE_OPERATION_KINDS.has(kind) ? kind : '';
};

const cleanFinanceTargets = (value: unknown): Array<{ costCenter: string; percent: number }> => {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).map((target: any) => ({
    costCenter: asLimitedString(target?.costCenter, 180),
    percent: Number(Number(target?.percent || 0).toFixed(4)),
  })).filter(target => target.costCenter && Number.isFinite(target.percent) && target.percent > 0);
};

const normalizeFinanceOperationInput = (raw: any, existing?: any): { data?: Record<string, any>; error?: string } => {
  const kind = normalizeFinanceOperationKind(raw?.kind || existing?.kind);
  if (!kind) return { error: 'Tipo de operação inválido.' };

  const mergedDetails = { ...(existing?.details || {}), ...(raw?.details || {}) };
  const titleInput = asLimitedString(raw?.title ?? existing?.title, 240);
  const description = asLimitedString(raw?.description ?? existing?.description, 1500);
  const categoryInput = asLimitedString(raw?.category ?? existing?.category, 180);
  const costCenterInput = asLimitedString(raw?.costCenter ?? existing?.costCenter, 180);
  const bankAccount = asLimitedString(raw?.bankAccount ?? existing?.bankAccount, 180);
  let contactName = asLimitedString(raw?.contactName ?? existing?.contactName, 240);
  const contactDocument = asLimitedString(raw?.contactDocument ?? existing?.contactDocument, 80);
  const documentNumber = asLimitedString(raw?.documentNumber ?? existing?.documentNumber, 120);
  let amount = normalizeFinanceAmount(raw?.amount ?? existing?.amount);
  let date = normalizeFinanceDate(raw?.date ?? existing?.date);
  let dueDate = normalizeFinanceDate(raw?.dueDate ?? existing?.dueDate);
  let status = asLimitedString(raw?.status ?? existing?.status, 60).toLowerCase();
  let title = titleInput;
  let category = categoryInput;
  let costCenter = costCenterInput || 'Administrativo';
  let approvalStatus: string = asLimitedString(raw?.approvalStatus ?? existing?.approvalStatus, 40).toLowerCase() || 'nao_aplicavel';
  let details: Record<string, any> = {};

  if (kind === 'orcamento') {
    const startDate = normalizeFinanceDate(mergedDetails.startDate || date);
    const endDate = normalizeFinanceDate(mergedDetails.endDate || dueDate);
    if (amount === null || amount <= 0 || !startDate || !endDate || endDate < startDate) return { error: 'Informe valor orçado positivo e período válido.' };
    category = category || asLimitedString(mergedDetails.category, 180) || 'Geral';
    title = title || `Orçamento - ${costCenter} - ${category}`;
    date = startDate; dueDate = endDate;
    status = ['ativo', 'encerrado'].includes(status) ? status : 'ativo';
    approvalStatus = 'nao_aplicavel';
    details = { startDate, endDate };
  } else if (kind === 'emprestimo') {
    const creditor = asLimitedString(mergedDetails.creditor || contactName, 240);
    const loanType = asLimitedString(mergedDetails.loanType, 120) || 'Capital de Giro';
    const interestRate = Number(mergedDetails.interestRate || 0);
    const installments = Math.floor(Number(mergedDetails.installments || 0));
    const dueDay = Math.max(1, Math.min(31, Math.floor(Number(mergedDetails.dueDay || 0) || (date ? Number(date.slice(-2)) : 1))));
    if (!creditor || amount === null || amount <= 0 || !date || !Number.isFinite(interestRate) || interestRate < 0 || interestRate > 100 || installments < 1 || installments > 120) {
      return { error: 'Credor, valor principal, data inicial, juros e número de parcelas válidos são obrigatórios.' };
    }
    title = title || `${loanType} - ${creditor}`;
    category = category || 'Empréstimos e Financiamentos';
    contactName = creditor;
    dueDate = financeAddMonths(date, 1, dueDay);
    status = ['ativo', 'encerrado'].includes(status) ? status : 'ativo';
    approvalStatus = 'nao_aplicavel';
    details = { creditor, loanType, interestRate: Number(interestRate.toFixed(6)), installments, dueDay, method: 'price' };
  } else if (kind === 'cartao') {
    const holder = asLimitedString(mergedDetails.holder, 180);
    const role = asLimitedString(mergedDetails.role, 160);
    const last4 = asLimitedString(mergedDetails.last4, 4).replace(/\D/g, '').slice(-4);
    const closingDay = Math.max(1, Math.min(31, Math.floor(Number(mergedDetails.closingDay || 1))));
    const dueDay = Math.max(1, Math.min(31, Math.floor(Number(mergedDetails.dueDay || 10))));
    if (!holder || last4.length !== 4 || amount === null || amount <= 0) return { error: 'Portador, últimos 4 dígitos e limite positivo são obrigatórios.' };
    title = title || `Cartão •••• ${last4} - ${holder}`;
    category = 'Cartão Corporativo';
    date = date || financeBusinessDate();
    dueDate = '';
    status = ['ativo', 'inativo'].includes(status) ? status : 'ativo';
    approvalStatus = 'nao_aplicavel';
    details = { holder, role, last4, closingDay, dueDay };
  } else if (kind === 'despesa_cartao') {
    const cardId = asLimitedString(mergedDetails.cardId, 180);
    const cardLast4 = asLimitedString(mergedDetails.cardLast4, 4).replace(/\D/g, '').slice(-4);
    const establishment = asLimitedString(mergedDetails.establishment || contactName, 240);
    const receiptAttached = mergedDetails.receiptAttached === true || String(mergedDetails.receiptAttached).toLowerCase() === 'sim';
    const cardClosingDayRaw = Number(mergedDetails.cardClosingDay || mergedDetails.closingDay || 0);
    const cardDueDayRaw = Number(mergedDetails.cardDueDay || mergedDetails.dueDay || 0);
    const cardClosingDay = Number.isFinite(cardClosingDayRaw) && cardClosingDayRaw > 0 ? Math.max(1, Math.min(31, Math.floor(cardClosingDayRaw))) : 0;
    const cardDueDay = Number.isFinite(cardDueDayRaw) && cardDueDayRaw > 0 ? Math.max(1, Math.min(31, Math.floor(cardDueDayRaw))) : 0;
    if (date && cardClosingDay && cardDueDay) {
      dueDate = financeCardInvoiceDueDate(date, cardClosingDay, cardDueDay);
    }
    if (!establishment || amount === null || amount <= 0 || !date || !dueDate || (!cardId && cardLast4.length !== 4)) return { error: 'Cartão, estabelecimento, valor, data e vencimento da fatura são obrigatórios.' };
    title = title || establishment;
    category = category || 'Despesas de Cartão';
    contactName = establishment;
    status = 'registrado';
    approvalStatus = 'nao_aplicavel';
    details = { cardId, cardLast4, establishment, receiptAttached, ...(cardClosingDay ? { cardClosingDay } : {}), ...(cardDueDay ? { cardDueDay } : {}) };
  } else if (kind === 'reembolso') {
    const employee = asLimitedString(mergedDetails.employee || contactName, 180);
    const purpose = asLimitedString(mergedDetails.purpose || description, 600);
    const reimbursementType = ['reembolso', 'adiantamento'].includes(String(mergedDetails.reimbursementType || '').toLowerCase()) ? String(mergedDetails.reimbursementType).toLowerCase() : 'reembolso';
    if (!employee || !purpose || amount === null || amount <= 0 || !date || !dueDate) return { error: 'Colaborador, finalidade, valor, data e vencimento são obrigatórios.' };
    title = title || `${reimbursementType === 'adiantamento' ? 'Adiantamento' : 'Reembolso'} - ${employee}`;
    category = category || (reimbursementType === 'adiantamento' ? 'Adiantamentos' : 'Reembolsos');
    contactName = employee;
    status = existing?.status && existing.status !== 'pendente_aprovacao' ? existing.status : 'pendente_aprovacao';
    approvalStatus = existing?.approvalStatus && existing.approvalStatus !== 'pendente' ? existing.approvalStatus : 'pendente';
    details = { employee, purpose, reimbursementType };
  } else if (kind === 'custo_pessoal') {
    const employee = asLimitedString(mergedDetails.employee || contactName, 180) || 'Equipe';
    const competence = asLimitedString(mergedDetails.competence, 7);
    const baseSalary = Math.max(0, Number(mergedDetails.baseSalary || 0));
    const charges = Math.max(0, Number(mergedDetails.charges || 0));
    const benefits = Math.max(0, Number(mergedDetails.benefits || 0));
    if ((amount === null || amount <= 0) && baseSalary + charges + benefits > 0) amount = Number((baseSalary + charges + benefits).toFixed(2));
    if (!competence || !/^\d{4}-\d{2}$/.test(competence) || amount === null || amount <= 0 || !dueDate) return { error: 'Competência, valor total e vencimento são obrigatórios.' };
    date = date || `${competence}-01`;
    title = title || `Custo de pessoal - ${employee} - ${competence}`;
    category = category || 'Custos de Pessoal';
    contactName = employee;
    status = 'registrado';
    approvalStatus = 'nao_aplicavel';
    details = { employee, competence, baseSalary: Number(baseSalary.toFixed(2)), charges: Number(charges.toFixed(2)), benefits: Number(benefits.toFixed(2)) };
  } else if (kind === 'rateio') {
    const sourceCostCenter = asLimitedString(mergedDetails.sourceCostCenter || costCenter, 180);
    const targets = cleanFinanceTargets(mergedDetails.targets);
    const totalPercent = Number(targets.reduce((sum, target) => sum + target.percent, 0).toFixed(4));
    if (!sourceCostCenter || targets.length < 1 || Math.abs(totalPercent - 100) > 0.01) return { error: 'Informe o centro de custo de origem e destinos cujo percentual total seja 100%.' };
    amount = 0; date = date || financeBusinessDate(); dueDate = '';
    title = title || `Rateio - ${sourceCostCenter}`;
    category = 'Rateio de Custos'; costCenter = sourceCostCenter;
    status = ['ativo', 'inativo'].includes(status) ? status : 'ativo';
    approvalStatus = 'nao_aplicavel';
    details = { sourceCostCenter, targets, totalPercent };
  } else if (kind === 'ativo') {
    const assetName = asLimitedString(mergedDetails.assetName || titleInput, 240);
    const salvageValue = Math.max(0, Number(mergedDetails.salvageValue || 0));
    const lifeMonths = Math.floor(Number(mergedDetails.lifeMonths || 0));
    const supplier = asLimitedString(mergedDetails.supplier || contactName, 240);
    const createExpense = mergedDetails.createExpense === true || String(mergedDetails.createExpense).toLowerCase() === 'sim';
    if (!assetName || amount === null || amount <= 0 || !date || salvageValue >= amount || lifeMonths < 1 || lifeMonths > 600 || (createExpense && !dueDate)) return { error: 'Ativo, valor, data de aquisição, valor residual inferior ao custo e vida útil válida são obrigatórios.' };
    title = assetName; category = category || 'Ativos e Investimentos'; contactName = supplier;
    status = ['ativo', 'baixado'].includes(status) ? status : 'ativo';
    approvalStatus = 'nao_aplicavel';
    details = { assetName, salvageValue: Number(salvageValue.toFixed(2)), lifeMonths, supplier, createExpense };
  } else if (kind === 'tributo') {
    const taxType = asLimitedString(mergedDetails.taxType || titleInput, 120);
    const competence = asLimitedString(mergedDetails.competence, 7);
    if (!taxType || amount === null || amount <= 0 || !date || !dueDate) return { error: 'Tributo, valor, competência/data e vencimento são obrigatórios.' };
    title = title || `${taxType}${competence ? ` - ${competence}` : ''}`;
    category = category || 'Tributos e Retenções';
    status = 'pendente'; approvalStatus = 'nao_aplicavel';
    details = { taxType, competence };
  }

  return {
    data: {
      kind, title, description, amount: Number((amount || 0).toFixed(2)), date, dueDate, status,
      category, costCenter, bankAccount, contactName, contactDocument, documentNumber,
      approvalStatus, details,
    },
  };
};

const buildLoanSchedule = (operation: any): Array<{ installment: number; dueDate: string; amount: number; interest: number; amortization: number }> => {
  const principal = Math.max(0, Number(operation.amount || 0));
  const installments = Math.max(1, Math.floor(Number(operation.details?.installments || 1)));
  const monthlyRate = Math.max(0, Number(operation.details?.interestRate || 0)) / 100;
  const dueDay = Math.max(1, Math.min(31, Math.floor(Number(operation.details?.dueDay || 1))));
  const pmtRaw = monthlyRate > 0
    ? principal * (monthlyRate * Math.pow(1 + monthlyRate, installments)) / (Math.pow(1 + monthlyRate, installments) - 1)
    : principal / installments;
  let balance = principal;
  const schedule: Array<{ installment: number; dueDate: string; amount: number; interest: number; amortization: number }> = [];
  for (let index = 1; index <= installments; index += 1) {
    const interest = balance * monthlyRate;
    let amortization = Math.max(0, pmtRaw - interest);
    if (index === installments || amortization > balance) amortization = balance;
    const payment = Number((interest + amortization).toFixed(2));
    balance = Math.max(0, Number((balance - amortization).toFixed(8)));
    schedule.push({
      installment: index,
      dueDate: financeAddMonths(operation.date, index, dueDay),
      amount: payment,
      interest: Number(interest.toFixed(2)),
      amortization: Number(amortization.toFixed(2)),
    });
  }
  return schedule;
};

const financeOperationLinkedTransactions = (operation: any): Array<{ suffix: string; data: Record<string, any> }> => {
  const today = financeBusinessDate();
  const base = {
    type: 'despesa',
    grossAmount: Number(operation.amount || 0), retentions: 0, paidAmount: 0,
    settlements: [], bankAccount: operation.bankAccount || '', paymentMethod: '',
    contactName: operation.contactName || '', contactDocument: operation.contactDocument || '',
    costCenter: operation.costCenter || 'Administrativo', documentNumber: operation.documentNumber || '',
    recurrence: 'none', installments: 1, currentInstallment: 1,
  };

  if (operation.kind === 'emprestimo') {
    const schedule = buildLoanSchedule(operation);
    operation.details = { ...(operation.details || {}), schedule };
    return schedule.map(item => ({
      suffix: `parcela_${item.installment}`,
      data: {
        ...base,
        description: `${operation.title} - Parcela ${item.installment}/${schedule.length}`,
        amount: item.amount, grossAmount: item.amount, openBalance: item.amount,
        date: operation.date, dueDate: item.dueDate, status: item.dueDate < today ? 'atrasado' : 'pendente',
        category: operation.category || 'Empréstimos e Financiamentos',
        installments: schedule.length, currentInstallment: item.installment,
        notes: `Gerado automaticamente pelo controle de empréstimo. Juros: R$ ${item.interest.toFixed(2)}; amortização: R$ ${item.amortization.toFixed(2)}.`,
      },
    }));
  }

  const shouldCreate = operation.kind === 'despesa_cartao' || operation.kind === 'custo_pessoal' || operation.kind === 'tributo' || (operation.kind === 'ativo' && operation.details?.createExpense === true);
  if (!shouldCreate) return [];
  return [{
    suffix: 'principal',
    data: {
      ...base,
      description: operation.title,
      amount: Number(operation.amount || 0), grossAmount: Number(operation.amount || 0), openBalance: Number(operation.amount || 0),
      date: operation.date, dueDate: operation.dueDate, status: operation.dueDate && operation.dueDate < today ? 'atrasado' : 'pendente',
      category: operation.category || 'Outras Despesas',
      notes: operation.description || `Gerado automaticamente pela Central Financeira (${operation.kind}).`,
    },
  }];
};

const createFinanceOperationRecord = async (
  raw: any,
  actor: { actorName: string; actorUid: string; actorRole: string },
  options: { refId?: string; importFingerprint?: string; imported?: boolean } = {},
): Promise<{ id: string; financeTransactionIds: string[] }> => {
  if (!firestoreDb) throw new Error('AUTH_SERVICE_UNAVAILABLE');
  const normalized = normalizeFinanceOperationInput(raw);
  if (!normalized.data) throw new Error(`INVALID_FINANCE_OPERATION:${normalized.error || ''}`);
  const nowIso = new Date().toISOString();
  const operationRef = options.refId
    ? firestoreDb.collection('financeOperations').doc(options.refId)
    : firestoreDb.collection('financeOperations').doc();
  const operation: any = {
    ...normalized.data,
    createdAt: nowIso, updatedAt: nowIso,
    createdBy: actor.actorName, createdByUid: actor.actorUid,
    updatedBy: actor.actorName, updatedByUid: actor.actorUid,
    isDeleted: false,
    ...(options.importFingerprint ? { importFingerprint: options.importFingerprint } : {}),
    ...(options.imported ? { importedAt: nowIso, importedBy: actor.actorName } : {}),
  };
  const linked = financeOperationLinkedTransactions(operation);
  const transactionRefs = linked.map(entry => firestoreDb!.collection('financeTransactions').doc(`finop_${operationRef.id}_${entry.suffix}`.slice(0, 180)));
  operation.financeTransactionIds = transactionRefs.map(ref => ref.id);
  const auditRef = firestoreDb.collection('systemAuditLogs').doc();

  await firestoreDb.runTransaction(async (transaction) => {
    const existingOperation = await transaction.get(operationRef);
    if (existingOperation.exists) {
      const error: any = new Error('FINANCE_OPERATION_DUPLICATE'); error.code = 'FINANCE_OPERATION_DUPLICATE'; throw error;
    }
    transaction.create(operationRef, operation);
    linked.forEach((entry, index) => {
      const txRef = transactionRefs[index];
      transaction.create(txRef, {
        ...entry.data,
        contractId: '', contractNumber: '', contractClientName: '',
        createdAt: nowIso, updatedAt: nowIso,
        createdBy: actor.actorName, createdByUid: actor.actorUid,
        updatedBy: actor.actorName, updatedByUid: actor.actorUid,
        sourceFinanceOperationId: operationRef.id,
        isDeleted: false,
      });
    });
    transaction.set(auditRef, {
      action: 'FINANCE_OPERATION_CREATED', entityType: 'financeOperation', entityId: operationRef.id,
      actorUid: actor.actorUid, actorName: actor.actorName, actorRole: actor.actorRole,
      createdAt: nowIso, immutable: true,
      summary: `${operation.kind}: ${operation.title}`,
      metadata: { kind: operation.kind, amount: operation.amount, financeTransactionIds: operation.financeTransactionIds, imported: options.imported === true },
    });
  });
  return { id: operationRef.id, financeTransactionIds: operation.financeTransactionIds };
};


const RENTAL_BILLING_DAYS = 30;
const RENTAL_REMINDER_DAYS = 3;
const RENTAL_NOTIFICATION_RECIPIENTS = ['comercial@comanins.com.br', 'financeiro@comanins.com.br'];
const DEFAULT_RENTAL_CNAE_CODE = '7739-0/99';
const DEFAULT_RENTAL_CNAE_DESCRIPTION = 'Atividade de aluguel de outras máquinas e equipamentos comerciais e industriais não especificados anteriormente, sem operador.';
const DEFAULT_RENTAL_PAYMENT_METHOD = 'DEPÓSITO BANCÁRIO';
const DEFAULT_RENTAL_BANK_INSTRUCTIONS = 'AG. 1051, C/C PJ-2081-3, CAIXA ECONOMICA FEDERAL.';
const DEFAULT_RENTAL_TAX_NOTES = 'ISS: Não aplicável – Locação de bem móvel (CNAE 7739-0/99)\nRegime Tributário: Simples Nacional';

const rentalDate = (value: unknown): string => normalizeFinanceDate(value);

const rentalAddDays = (value: string, days: number): string => {
  const normalized = rentalDate(value);
  if (!normalized) return '';
  const date = new Date(`${normalized}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const rentalDiffDays = (from: string, to: string): number | null => {
  const a = rentalDate(from);
  const b = rentalDate(to);
  if (!a || !b) return null;
  return Math.round((new Date(`${b}T12:00:00.000Z`).getTime() - new Date(`${a}T12:00:00.000Z`).getTime()) / 86_400_000);
};

const rentalSettingsDefaults = () => ({
  rentalPrefix: 'LOC-',
  nextRentalNumber: 1,
  invoicePrefix: '',
  nextInvoiceNumber: null,
  cnaeCode: DEFAULT_RENTAL_CNAE_CODE,
  cnaeDescription: DEFAULT_RENTAL_CNAE_DESCRIPTION,
  paymentMethod: DEFAULT_RENTAL_PAYMENT_METHOD,
  bankInstructions: DEFAULT_RENTAL_BANK_INSTRUCTIONS,
  taxNotes: DEFAULT_RENTAL_TAX_NOTES,
  notificationRecipients: [...RENTAL_NOTIFICATION_RECIPIENTS],
  notificationDaysBefore: RENTAL_REMINDER_DAYS,
});

const sanitizeRentalSettings = (data: any) => {
  const defaults = rentalSettingsDefaults();
  return {
    rentalPrefix: asLimitedString(data?.rentalPrefix || defaults.rentalPrefix, 20) || defaults.rentalPrefix,
    nextRentalNumber: Math.max(1, Math.floor(Number(data?.nextRentalNumber || defaults.nextRentalNumber) || 1)),
    invoicePrefix: asLimitedString(data?.invoicePrefix || '', 20),
    nextInvoiceNumber: Number.isFinite(Number(data?.nextInvoiceNumber)) && Number(data?.nextInvoiceNumber) > 0
      ? Math.floor(Number(data.nextInvoiceNumber))
      : null,
    cnaeCode: asLimitedString(data?.cnaeCode || defaults.cnaeCode, 40) || defaults.cnaeCode,
    cnaeDescription: asLimitedString(data?.cnaeDescription || defaults.cnaeDescription, 1000) || defaults.cnaeDescription,
    paymentMethod: asLimitedString(data?.paymentMethod || defaults.paymentMethod, 120) || defaults.paymentMethod,
    bankInstructions: asLimitedString(data?.bankInstructions || defaults.bankInstructions, 1000) || defaults.bankInstructions,
    taxNotes: asLimitedString(data?.taxNotes || defaults.taxNotes, 2000) || defaults.taxNotes,
    // Recipients and lead time are intentionally server-controlled because they
    // are part of the operational rule requested for the rental workflow.
    notificationRecipients: [...RENTAL_NOTIFICATION_RECIPIENTS],
    notificationDaysBefore: RENTAL_REMINDER_DAYS,
  };
};

const rentalActor = (req: AuthRequest) => ({
  actorName: asLimitedString(req.user?.name || req.user?.username || req.user?.email, 160) || 'Usuário interno',
  actorUid: asLimitedString(req.user?.uid, 160),
  actorRole: asLimitedString(req.user?.permissionLevel || req.user?.role, 100),
});

const rentalRangeTextServer = (asset: any): string => {
  const min = Number(asset?.rangeMin);
  const max = Number(asset?.rangeMax);
  const unit = asLimitedString(asset?.unit, 40);
  if (!Number.isFinite(min) || !Number.isFinite(max) || !unit) return '';
  return `${min} a ${max} ${unit}`;
};

const rentalInvoiceDocId = (rentalId: string, dueDate: string): string =>
  `${String(rentalId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120)}_${String(dueDate).replace(/\D/g, '')}`;

app.put('/api/rentals/settings', requireAuth, requireInternalAccount, requireEditModule('rental'), writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });

  const currentRef = firestoreDb.collection('systemSettings').doc('rentalBilling');
  const currentSnap = await currentRef.get();
  const current = sanitizeRentalSettings(currentSnap.exists ? currentSnap.data() : {});
  const requestedNextInvoice = Number(req.body?.nextInvoiceNumber);
  if (!Number.isInteger(requestedNextInvoice) || requestedNextInvoice < 1 || requestedNextInvoice > 999999999) {
    return res.status(400).json({ error: 'RENTAL_INVALID_INVOICE_SEQUENCE' });
  }

  try {
    const latestInvoiceQuery = await firestoreDb.collection('rentalInvoices')
      .orderBy('invoiceSequenceNumber', 'desc')
      .limit(1)
      .get();
    const lastUsed = latestInvoiceQuery.empty ? 0 : Number(latestInvoiceQuery.docs[0].data()?.invoiceSequenceNumber || 0);
    if (requestedNextInvoice <= lastUsed) {
      return res.status(409).json({ error: 'RENTAL_INVALID_INVOICE_SEQUENCE', lastUsed });
    }

    const { actorName, actorUid, actorRole } = rentalActor(req);
    const nowIso = new Date().toISOString();
    const settings = sanitizeRentalSettings({
      ...current,
      rentalPrefix: req.body?.rentalPrefix,
      invoicePrefix: req.body?.invoicePrefix,
      nextInvoiceNumber: requestedNextInvoice,
      cnaeCode: req.body?.cnaeCode,
      cnaeDescription: req.body?.cnaeDescription,
      paymentMethod: req.body?.paymentMethod,
      bankInstructions: req.body?.bankInstructions,
      taxNotes: req.body?.taxNotes,
    });

    await currentRef.set({
      ...settings,
      updatedAt: nowIso,
      updatedBy: actorName,
      updatedByUid: actorUid,
    }, { merge: true });

    await firestoreDb.collection('systemAuditLogs').add({
      action: 'RENTAL_SETTINGS_UPDATED',
      entityType: 'rentalSettings',
      entityId: 'rentalBilling',
      actorUid, actorName, actorRole,
      createdAt: nowIso,
      immutable: true,
      summary: `Configurações da locação atualizadas. Próxima fatura: ${settings.invoicePrefix}${settings.nextInvoiceNumber}`,
      metadata: {
        nextInvoiceNumber: settings.nextInvoiceNumber,
        rentalPrefix: settings.rentalPrefix,
        notificationDaysBefore: RENTAL_REMINDER_DAYS,
        notificationRecipients: RENTAL_NOTIFICATION_RECIPIENTS,
      },
    });

    return res.json({ success: true, settings });
  } catch (error) {
    console.error('Rental settings update failed:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.post('/api/rentals/contracts', requireAuth, requireInternalAccount, requireEditModule('rental'), writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });

  const clientId = asLimitedString(req.body?.clientId, 180);
  const startDate = rentalDate(req.body?.startDate);
  const firstDueDate = rentalDate(req.body?.firstDueDate);
  const rawItems = Array.isArray(req.body?.items) ? req.body.items.slice(0, 100) : [];
  if (!clientId || !startDate || !firstDueDate || rawItems.length === 0) {
    return res.status(400).json({ error: 'INVALID_RENTAL_DATA' });
  }
  if ((rentalDiffDays(startDate, firstDueDate) ?? -1) < 1) {
    return res.status(400).json({ error: 'INVALID_RENTAL_DATA', field: 'firstDueDate' });
  }

  const uniqueAssetIds = Array.from(new Set(rawItems.map((item: any) => asLimitedString(item?.assetId, 180)).filter(Boolean)));
  if (uniqueAssetIds.length !== rawItems.length) {
    return res.status(400).json({ error: 'INVALID_RENTAL_DATA', field: 'items' });
  }
  const itemInputs = rawItems.map((item: any) => ({
    assetId: asLimitedString(item?.assetId, 180),
    serviceId: asLimitedString(item?.serviceId, 180),
  }));
  if (itemInputs.some((item) => !item.assetId || !item.serviceId)) {
    return res.status(400).json({ error: 'INVALID_RENTAL_DATA', field: 'items' });
  }

  const clientRef = firestoreDb.collection('clients').doc(clientId);
  const clientSnap = await clientRef.get();
  if (!clientSnap.exists) return res.status(404).json({ error: 'CLIENT_NOT_FOUND' });
  const client: any = clientSnap.data() || {};

  const rentalRef = firestoreDb.collection('rentalContracts').doc();
  const settingsRef = firestoreDb.collection('systemSettings').doc('rentalBilling');
  const auditRef = firestoreDb.collection('systemAuditLogs').doc();
  const { actorName, actorUid, actorRole } = rentalActor(req);
  const nowIso = new Date().toISOString();
  let createdRental: any = null;

  try {
    await firestoreDb.runTransaction(async (transaction) => {
      const settingsSnap = await transaction.get(settingsRef);
      const currentSettings = sanitizeRentalSettings(settingsSnap.exists ? settingsSnap.data() : {});
      const assetRefs = itemInputs.map((item) => firestoreDb!.collection('rentalAssets').doc(item.assetId));
      const serviceRefs = itemInputs.map((item) => firestoreDb!.collection('rentalServices').doc(item.serviceId));

      const assetSnaps: any[] = [];
      for (const ref of assetRefs) assetSnaps.push(await transaction.get(ref));
      const serviceSnaps: any[] = [];
      for (const ref of serviceRefs) serviceSnaps.push(await transaction.get(ref));

      const items = itemInputs.map((item, index) => {
        const assetSnap = assetSnaps[index];
        const serviceSnap = serviceSnaps[index];
        if (!assetSnap.exists || assetSnap.data()?.status !== 'disponivel') {
          const error: any = new Error('RENTAL_ASSET_NOT_AVAILABLE');
          error.code = 'RENTAL_ASSET_NOT_AVAILABLE';
          throw error;
        }
        if (!serviceSnap.exists || serviceSnap.data()?.active === false || Number(serviceSnap.data()?.monthlyPrice || 0) <= 0) {
          const error: any = new Error('RENTAL_SERVICE_INVALID');
          error.code = 'RENTAL_SERVICE_INVALID';
          throw error;
        }
        const asset: any = assetSnap.data() || {};
        const service: any = serviceSnap.data() || {};
        return {
          assetId: item.assetId,
          assetCode: asLimitedString(asset.assetCode, 120),
          tag: asLimitedString(asset.tag, 160),
          description: asLimitedString(asset.description || 'Manômetro com base', 240),
          brand: asLimitedString(asset.brand, 120),
          model: asLimitedString(asset.model, 120),
          serialNumber: asLimitedString(asset.serialNumber, 120),
          rangeText: rentalRangeTextServer(asset),
          baseIdentification: asLimitedString(asset.baseIdentification, 120),
          serviceId: item.serviceId,
          serviceName: asLimitedString(service.name, 240),
          monthlyPrice: Number(Number(service.monthlyPrice || 0).toFixed(2)),
        };
      });

      const sequence = currentSettings.nextRentalNumber;
      const rentalNumber = `${currentSettings.rentalPrefix}${String(sequence).padStart(5, '0')}`;
      createdRental = {
        id: rentalRef.id,
        rentalNumber,
        clientId,
        clientName: asLimitedString(client.name || client.razaoSocial, 240),
        clientCnpj: asLimitedString(client.cnpj, 60),
        clientAddress: asLimitedString(client.city || client.address, 1000),
        clientEmail: asLimitedString(client.email, 254),
        clientPhone: asLimitedString(client.phone, 60),
        startDate,
        firstDueDate,
        billingCycleDays: RENTAL_BILLING_DAYS,
        status: 'rascunho',
        items,
        quotationRefs: asLimitedString(req.body?.quotationRefs, 1000),
        purchaseOrder: asLimitedString(req.body?.purchaseOrder, 500),
        processNumber: asLimitedString(req.body?.processNumber, 500),
        project: asLimitedString(req.body?.project, 500),
        responsibles: asLimitedString(req.body?.responsibles, 1000),
        paymentMethod: asLimitedString(req.body?.paymentMethod, 120) || currentSettings.paymentMethod,
        billingNotes: asLimitedString(req.body?.billingNotes, 3000),
        createdAt: nowIso,
        createdBy: actorName,
        createdByUid: actorUid,
        updatedAt: nowIso,
        updatedBy: actorName,
        updatedByUid: actorUid,
      };

      transaction.create(rentalRef, createdRental);
      transaction.set(settingsRef, {
        ...currentSettings,
        nextRentalNumber: sequence + 1,
        updatedAt: nowIso,
        updatedBy: actorName,
        updatedByUid: actorUid,
      }, { merge: true });
      transaction.set(auditRef, {
        action: 'RENTAL_CREATED',
        entityType: 'rentalContract',
        entityId: rentalRef.id,
        actorUid, actorName, actorRole,
        createdAt: nowIso,
        immutable: true,
        summary: `Locação ${rentalNumber} criada para ${createdRental.clientName}`,
        metadata: { rentalNumber, clientId, itemCount: items.length, firstDueDate, billingCycleDays: RENTAL_BILLING_DAYS },
      });
    });

    return res.status(201).json({ success: true, rental: createdRental });
  } catch (error: any) {
    const code = String(error?.code || error?.message || '');
    if (code.includes('RENTAL_ASSET_NOT_AVAILABLE')) return res.status(409).json({ error: 'RENTAL_ASSET_NOT_AVAILABLE' });
    if (code.includes('RENTAL_SERVICE_INVALID')) return res.status(409).json({ error: 'RENTAL_SERVICE_INVALID' });
    console.error('Rental creation failed:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.patch('/api/rentals/contracts/:id', requireAuth, requireInternalAccount, requireEditModule('rental'), writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const rentalId = asLimitedString(req.params.id, 180);
  if (!rentalId) return res.status(400).json({ error: 'INVALID_RENTAL_DATA' });
  const ref = firestoreDb.collection('rentalContracts').doc(rentalId);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'RENTAL_NOT_FOUND' });
  const before: any = snap.data() || {};
  if (before.status === 'encerrado' || before.status === 'cancelado') return res.status(409).json({ error: 'RENTAL_NOT_ACTIVE' });

  const updates: Record<string, unknown> = {};
  for (const [key, max] of Object.entries({
    quotationRefs: 1000, purchaseOrder: 500, processNumber: 500, project: 500,
    responsibles: 1000, paymentMethod: 120, billingNotes: 3000,
  })) {
    if (req.body?.[key] !== undefined) updates[key] = asLimitedString(req.body[key], max as number);
  }
  if (before.status === 'rascunho') {
    if (req.body?.startDate !== undefined) {
      const value = rentalDate(req.body.startDate);
      if (!value) return res.status(400).json({ error: 'INVALID_RENTAL_DATA', field: 'startDate' });
      updates.startDate = value;
    }
    if (req.body?.firstDueDate !== undefined) {
      const value = rentalDate(req.body.firstDueDate);
      if (!value) return res.status(400).json({ error: 'INVALID_RENTAL_DATA', field: 'firstDueDate' });
      updates.firstDueDate = value;
    }
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'NO_ALLOWED_UPDATES' });

  const { actorName, actorUid, actorRole } = rentalActor(req);
  const nowIso = new Date().toISOString();
  updates.updatedAt = nowIso;
  updates.updatedBy = actorName;
  updates.updatedByUid = actorUid;
  await ref.update(updates);
  await firestoreDb.collection('systemAuditLogs').add({
    action: 'RENTAL_UPDATED', entityType: 'rentalContract', entityId: rentalId,
    actorUid, actorName, actorRole, createdAt: nowIso, immutable: true,
    summary: `Locação ${before.rentalNumber || rentalId} atualizada`,
    metadata: { fields: Object.keys(updates).filter((key) => !key.startsWith('updated')) },
  });
  const updatedSnap = await ref.get();
  return res.json({ success: true, rental: { id: updatedSnap.id, ...updatedSnap.data() } });
});

app.post('/api/rentals/contracts/:id/dispatch', requireAuth, requireInternalAccount, requireEditModule('rental'), writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const rentalId = asLimitedString(req.params.id, 180);
  const responsibleClient = asLimitedString(req.body?.responsibleClient, 240);
  const responsibleClientDocument = asLimitedString(req.body?.responsibleClientDocument, 120);
  const notes = asLimitedString(req.body?.notes, 2000);
  const dispatchDate = rentalDate(req.body?.date || new Date().toISOString().slice(0, 10));
  if (!rentalId || !responsibleClient || !dispatchDate) return res.status(400).json({ error: 'INVALID_RENTAL_DATA' });

  const rentalRef = firestoreDb.collection('rentalContracts').doc(rentalId);
  const movementRef = firestoreDb.collection('rentalMovements').doc();
  const auditRef = firestoreDb.collection('systemAuditLogs').doc();
  const { actorName, actorUid, actorRole } = rentalActor(req);
  const nowIso = new Date().toISOString();
  let rentalResult: any = null;
  let movementResult: any = null;

  try {
    await firestoreDb.runTransaction(async (transaction) => {
      const rentalSnap = await transaction.get(rentalRef);
      if (!rentalSnap.exists) {
        const error: any = new Error('RENTAL_NOT_FOUND'); error.code = 'RENTAL_NOT_FOUND'; throw error;
      }
      const rental: any = rentalSnap.data() || {};
      if (rental.status !== 'rascunho') {
        const error: any = new Error(rental.status === 'ativo' ? 'RENTAL_ALREADY_DISPATCHED' : 'RENTAL_NOT_ACTIVE');
        error.code = error.message;
        throw error;
      }
      const items = Array.isArray(rental.items) ? rental.items : [];
      if (items.length === 0) {
        const error: any = new Error('RENTAL_NO_ACTIVE_ITEMS'); error.code = 'RENTAL_NO_ACTIVE_ITEMS'; throw error;
      }
      const assetRefs = items.map((item: any) => firestoreDb!.collection('rentalAssets').doc(String(item.assetId)));
      const assetSnaps: any[] = [];
      for (const ref of assetRefs) assetSnaps.push(await transaction.get(ref));
      for (const snap of assetSnaps) {
        if (!snap.exists || snap.data()?.status !== 'disponivel') {
          const error: any = new Error('RENTAL_ASSET_NOT_AVAILABLE'); error.code = 'RENTAL_ASSET_NOT_AVAILABLE'; throw error;
        }
        const calibrationDueDate = rentalDate(snap.data()?.calibrationDueDate);
        if (calibrationDueDate && calibrationDueDate < dispatchDate) {
          const error: any = new Error('RENTAL_ASSET_CALIBRATION_EXPIRED'); error.code = 'RENTAL_ASSET_CALIBRATION_EXPIRED'; throw error;
        }
      }

      const nextItems = items.map((item: any) => ({ ...item, dispatchedAt: dispatchDate }));
      assetRefs.forEach((ref: any) => transaction.update(ref, {
        status: 'locado',
        updatedAt: nowIso,
        updatedBy: actorName,
        updatedByUid: actorUid,
        currentRentalId: rentalId,
      }));

      rentalResult = {
        id: rentalId,
        ...rental,
        items: nextItems,
        status: 'ativo',
        dispatchAt: dispatchDate,
        dispatchResponsible: actorName,
        dispatchResponsibleUid: actorUid,
        updatedAt: nowIso,
        updatedBy: actorName,
        updatedByUid: actorUid,
      };
      transaction.update(rentalRef, {
        items: nextItems,
        status: 'ativo',
        dispatchAt: dispatchDate,
        dispatchResponsible: actorName,
        dispatchResponsibleUid: actorUid,
        updatedAt: nowIso,
        updatedBy: actorName,
        updatedByUid: actorUid,
      });

      movementResult = {
        id: movementRef.id,
        movementNumber: `SAI-${rental.rentalNumber}`,
        rentalId,
        rentalNumber: rental.rentalNumber,
        type: 'saida',
        clientId: rental.clientId,
        clientName: rental.clientName,
        clientCnpj: rental.clientCnpj,
        clientAddress: rental.clientAddress || '',
        date: dispatchDate,
        responsibleComanins: actorName,
        responsibleComaninsUid: actorUid,
        responsibleClient,
        responsibleClientDocument,
        items: nextItems.map((item: any) => ({
          assetId: item.assetId,
          assetCode: item.assetCode,
          description: item.description,
          baseIdentification: item.baseIdentification || '',
          serialNumber: item.serialNumber || '',
        })),
        notes,
        createdAt: nowIso,
      };
      transaction.create(movementRef, movementResult);
      transaction.set(auditRef, {
        action: 'RENTAL_DISPATCHED', entityType: 'rentalContract', entityId: rentalId,
        actorUid, actorName, actorRole, createdAt: nowIso, immutable: true,
        summary: `Saída da locação ${rental.rentalNumber} registrada`,
        metadata: { movementId: movementRef.id, itemCount: items.length, dispatchDate, responsibleClient },
      });
    });

    return res.json({ success: true, rental: rentalResult, movement: movementResult });
  } catch (error: any) {
    const code = String(error?.code || error?.message || '');
    if (code.includes('RENTAL_NOT_FOUND')) return res.status(404).json({ error: 'RENTAL_NOT_FOUND' });
    if (code.includes('RENTAL_ALREADY_DISPATCHED')) return res.status(409).json({ error: 'RENTAL_ALREADY_DISPATCHED' });
    if (code.includes('RENTAL_ASSET_NOT_AVAILABLE')) return res.status(409).json({ error: 'RENTAL_ASSET_NOT_AVAILABLE' });
    if (code.includes('RENTAL_ASSET_CALIBRATION_EXPIRED')) return res.status(409).json({ error: 'RENTAL_ASSET_CALIBRATION_EXPIRED' });
    if (code.includes('RENTAL_NOT_ACTIVE')) return res.status(409).json({ error: 'RENTAL_NOT_ACTIVE' });
    console.error('Rental dispatch failed:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.post('/api/rentals/contracts/:id/return', requireAuth, requireInternalAccount, requireEditModule('rental'), writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const rentalId = asLimitedString(req.params.id, 180);
  const responsibleClient = asLimitedString(req.body?.responsibleClient, 240);
  const responsibleClientDocument = asLimitedString(req.body?.responsibleClientDocument, 120);
  const notes = asLimitedString(req.body?.notes, 2000);
  const returnDate = rentalDate(req.body?.date || new Date().toISOString().slice(0, 10));
  const rawItems = Array.isArray(req.body?.items) ? req.body.items.slice(0, 100) : [];
  if (!rentalId || !responsibleClient || !returnDate || rawItems.length === 0) return res.status(400).json({ error: 'INVALID_RENTAL_DATA' });

  const requested = new Map<string, { condition: 'conforme' | 'avaria' | 'faltante'; notes: string }>();
  for (const raw of rawItems) {
    const assetId = asLimitedString(raw?.assetId, 180);
    const condition = ['conforme', 'avaria', 'faltante'].includes(String(raw?.condition)) ? raw.condition : '';
    if (!assetId || !condition || requested.has(assetId)) return res.status(400).json({ error: 'INVALID_RENTAL_DATA', field: 'items' });
    requested.set(assetId, { condition, notes: asLimitedString(raw?.notes, 1000) });
  }

  const rentalRef = firestoreDb.collection('rentalContracts').doc(rentalId);
  const movementRef = firestoreDb.collection('rentalMovements').doc();
  const auditRef = firestoreDb.collection('systemAuditLogs').doc();
  const { actorName, actorUid, actorRole } = rentalActor(req);
  const nowIso = new Date().toISOString();
  let rentalResult: any = null;
  let movementResult: any = null;

  try {
    await firestoreDb.runTransaction(async (transaction) => {
      const rentalSnap = await transaction.get(rentalRef);
      if (!rentalSnap.exists) {
        const error: any = new Error('RENTAL_NOT_FOUND'); error.code = 'RENTAL_NOT_FOUND'; throw error;
      }
      const rental: any = rentalSnap.data() || {};
      if (rental.status !== 'ativo') {
        const error: any = new Error('RENTAL_NOT_ACTIVE'); error.code = 'RENTAL_NOT_ACTIVE'; throw error;
      }
      const items = Array.isArray(rental.items) ? rental.items : [];
      const activeById = new Map(items.filter((item: any) => !item.returnedAt).map((item: any) => [String(item.assetId), item]));
      for (const assetId of requested.keys()) {
        if (!activeById.has(assetId)) {
          const error: any = new Error('RENTAL_ITEM_NOT_ACTIVE'); error.code = 'RENTAL_ITEM_NOT_ACTIVE'; throw error;
        }
      }

      const assetRefs = Array.from(requested.keys()).map((assetId) => firestoreDb!.collection('rentalAssets').doc(assetId));
      const assetSnaps: any[] = [];
      for (const ref of assetRefs) assetSnaps.push(await transaction.get(ref));
      if (assetSnaps.some((snap) => !snap.exists)) {
        const error: any = new Error('RENTAL_ASSET_NOT_FOUND'); error.code = 'RENTAL_ASSET_NOT_FOUND'; throw error;
      }

      const movementItems: any[] = [];
      const nextItems = items.map((item: any) => {
        const requestItem = requested.get(String(item.assetId));
        if (!requestItem || item.returnedAt) return item;
        movementItems.push({
          assetId: item.assetId,
          assetCode: item.assetCode,
          description: item.description,
          baseIdentification: item.baseIdentification || '',
          serialNumber: item.serialNumber || '',
          condition: requestItem.condition,
          notes: requestItem.notes,
        });
        // A missing item is documented but remains allocated/rented because it
        // was not physically received by COMANINS.
        if (requestItem.condition === 'faltante') {
          return { ...item, returnCondition: 'faltante', returnNotes: requestItem.notes };
        }
        return {
          ...item,
          returnedAt: returnDate,
          returnCondition: requestItem.condition,
          returnNotes: requestItem.notes,
        };
      });

      assetRefs.forEach((ref: any, index) => {
        const assetId = Array.from(requested.keys())[index];
        const requestItem = requested.get(assetId)!;
        if (requestItem.condition === 'faltante') return;
        transaction.update(ref, {
          status: requestItem.condition === 'avaria' ? 'manutencao' : 'disponivel',
          currentRentalId: FieldValue.delete(),
          updatedAt: nowIso,
          updatedBy: actorName,
          updatedByUid: actorUid,
        });
      });

      const allReturned = nextItems.every((item: any) => !!item.returnedAt);
      const nextStatus = allReturned ? 'encerrado' : 'ativo';
      rentalResult = {
        id: rentalId,
        ...rental,
        items: nextItems,
        status: nextStatus,
        ...(allReturned ? { closedAt: returnDate } : {}),
        updatedAt: nowIso,
        updatedBy: actorName,
        updatedByUid: actorUid,
      };
      transaction.update(rentalRef, {
        items: nextItems,
        status: nextStatus,
        ...(allReturned ? { closedAt: returnDate } : {}),
        updatedAt: nowIso,
        updatedBy: actorName,
        updatedByUid: actorUid,
      });

      movementResult = {
        id: movementRef.id,
        movementNumber: `DEV-${rental.rentalNumber}-${Date.now().toString().slice(-6)}`,
        rentalId,
        rentalNumber: rental.rentalNumber,
        type: 'devolucao',
        clientId: rental.clientId,
        clientName: rental.clientName,
        clientCnpj: rental.clientCnpj,
        clientAddress: rental.clientAddress || '',
        date: returnDate,
        responsibleComanins: actorName,
        responsibleComaninsUid: actorUid,
        responsibleClient,
        responsibleClientDocument,
        items: movementItems,
        notes,
        createdAt: nowIso,
      };
      transaction.create(movementRef, movementResult);
      transaction.set(auditRef, {
        action: 'RENTAL_RETURN_RECEIVED', entityType: 'rentalContract', entityId: rentalId,
        actorUid, actorName, actorRole, createdAt: nowIso, immutable: true,
        summary: `${allReturned ? 'Devolução total' : 'Devolução parcial'} da locação ${rental.rentalNumber}`,
        metadata: { movementId: movementRef.id, itemCount: movementItems.length, returnDate, responsibleClient, closed: allReturned },
      });
    });

    return res.json({ success: true, rental: rentalResult, movement: movementResult });
  } catch (error: any) {
    const code = String(error?.code || error?.message || '');
    if (code.includes('RENTAL_NOT_FOUND')) return res.status(404).json({ error: 'RENTAL_NOT_FOUND' });
    if (code.includes('RENTAL_NOT_ACTIVE') || code.includes('RENTAL_ITEM_NOT_ACTIVE')) return res.status(409).json({ error: 'RENTAL_NOT_ACTIVE' });
    console.error('Rental return failed:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});


app.delete('/api/rentals/assets/:id', requireAuth, requireInternalAccount, requireAdministratorAccount, writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const assetId = asLimitedString(req.params.id, 180);
  const reason = asLimitedString(req.body?.reason, 1000);
  if (!assetId) return res.status(400).json({ error: 'INVALID_RENTAL_ASSET' });
  if (!reason) return res.status(400).json({ error: 'DELETE_REASON_REQUIRED' });

  const assetRef = firestoreDb.collection('rentalAssets').doc(assetId);
  const auditRef = firestoreDb.collection('systemAuditLogs').doc();
  const { actorName, actorUid, actorRole } = rentalActor(req);
  const nowIso = new Date().toISOString();

  try {
    await firestoreDb.runTransaction(async (transaction) => {
      const assetSnap = await transaction.get(assetRef);
      if (!assetSnap.exists) {
        const error: any = new Error('RENTAL_ASSET_NOT_FOUND');
        error.code = 'RENTAL_ASSET_NOT_FOUND';
        throw error;
      }
      const asset: any = assetSnap.data() || {};
      if (String(asset.status || '') === 'locado' || asLimitedString(asset.currentRentalId, 180)) {
        const error: any = new Error('RENTAL_ASSET_IN_USE');
        error.code = 'RENTAL_ASSET_IN_USE';
        throw error;
      }

      transaction.delete(assetRef);
      transaction.set(auditRef, {
        action: 'RENTAL_ASSET_DELETED',
        entityType: 'rentalAsset',
        entityId: assetId,
        actorUid, actorName, actorRole,
        createdAt: nowIso,
        immutable: true,
        summary: `Equipamento locável ${asLimitedString(asset.assetCode, 120) || assetId} excluído por administrador`,
        metadata: {
          reason,
          assetCode: asLimitedString(asset.assetCode, 120),
          tag: asLimitedString(asset.tag, 160),
          calibrationCertificateNumber: asLimitedString(asset.calibrationCertificateNumber, 180),
          status: asLimitedString(asset.status, 60),
        },
      });
    });
    return res.json({ success: true });
  } catch (error: any) {
    const code = String(error?.code || error?.message || '');
    if (code.includes('RENTAL_ASSET_NOT_FOUND')) return res.status(404).json({ error: 'RENTAL_ASSET_NOT_FOUND' });
    if (code.includes('RENTAL_ASSET_IN_USE')) return res.status(409).json({ error: 'RENTAL_ASSET_IN_USE' });
    console.error('Rental asset delete failed:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.delete('/api/rentals/contracts/:id', requireAuth, requireInternalAccount, requireAdministratorAccount, writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const rentalId = asLimitedString(req.params.id, 180);
  const reason = asLimitedString(req.body?.reason, 1000);
  if (!rentalId) return res.status(400).json({ error: 'INVALID_RENTAL_DATA' });
  if (!reason) return res.status(400).json({ error: 'DELETE_REASON_REQUIRED' });

  const rentalRef = firestoreDb.collection('rentalContracts').doc(rentalId);
  const invoiceQuery = firestoreDb.collection('rentalInvoices').where('rentalId', '==', rentalId);
  const movementQuery = firestoreDb.collection('rentalMovements').where('rentalId', '==', rentalId);
  const financeQuery = firestoreDb.collection('financeTransactions').where('contractId', '==', rentalId);
  const auditRef = firestoreDb.collection('systemAuditLogs').doc();
  const { actorName, actorUid, actorRole } = rentalActor(req);
  const nowIso = new Date().toISOString();
  let result = { deletedInvoices: 0, deletedFinanceTransactions: 0, deletedMovements: 0, releasedAssets: 0 };

  try {
    await firestoreDb.runTransaction(async (transaction) => {
      const rentalSnap = await transaction.get(rentalRef);
      if (!rentalSnap.exists) {
        const error: any = new Error('RENTAL_NOT_FOUND'); error.code = 'RENTAL_NOT_FOUND'; throw error;
      }
      const rental: any = rentalSnap.data() || {};
      const invoiceSnap = await transaction.get(invoiceQuery);
      const movementSnap = await transaction.get(movementQuery);
      const financeSnap = await transaction.get(financeQuery);

      const assetIds = Array.from(new Set(
        (Array.isArray(rental.items) ? rental.items : [])
          .map((item: any) => asLimitedString(item?.assetId, 180))
          .filter(Boolean),
      ));
      const assetRefs = assetIds.map((assetId) => firestoreDb!.collection("rentalAssets").doc(String(assetId)));
      const assetSnaps: any[] = [];
      for (const assetRef of assetRefs) assetSnaps.push(await transaction.get(assetRef));

      const invoiceFinanceIds = new Set(
        invoiceSnap.docs.map((doc) => asLimitedString(doc.data()?.financeTransactionId, 180)).filter(Boolean),
      );
      const financeDocs = financeSnap.docs.filter((doc) =>
        invoiceFinanceIds.has(doc.id) || String(doc.data()?.category || '') === 'Locação de Instrumentos',
      );
      const assetsToRelease = assetSnaps.filter((snap) => snap.exists && String(snap.data()?.currentRentalId || '') === rentalId);
      const writeCount = 2 + invoiceSnap.size + movementSnap.size + financeDocs.length + assetsToRelease.length;
      if (writeCount > 450) {
        const error: any = new Error('RENTAL_DELETE_TOO_MANY_LINKED_RECORDS'); error.code = 'RENTAL_DELETE_TOO_MANY_LINKED_RECORDS'; throw error;
      }

      assetsToRelease.forEach((snap) => {
        const assetData = snap.data() || {};
        transaction.update(snap.ref, {
          status: String(assetData.status || '') === 'locado' ? 'disponivel' : assetData.status,
          currentRentalId: FieldValue.delete(),
          updatedAt: nowIso,
          updatedBy: actorName,
          updatedByUid: actorUid,
        });
      });
      invoiceSnap.docs.forEach((doc) => transaction.delete(doc.ref));
      movementSnap.docs.forEach((doc) => transaction.delete(doc.ref));
      financeDocs.forEach((doc) => transaction.delete(doc.ref));
      transaction.delete(rentalRef);
      transaction.set(auditRef, {
        action: 'RENTAL_CONTRACT_DELETED',
        entityType: 'rentalContract',
        entityId: rentalId,
        actorUid, actorName, actorRole, createdAt: nowIso, immutable: true,
        summary: `Locação ${asLimitedString(rental.rentalNumber, 120) || rentalId} excluída por administrador`,
        metadata: {
          reason,
          rentalNumber: asLimitedString(rental.rentalNumber, 120),
          clientId: asLimitedString(rental.clientId, 180),
          clientName: asLimitedString(rental.clientName, 240),
          deletedInvoices: invoiceSnap.size,
          deletedFinanceTransactions: financeDocs.length,
          deletedMovements: movementSnap.size,
          releasedAssets: assetsToRelease.length,
        },
      });

      result = {
        deletedInvoices: invoiceSnap.size,
        deletedFinanceTransactions: financeDocs.length,
        deletedMovements: movementSnap.size,
        releasedAssets: assetsToRelease.length,
      };
    });

    return res.json({ success: true, ...result });
  } catch (error: any) {
    const code = String(error?.code || error?.message || '');
    if (code.includes('RENTAL_NOT_FOUND')) return res.status(404).json({ error: 'RENTAL_NOT_FOUND' });
    if (code.includes('RENTAL_DELETE_TOO_MANY_LINKED_RECORDS')) return res.status(409).json({ error: 'RENTAL_DELETE_TOO_MANY_LINKED_RECORDS' });
    console.error('Rental deletion failed:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.delete('/api/rentals/invoices/:id', requireAuth, requireInternalAccount, requireAdministratorAccount, writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const invoiceId = asLimitedString(req.params.id, 180);
  const reason = asLimitedString(req.body?.reason, 1000);
  if (!invoiceId) return res.status(400).json({ error: 'INVALID_INVOICE_ID' });
  if (!reason) return res.status(400).json({ error: 'DELETE_REASON_REQUIRED' });

  const invoiceRef = firestoreDb.collection('rentalInvoices').doc(invoiceId);
  const auditRef = firestoreDb.collection('systemAuditLogs').doc();
  const { actorName, actorUid, actorRole } = rentalActor(req);
  const nowIso = new Date().toISOString();
  let deletedFinanceTransactionId = '';

  try {
    await firestoreDb.runTransaction(async (transaction) => {
      const invoiceSnap = await transaction.get(invoiceRef);
      if (!invoiceSnap.exists) {
        const error: any = new Error('INVOICE_NOT_FOUND'); error.code = 'INVOICE_NOT_FOUND'; throw error;
      }

      const invoiceData: any = invoiceSnap.data() || {};
      const financeTransactionId = asLimitedString(invoiceData.financeTransactionId, 180);
      let financeSnap: any = null;
      let financeRef: any = null;
      if (financeTransactionId) {
        financeRef = firestoreDb!.collection('financeTransactions').doc(financeTransactionId);
        financeSnap = await transaction.get(financeRef);
      }

      if (financeRef && financeSnap?.exists) {
        transaction.delete(financeRef);
        deletedFinanceTransactionId = financeTransactionId;
      }
      transaction.delete(invoiceRef);
      transaction.set(auditRef, {
        action: 'RENTAL_INVOICE_DELETED',
        entityType: 'rentalInvoice',
        entityId: invoiceId,
        actorUid, actorName, actorRole, createdAt: nowIso, immutable: true,
        summary: `Fatura ${asLimitedString(invoiceData.invoiceNumber, 180) || invoiceId} excluída por administrador`,
        metadata: {
          reason,
          invoiceNumber: asLimitedString(invoiceData.invoiceNumber, 180),
          rentalId: asLimitedString(invoiceData.rentalId, 180),
          rentalNumber: asLimitedString(invoiceData.rentalNumber, 180),
          clientName: asLimitedString(invoiceData.clientName, 240),
          total: Number(invoiceData.total || 0),
          financeTransactionId: deletedFinanceTransactionId || financeTransactionId || '',
        },
      });
    });

    return res.json({ success: true, deletedFinanceTransactionId: deletedFinanceTransactionId || undefined });
  } catch (error: any) {
    const code = String(error?.code || error?.message || '');
    console.error('Invoice deletion failed:', error);
    if (code.includes('INVOICE_NOT_FOUND')) return res.status(404).json({ error: 'INVOICE_NOT_FOUND' });
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.post('/api/rentals/contracts/:id/invoices', requireAuth, requireInternalAccount, requireEditModule('rental'), writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const rentalId = asLimitedString(req.params.id, 180);
  const manualInvoiceNumber = asLimitedString(req.body.invoiceNumber, 180);
  if (!manualInvoiceNumber) return res.status(400).json({ error: 'INVOICE_NUMBER_REQUIRED' });
  if (!rentalId) return res.status(400).json({ error: 'INVALID_RENTAL_DATA' });

  const rentalRef = firestoreDb.collection('rentalContracts').doc(rentalId);
  const rentalSnap = await rentalRef.get();
  if (!rentalSnap.exists) return res.status(404).json({ error: 'RENTAL_NOT_FOUND' });
  const rentalForCycle: any = rentalSnap.data() || {};
  if (!['ativo', 'encerrado'].includes(String(rentalForCycle.status))) return res.status(409).json({ error: 'RENTAL_NOT_ACTIVE' });

  const existingInvoices = await firestoreDb.collection('rentalInvoices').where('rentalId', '==', rentalId).get();
  const occupiedCycles = new Set(existingInvoices.docs.map((doc) => Number(doc.data()?.cycleIndex)).filter(Number.isFinite));
  let cycleIndex = 0;
  while (occupiedCycles.has(cycleIndex) && cycleIndex < 600) cycleIndex += 1;
  if (cycleIndex >= 600) return res.status(409).json({ error: 'RENTAL_BILLING_LIMIT_REACHED' });

  const dueDate = rentalAddDays(rentalForCycle.firstDueDate, cycleIndex * RENTAL_BILLING_DAYS);
  const periodStart = rentalAddDays(rentalForCycle.startDate, cycleIndex * RENTAL_BILLING_DAYS);
  const periodEnd = rentalAddDays(periodStart, RENTAL_BILLING_DAYS - 1);
  if (!dueDate || !periodStart || !periodEnd) return res.status(409).json({ error: 'INVALID_RENTAL_DATA' });

  const invoiceRef = firestoreDb.collection('rentalInvoices').doc(rentalInvoiceDocId(rentalId, dueDate));
  const financeRef = firestoreDb.collection('financeTransactions').doc(`rental_${invoiceRef.id}`);
  const settingsRef = firestoreDb.collection('systemSettings').doc('rentalBilling');
  const auditRef = firestoreDb.collection('systemAuditLogs').doc();
  const { actorName, actorUid, actorRole } = rentalActor(req);
  const nowIso = new Date().toISOString();
  const issueDate = nowIso.slice(0, 10);
  if (periodStart > issueDate) return res.status(409).json({ error: 'RENTAL_BILLING_CYCLE_NOT_STARTED' });
  let invoiceResult: any = null;

  try {
    await firestoreDb.runTransaction(async (transaction) => {
      const liveRentalSnap = await transaction.get(rentalRef);
      const settingsSnap = await transaction.get(settingsRef);
      const existingInvoiceSnap = await transaction.get(invoiceRef);
      if (!liveRentalSnap.exists || !['ativo', 'encerrado'].includes(String(liveRentalSnap.data()?.status))) {
        const error: any = new Error('RENTAL_NOT_ACTIVE'); error.code = 'RENTAL_NOT_ACTIVE'; throw error;
      }
      if (existingInvoiceSnap.exists) {
        const error: any = new Error('RENTAL_INVOICE_ALREADY_EXISTS'); error.code = 'RENTAL_INVOICE_ALREADY_EXISTS'; throw error;
      }
      const rental: any = liveRentalSnap.data() || {};
      const currentSettings = sanitizeRentalSettings(settingsSnap.exists ? settingsSnap.data() : {});
      if (!currentSettings.nextInvoiceNumber) {
        const error: any = new Error('RENTAL_INVOICE_SEQUENCE_NOT_CONFIGURED'); error.code = 'RENTAL_INVOICE_SEQUENCE_NOT_CONFIGURED'; throw error;
      }

      const billableItems = (Array.isArray(rental.items) ? rental.items : []).filter((item: any) => {
        const dispatchedAt = rentalDate(item.dispatchedAt || rental.dispatchAt || rental.startDate);
        const returnedAt = rentalDate(item.returnedAt);
        return !!dispatchedAt && dispatchedAt <= periodEnd && (!returnedAt || returnedAt >= periodStart);
      });
      if (billableItems.length === 0) {
        const error: any = new Error('RENTAL_NO_ACTIVE_ITEMS'); error.code = 'RENTAL_NO_ACTIVE_ITEMS'; throw error;
      }
      const lines = billableItems.map((item: any) => ({
        assetId: asLimitedString(item.assetId, 180),
        assetCode: asLimitedString(item.assetCode, 120),
        description: asLimitedString(item.description || 'Manômetro com base', 240),
        baseIdentification: asLimitedString(item.baseIdentification, 120),
        serviceId: asLimitedString(item.serviceId, 180),
        serviceName: asLimitedString(item.serviceName, 240),
        monthlyPrice: Number(Number(cycleIndex > 0 ? ((item.renewalPrice ?? item.monthlyPrice) || 0) : (item.monthlyPrice || 0)).toFixed(2)),
      }));
      const total = Number(lines.reduce((sum: number, line: any) => sum + Number(line.monthlyPrice || 0), 0).toFixed(2));
      if (total <= 0) {
        const error: any = new Error('RENTAL_NO_ACTIVE_ITEMS'); error.code = 'RENTAL_NO_ACTIVE_ITEMS'; throw error;
      }

      const sequenceNumber = currentSettings.nextInvoiceNumber;
      const invoiceNumber = manualInvoiceNumber;
      const paymentMethod = asLimitedString(rental.paymentMethod, 120) || currentSettings.paymentMethod;
      invoiceResult = {
        id: invoiceRef.id,
        invoiceNumber,
        invoiceSequenceNumber: sequenceNumber,
        rentalId,
        rentalNumber: rental.rentalNumber,
        cycleIndex,
        clientId: rental.clientId,
        clientName: rental.clientName,
        clientCnpj: rental.clientCnpj,
        clientAddress: rental.clientAddress || '',
        issueDate,
        periodStart,
        periodEnd,
        dueDate,
        lines,
        total,
        status: 'emitida',
        quotationRefs: rental.quotationRefs || '',
        purchaseOrder: rental.purchaseOrder || '',
        processNumber: rental.processNumber || '',
        project: rental.project || '',
        responsibles: rental.responsibles || '',
        paymentMethod,
        cnaeCode: currentSettings.cnaeCode,
        cnaeDescription: currentSettings.cnaeDescription,
        bankInstructions: currentSettings.bankInstructions,
        taxNotes: currentSettings.taxNotes,
        billingNotes: rental.billingNotes || '',
        financeTransactionId: financeRef.id,
        createdAt: nowIso,
        createdBy: actorName,
        createdByUid: actorUid,
      };

      const financeStatus = dueDate < issueDate ? 'atrasado' : 'pendente';
      const financeData = {
        type: 'receita',
        description: `Locação mensal ${rental.rentalNumber} - ${rental.clientName}`,
        amount: total,
        grossAmount: total,
        retentions: 0,
        paidAmount: 0,
        openBalance: total,
        settlements: [],
        date: issueDate,
        dueDate,
        status: financeStatus,
        category: 'Locação de Instrumentos',
        costCenter: 'Locação',
        contractId: rentalId,
        contractNumber: rental.rentalNumber,
        contractClientName: rental.clientName,
        bankAccount: currentSettings.bankInstructions,
        paymentMethod,
        contactName: rental.clientName,
        contactDocument: rental.clientCnpj,
        documentNumber: invoiceNumber,
        notes: `Fatura de locação ${invoiceNumber}. Período ${periodStart} a ${periodEnd}.`,
        createdAt: nowIso,
        updatedAt: nowIso,
        createdBy: actorName,
        createdByUid: actorUid,
        isDeleted: false,
      };

      transaction.create(invoiceRef, invoiceResult);
      transaction.create(financeRef, financeData);
      transaction.set(settingsRef, {
        ...currentSettings,
        nextInvoiceNumber: sequenceNumber + 1,
        updatedAt: nowIso,
        updatedBy: actorName,
        updatedByUid: actorUid,
      }, { merge: true });
      transaction.set(auditRef, {
        action: 'RENTAL_INVOICE_ISSUED', entityType: 'rentalInvoice', entityId: invoiceRef.id,
        actorUid, actorName, actorRole, createdAt: nowIso, immutable: true,
        summary: `Fatura ${invoiceNumber} emitida para ${rental.clientName}`,
        metadata: { rentalId, rentalNumber: rental.rentalNumber, cycleIndex, periodStart, periodEnd, dueDate, total, financeTransactionId: financeRef.id },
      });
    });

    return res.status(201).json({ success: true, invoice: invoiceResult, financeTransactionId: financeRef.id });
  } catch (error: any) {
    const code = String(error?.code || error?.message || '');
    if (code.includes('RENTAL_INVOICE_SEQUENCE_NOT_CONFIGURED')) return res.status(409).json({ error: 'RENTAL_INVOICE_SEQUENCE_NOT_CONFIGURED' });
    if (code.includes('RENTAL_INVOICE_ALREADY_EXISTS')) return res.status(409).json({ error: 'RENTAL_INVOICE_ALREADY_EXISTS' });
    if (code.includes('RENTAL_NO_ACTIVE_ITEMS')) return res.status(409).json({ error: 'RENTAL_NO_ACTIVE_ITEMS' });
    if (code.includes('RENTAL_NOT_ACTIVE')) return res.status(409).json({ error: 'RENTAL_NOT_ACTIVE' });
    console.error('Rental invoice generation failed:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.post('/api/finance/transactions/:id/settle', requireAuth, requireInternalAccount, requireEditModule('finance'), writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const transactionId = asLimitedString(req.params.id, 180);
  const settlementAmount = normalizeFinanceAmount(req.body?.amount);
  const settlementDate = normalizeFinanceDate(req.body?.date);
  const bankAccount = asLimitedString(req.body?.bankAccount, 180);
  const paymentMethod = asLimitedString(req.body?.paymentMethod, 120);
  const notes = asLimitedString(req.body?.notes, 1000);
  if (!transactionId || settlementAmount === null || settlementAmount <= 0 || !settlementDate) {
    return res.status(400).json({ error: 'INVALID_FINANCE_SETTLEMENT' });
  }

  const ref = firestoreDb.collection('financeTransactions').doc(transactionId);
  const auditRef = firestoreDb.collection('systemAuditLogs').doc();
  const nowIso = new Date().toISOString();
  const actorName = asLimitedString(req.user?.name || req.user?.username || req.user?.email, 160) || 'Usuário interno';
  const actorUid = asLimitedString(req.user?.uid, 160);
  const actorRole = asLimitedString(req.user?.permissionLevel || req.user?.role, 100);
  let result = { paidAmount: 0, openBalance: 0, status: 'pendente' };

  try {
    await firestoreDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists || snap.data()?.isDeleted === true) {
        const error: any = new Error('TRANSACTION_NOT_FOUND'); error.code = 'TRANSACTION_NOT_FOUND'; throw error;
      }
      const before: any = snap.data() || {};
      if (before.status === 'cancelado') {
        const error: any = new Error('TRANSACTION_CANCELLED'); error.code = 'TRANSACTION_CANCELLED'; throw error;
      }
      const originalAmount = Math.max(0, Number(before.amount || 0));
      const currentPaid = Math.max(0, Number(before.paidAmount || 0));
      const currentOpen = Math.max(0, Number.isFinite(Number(before.openBalance)) ? Number(before.openBalance) : originalAmount - currentPaid);
      if (settlementAmount > currentOpen + 0.00001) {
        const error: any = new Error('SETTLEMENT_EXCEEDS_BALANCE'); error.code = 'SETTLEMENT_EXCEEDS_BALANCE'; throw error;
      }
      const nextPaid = Math.min(originalAmount, Number((currentPaid + settlementAmount).toFixed(2)));
      const nextOpen = Math.max(0, Number((originalAmount - nextPaid).toFixed(2)));
      const dueDate = normalizeFinanceDate(before.dueDate);
      const today = financeBusinessDate();
      const nextStatus = nextOpen <= 0 ? 'pago' : (dueDate && dueDate < today ? 'atrasado' : 'pendente');
      const settlement = {
        id: `sett_${Date.now()}_${randomBytes(3).toString('hex')}`,
        amount: Number(settlementAmount.toFixed(2)),
        date: settlementDate,
        bankAccount,
        paymentMethod,
        notes,
        createdAt: nowIso,
        createdBy: actorName,
        createdByUid: actorUid,
      };
      const existingSettlements = Array.isArray(before.settlements) ? before.settlements.slice(-199) : [];
      transaction.update(ref, {
        amount: originalAmount,
        paidAmount: nextPaid,
        openBalance: nextOpen,
        status: nextStatus,
        settlements: [...existingSettlements, settlement],
        ...(bankAccount ? { bankAccount } : {}),
        ...(paymentMethod ? { paymentMethod } : {}),
        updatedAt: nowIso,
        updatedBy: actorName,
        updatedByUid: actorUid,
      });
      transaction.set(auditRef, {
        action: before.type === 'receita' ? 'FINANCE_RECEIPT_RECORDED' : 'FINANCE_PAYMENT_RECORDED',
        entityType: 'financeTransaction', entityId: transactionId,
        actorUid, actorName, actorRole, createdAt: nowIso, immutable: true,
        summary: `Baixa financeira de R$ ${settlementAmount.toFixed(2)}`,
        metadata: { previousOpenBalance: currentOpen, settlementAmount, openBalance: nextOpen, settlementDate, bankAccount, paymentMethod },
      });
      result = { paidAmount: nextPaid, openBalance: nextOpen, status: nextStatus };
    });
    return res.json({ success: true, ...result });
  } catch (error: any) {
    const code = String(error?.code || error?.message || '');
    if (code.includes('TRANSACTION_NOT_FOUND')) return res.status(404).json({ error: 'TRANSACTION_NOT_FOUND' });
    if (code.includes('SETTLEMENT_EXCEEDS_BALANCE')) return res.status(409).json({ error: 'SETTLEMENT_EXCEEDS_BALANCE' });
    if (code.includes('TRANSACTION_CANCELLED')) return res.status(409).json({ error: 'TRANSACTION_CANCELLED' });
    console.error('Finance settlement failed:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.post('/api/finance/transactions/import', requireAuth, requireInternalAccount, requireEditModule('finance'), writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
  if (rawItems.length === 0 || rawItems.length > 1000) return res.status(400).json({ error: 'INVALID_IMPORT_SIZE' });

  const actorName = asLimitedString(req.user?.name || req.user?.username || req.user?.email, 160) || 'Usuário interno';
  const actorUid = asLimitedString(req.user?.uid, 160);
  const actorRole = asLimitedString(req.user?.permissionLevel || req.user?.role, 100);
  const nowIso = new Date().toISOString();
  const errors: Array<{ row: number; message: string }> = [];
  const normalized: Array<{ ref: any; data: Record<string, any> }> = [];
  let skipped = 0;

  rawItems.forEach((item: any, index: number) => {
    const row = index + 2;
    // Arquivos exportados carregam o ID do registro existente. Como a carga
    // em lote é create-only, uma linha com ID nunca é duplicada nem sobrescrita.
    if (asLimitedString(item?.sourceRecordId, 180)) {
      skipped += 1;
      return;
    }
    const type = item?.type === 'receita' || item?.type === 'despesa' ? item.type : '';
    const description = asLimitedString(item?.description, 500);
    const amount = normalizeFinanceAmount(item?.amount);
    const date = normalizeFinanceDate(item?.date);
    const dueDate = normalizeFinanceDate(item?.dueDate || item?.date);
    if (!type || !description || amount === null || amount <= 0 || !date || !dueDate) {
      errors.push({ row, message: 'Tipo, descrição, valor, data e vencimento são obrigatórios e devem ser válidos.' });
      return;
    }
    const grossAmountRaw = normalizeFinanceAmount(item?.grossAmount);
    const retentionsRaw = normalizeFinanceAmount(item?.retentions);
    const informedRetentions = retentionsRaw !== null && retentionsRaw >= 0 ? retentionsRaw : 0;
    const grossAmount = grossAmountRaw !== null && grossAmountRaw >= amount ? grossAmountRaw : amount + informedRetentions;
    const retentions = grossAmountRaw !== null
      ? Math.max(0, Number((grossAmount - amount).toFixed(2)))
      : Number(informedRetentions.toFixed(2));
    const requestedStatus = ['pendente', 'pago', 'atrasado', 'cancelado'].includes(String(item?.status || '').toLowerCase()) ? String(item.status).toLowerCase() : 'pendente';
    const paidRaw = normalizeFinanceAmount(item?.paidAmount);
    const paidAmount = requestedStatus === 'pago' ? amount : Math.max(0, Math.min(amount, paidRaw || 0));
    const settlementDate = normalizeFinanceDate(item?.settlementDate);
    if (paidAmount > 0 && !settlementDate) {
      errors.push({ row, message: 'Data da Baixa é obrigatória quando houver Valor Baixado ou status Pago.' });
      return;
    }
    const openBalance = Math.max(0, Number((amount - paidAmount).toFixed(2)));
    const status = requestedStatus === 'cancelado' ? 'cancelado' : openBalance <= 0 ? 'pago' : requestedStatus === 'atrasado' ? 'atrasado' : 'pendente';
    const fingerprintSource = [
      type, description.toLowerCase(), amount.toFixed(2), date, dueDate,
      asLimitedString(item?.documentNumber, 160).toLowerCase(),
      asLimitedString(item?.contactDocument, 40).replace(/\D/g, ''),
      asLimitedString(item?.contactName, 240).toLowerCase(),
      asLimitedString(item?.contractNumber, 160).toLowerCase(),
      asLimitedString(item?.category, 160).toLowerCase(),
      asLimitedString(item?.costCenter, 180).toLowerCase(),
      asLimitedString(item?.bankAccount, 180).toLowerCase(),
    ].join('|');
    const fingerprint = createHash('sha256').update(fingerprintSource).digest('hex');
    const ref = firestoreDb.collection('financeTransactions').doc(`finimp_${fingerprint.slice(0, 40)}`);
    normalized.push({
      ref,
      data: {
        type, description, amount: Number(amount.toFixed(2)), grossAmount: Number(grossAmount.toFixed(2)), retentions: Number(retentions.toFixed(2)),
        paidAmount: Number(paidAmount.toFixed(2)), openBalance, status, date, dueDate,
        category: asLimitedString(item?.category, 160), costCenter: asLimitedString(item?.costCenter, 180),
        contractId: asLimitedString(item?.contractId, 180), contractNumber: asLimitedString(item?.contractNumber, 180), contractClientName: asLimitedString(item?.contractClientName, 180),
        bankAccount: asLimitedString(item?.bankAccount, 180), paymentMethod: asLimitedString(item?.paymentMethod, 120),
        contactName: asLimitedString(item?.contactName, 240), contactDocument: asLimitedString(item?.contactDocument, 60), documentNumber: asLimitedString(item?.documentNumber, 160),
        notes: asLimitedString(item?.notes, 2000), settlements: paidAmount > 0 ? [{ id: `import_${fingerprint.slice(0, 12)}`, amount: Number(paidAmount.toFixed(2)), date: settlementDate!, bankAccount: asLimitedString(item?.bankAccount, 180), paymentMethod: asLimitedString(item?.paymentMethod, 120), notes: 'Baixa informada na importação', createdAt: nowIso, createdBy: actorName, createdByUid: actorUid }] : [],
        importFingerprint: fingerprint, importedAt: nowIso, importedBy: actorName,
        createdAt: nowIso, updatedAt: nowIso, createdBy: actorName, createdByUid: actorUid, isDeleted: false,
      },
    });
  });

  if (normalized.length === 0 && skipped === 0) return res.status(400).json({ error: 'NO_VALID_ROWS', errors });

  let imported = 0;
  try {
    for (let offset = 0; offset < normalized.length; offset += 200) {
      const chunk = normalized.slice(offset, offset + 200);
      const existing = await firestoreDb.getAll(...chunk.map((entry) => entry.ref));
      const batch = firestoreDb.batch();
      let chunkWrites = 0;
      chunk.forEach((entry, index) => {
        if (existing[index]?.exists) {
          skipped += 1;
        } else {
          batch.create(entry.ref, entry.data);
          chunkWrites += 1;
        }
      });
      if (chunkWrites > 0) {
        await batch.commit();
        imported += chunkWrites;
      }
    }
    const auditRef = firestoreDb.collection('systemAuditLogs').doc();
    await auditRef.set({
      action: 'FINANCE_XLS_IMPORT', entityType: 'financeTransactionImport', entityId: auditRef.id,
      actorUid, actorName, actorRole, createdAt: nowIso, immutable: true,
      summary: `Importação financeira: ${imported} incluído(s), ${skipped} duplicado(s), ${errors.length} erro(s)`,
      metadata: { receivedRows: rawItems.length, imported, skipped, errors: errors.slice(0, 50) },
    });
    return res.json({ success: true, imported, skipped, errors });
  } catch (error) {
    console.error('Finance XLS import failed:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', imported, skipped, errors });
  }
});


app.post('/api/finance/module-import', requireAuth, requireInternalAccount, requireEditModule('finance'), writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const entity = asLimitedString(req.body?.entity, 40);
  const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
  const allowedEntities = new Set(['contracts', 'measurements', 'bankAccounts', 'categories']);
  if (!allowedEntities.has(entity)) return res.status(400).json({ error: 'INVALID_FINANCE_IMPORT_ENTITY' });
  if (rawItems.length === 0 || rawItems.length > 1000) return res.status(400).json({ error: 'INVALID_IMPORT_SIZE' });

  const actorName = asLimitedString(req.user?.name || req.user?.username || req.user?.email, 160) || 'Usuário interno';
  const actorUid = asLimitedString(req.user?.uid, 160);
  const actorRole = asLimitedString(req.user?.permissionLevel || req.user?.role, 100);
  const nowIso = new Date().toISOString();
  const errors: Array<{ row: number; message: string }> = [];

  const normalizeKey = (value: unknown) => asLimitedString(value, 300).trim().toLocaleLowerCase('pt-BR');
  const existingKeys = new Set<string>();
  const pendingKeys = new Set<string>();
  let targetCollection = '';

  if (entity === 'contracts') targetCollection = 'financeContracts';
  else if (entity === 'measurements') targetCollection = 'financeMeasurements';
  else if (entity === 'bankAccounts') targetCollection = 'financeBankAccounts';
  else targetCollection = 'financeCategories';

  try {
    const existingSnapshot = await firestoreDb.collection(targetCollection).get();
    existingSnapshot.docs.forEach((docSnap) => {
      const data: any = docSnap.data() || {};
      // Registros arquivados também reservam sua chave histórica. A importação
      // nunca ressuscita ou duplica silenciosamente um cadastro arquivado.
      if (entity === 'contracts') {
        const key = normalizeKey(data.contractNumber);
        if (key) existingKeys.add(key);
      } else if (entity === 'measurements') {
        const key = [normalizeKey(data.contractNumber), normalizeKey(data.period), normalizeKey(data.type), Number(data.value || 0).toFixed(2), normalizeFinanceDate(data.sendDate), normalizeKey(data.invoiceNumber)].join('|');
        existingKeys.add(key);
      } else if (entity === 'bankAccounts') {
        const key = [normalizeKey(data.bank), normalizeKey(data.agency), normalizeKey(data.account)].join('|');
        existingKeys.add(key);
      } else {
        const key = normalizeKey(data.code);
        if (key) existingKeys.add(key);
      }
    });

    const contractIdByNumber = new Map<string, string>();
    if (entity === 'measurements') {
      const contractsSnapshot = await firestoreDb.collection('financeContracts').get();
      contractsSnapshot.docs.forEach((docSnap) => {
        const data: any = docSnap.data() || {};
        if (data.isDeleted === true) return;
        const key = normalizeKey(data.contractNumber);
        if (key && !contractIdByNumber.has(key)) contractIdByNumber.set(key, docSnap.id);
      });
    }

    const normalized: Array<{ ref: any; data: Record<string, any>; key: string }> = [];
    let skipped = 0;

    rawItems.forEach((item: any, index: number) => {
      const row = index + 2;
      // Exportações incluem o ID Sistema. Esta importação é create-only:
      // linhas já vinculadas a um registro existente são ignoradas, nunca
      // usadas para sobrescrever dados em lote.
      if (asLimitedString(item?.sourceRecordId, 180)) {
        skipped += 1;
        return;
      }
      let key = '';
      let data: Record<string, any> | null = null;

      if (entity === 'contracts') {
        const clientName = asLimitedString(item?.clientName, 240);
        const contractNumber = asLimitedString(item?.contractNumber, 160);
        const description = asLimitedString(item?.description, 1000);
        const value = normalizeFinanceAmount(item?.value);
        const startDate = normalizeFinanceDate(item?.startDate);
        const endDate = normalizeFinanceDate(item?.endDate);
        const status = ['ativo', 'encerrado', 'suspenso'].includes(String(item?.status || '')) ? String(item.status) : 'ativo';
        const costCenter = asLimitedString(item?.costCenter || contractNumber, 180);
        if (!clientName || !contractNumber || value === null || value <= 0 || !startDate || !endDate || endDate < startDate) {
          errors.push({ row, message: 'Cliente, número do contrato, valor positivo e vigência válida são obrigatórios.' });
          return;
        }
        key = normalizeKey(contractNumber);
        data = {
          clientId: asLimitedString(item?.clientId, 180) || 'manual', clientName, contractNumber, description,
          value: Number(value.toFixed(2)), startDate, endDate, status, costCenter,
          createdAt: nowIso, updatedAt: nowIso, createdBy: actorName, createdByUid: actorUid,
          importFingerprint: createHash('sha256').update(`contract|${key}`).digest('hex'), importedAt: nowIso, importedBy: actorName,
          isDeleted: false,
        };
      } else if (entity === 'measurements') {
        const contractNumber = asLimitedString(item?.contractNumber, 160);
        const clientName = asLimitedString(item?.clientName, 240);
        const period = asLimitedString(item?.period, 160);
        const type = asLimitedString(item?.type, 160) || 'Calibração';
        const value = normalizeFinanceAmount(item?.value);
        const status = ['em_analise', 'aprovada', 'faturada', 'cancelada'].includes(String(item?.status || '')) ? String(item.status) : 'em_analise';
        const sendDate = normalizeFinanceDate(item?.sendDate);
        const invoiceNumber = asLimitedString(item?.invoiceNumber, 160);
        if (!contractNumber || !clientName || !period || value === null || value <= 0 || !sendDate) {
          errors.push({ row, message: 'Contrato, cliente, período, valor positivo e data de envio são obrigatórios.' });
          return;
        }
        key = [normalizeKey(contractNumber), normalizeKey(period), normalizeKey(type), Number(value).toFixed(2), sendDate, normalizeKey(invoiceNumber)].join('|');
        data = {
          contractId: contractIdByNumber.get(normalizeKey(contractNumber)) || asLimitedString(item?.contractId, 180) || 'manual',
          contractNumber, clientName, period, type, value: Number(value.toFixed(2)), status, sendDate,
          ...(invoiceNumber ? { invoiceNumber } : {}),
          createdAt: nowIso, updatedAt: nowIso, createdBy: actorName, createdByUid: actorUid,
          importFingerprint: createHash('sha256').update(`measurement|${key}`).digest('hex'), importedAt: nowIso, importedBy: actorName,
          isDeleted: false,
        };
      } else if (entity === 'bankAccounts') {
        const bank = asLimitedString(item?.bank, 180);
        const agency = asLimitedString(item?.agency, 80);
        const account = asLimitedString(item?.account, 100);
        const type = asLimitedString(item?.type, 100) || 'Corrente';
        const balanceRaw = normalizeFinanceAmount(item?.balance);
        const balance = balanceRaw === null ? 0 : Number(balanceRaw.toFixed(2));
        if (!bank || !account) {
          errors.push({ row, message: 'Banco e Conta são obrigatórios.' });
          return;
        }
        key = [normalizeKey(bank), normalizeKey(agency), normalizeKey(account)].join('|');
        data = {
          bank, agency, account, type, balance,
          createdAt: nowIso, updatedAt: nowIso, createdBy: actorName, createdByUid: actorUid,
          importFingerprint: createHash('sha256').update(`bank|${key}`).digest('hex'), importedAt: nowIso, importedBy: actorName,
          isDeleted: false,
        };
      } else {
        const code = asLimitedString(item?.code, 80);
        const name = asLimitedString(item?.name, 240);
        const type = asLimitedString(item?.type, 120) || 'Despesa Indireta';
        const status = asLimitedString(item?.status, 60) || 'Ativo';
        if (!code || !name) {
          errors.push({ row, message: 'Código e Nome são obrigatórios.' });
          return;
        }
        key = normalizeKey(code);
        data = {
          code, name, type, status,
          createdAt: nowIso, updatedAt: nowIso, createdBy: actorName, createdByUid: actorUid,
          importFingerprint: createHash('sha256').update(`category|${key}`).digest('hex'), importedAt: nowIso, importedBy: actorName,
          isDeleted: false,
        };
      }

      if (!key || !data) {
        errors.push({ row, message: 'Não foi possível determinar a chave do registro.' });
        return;
      }
      if (existingKeys.has(key) || pendingKeys.has(key)) {
        skipped += 1;
        return;
      }
      pendingKeys.add(key);
      const fingerprint = createHash('sha256').update(`${entity}|${key}`).digest('hex');
      const ref = firestoreDb.collection(targetCollection).doc(`finimp_${fingerprint.slice(0, 40)}`);
      normalized.push({ ref, data, key });
    });

    let imported = 0;
    for (let offset = 0; offset < normalized.length; offset += 200) {
      const chunk = normalized.slice(offset, offset + 200);
      const batch = firestoreDb.batch();
      chunk.forEach((entry) => batch.create(entry.ref, entry.data));
      if (chunk.length > 0) {
        await batch.commit();
        imported += chunk.length;
      }
    }

    const auditRef = firestoreDb.collection('systemAuditLogs').doc();
    await auditRef.set({
      action: 'FINANCE_MODULE_XLS_IMPORT', entityType: `finance:${entity}`, entityId: auditRef.id,
      actorUid, actorName, actorRole, createdAt: nowIso, immutable: true,
      summary: `Importação ${entity}: ${imported} incluído(s), ${skipped} duplicado(s), ${errors.length} erro(s)`,
      metadata: { entity, receivedRows: rawItems.length, imported, skipped, errors: errors.slice(0, 50) },
    });
    return res.json({ success: true, imported, skipped, errors });
  } catch (error) {
    console.error('Finance module XLS import failed:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', imported: 0, skipped: 0, errors });
  }
});


app.post('/api/finance/operations', requireAuth, requireInternalAccount, requireEditModule('finance'), writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  try {
    const result = await createFinanceOperationRecord(req.body || {}, financeActor(req));
    return res.status(201).json({ success: true, ...result });
  } catch (error: any) {
    const code = String(error?.code || error?.message || '');
    if (code.includes('INVALID_FINANCE_OPERATION')) return res.status(400).json({ error: 'INVALID_FINANCE_OPERATION', message: code.split(':').slice(1).join(':') || undefined });
    if (code.includes('FINANCE_OPERATION_DUPLICATE')) return res.status(409).json({ error: 'FINANCE_OPERATION_DUPLICATE' });
    console.error('Finance operation create failed:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.put('/api/finance/operations/:id', requireAuth, requireInternalAccount, requireEditModule('finance'), writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const id = asLimitedString(req.params.id, 180);
  if (!id) return res.status(400).json({ error: 'INVALID_FINANCE_OPERATION' });
  const ref = firestoreDb.collection('financeOperations').doc(id);
  const auditRef = firestoreDb.collection('systemAuditLogs').doc();
  const nowIso = new Date().toISOString();
  const actor = financeActor(req);
  try {
    await firestoreDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists || snap.data()?.isDeleted === true) {
        const err: any = new Error('FINANCE_OPERATION_NOT_FOUND'); err.code = 'FINANCE_OPERATION_NOT_FOUND'; throw err;
      }
      const before: any = snap.data() || {};
      const linkedIds = Array.isArray(before.financeTransactionIds) ? before.financeTransactionIds.filter(Boolean) : [];
      let updates: Record<string, any>;
      if (linkedIds.length > 0) {
        const forbiddenKeys = ['kind', 'amount', 'date', 'dueDate', 'category', 'costCenter', 'bankAccount', 'contactName', 'contactDocument', 'documentNumber', 'details', 'approvalStatus'];
        if (forbiddenKeys.some(key => Object.prototype.hasOwnProperty.call(req.body || {}, key))) {
          const err: any = new Error('FINANCE_OPERATION_LOCKED'); err.code = 'FINANCE_OPERATION_LOCKED'; throw err;
        }
        updates = {
          description: asLimitedString(req.body?.description ?? before.description, 1500),
          updatedAt: nowIso, updatedBy: actor.actorName, updatedByUid: actor.actorUid,
        };
      } else {
        const normalized = normalizeFinanceOperationInput({ ...before, ...(req.body || {}), details: { ...(before.details || {}), ...(req.body?.details || {}) } }, before);
        if (!normalized.data) {
          const err: any = new Error(`INVALID_FINANCE_OPERATION:${normalized.error || ''}`); err.code = 'INVALID_FINANCE_OPERATION'; throw err;
        }
        updates = {
          ...normalized.data,
          financeTransactionIds: linkedIds,
          updatedAt: nowIso, updatedBy: actor.actorName, updatedByUid: actor.actorUid,
        };
      }
      transaction.update(ref, updates);
      transaction.set(auditRef, {
        action: 'FINANCE_OPERATION_UPDATED', entityType: 'financeOperation', entityId: id,
        actorUid: actor.actorUid, actorName: actor.actorName, actorRole: actor.actorRole,
        createdAt: nowIso, immutable: true, summary: `Operação financeira atualizada: ${before.title || id}`,
        metadata: { kind: before.kind, locked: linkedIds.length > 0 },
      });
    });
    return res.json({ success: true });
  } catch (error: any) {
    const code = String(error?.code || error?.message || '');
    if (code.includes('FINANCE_OPERATION_NOT_FOUND')) return res.status(404).json({ error: 'FINANCE_OPERATION_NOT_FOUND' });
    if (code.includes('FINANCE_OPERATION_LOCKED')) return res.status(409).json({ error: 'FINANCE_OPERATION_LOCKED' });
    if (code.includes('INVALID_FINANCE_OPERATION')) return res.status(400).json({ error: 'INVALID_FINANCE_OPERATION', message: code.split(':').slice(1).join(':') || undefined });
    console.error('Finance operation update failed:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.post('/api/finance/operations/:id/decision', requireAuth, requireInternalAccount, requireEditModule('finance'), writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const id = asLimitedString(req.params.id, 180);
  const decision = asLimitedString(req.body?.decision, 20).toLowerCase();
  if (!id || !['aprovar', 'rejeitar'].includes(decision)) return res.status(400).json({ error: 'INVALID_FINANCE_OPERATION' });
  const ref = firestoreDb.collection('financeOperations').doc(id);
  const txRef = firestoreDb.collection('financeTransactions').doc(`finop_${id}_reembolso`.slice(0, 180));
  const auditRef = firestoreDb.collection('systemAuditLogs').doc();
  const actor = financeActor(req);
  const nowIso = new Date().toISOString();
  let financeTransactionIds: string[] = [];
  try {
    await firestoreDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists || snap.data()?.isDeleted === true) {
        const err: any = new Error('FINANCE_OPERATION_NOT_FOUND'); err.code = 'FINANCE_OPERATION_NOT_FOUND'; throw err;
      }
      const before: any = snap.data() || {};
      if (before.kind !== 'reembolso' || before.approvalStatus !== 'pendente') {
        const err: any = new Error('FINANCE_OPERATION_ALREADY_DECIDED'); err.code = 'FINANCE_OPERATION_ALREADY_DECIDED'; throw err;
      }
      if (decision === 'aprovar') {
        const amount = Math.max(0, Number(before.amount || 0));
        const today = financeBusinessDate();
        const settlementIds = Array.isArray(before.financeTransactionIds) ? before.financeTransactionIds.filter(Boolean) : [];
        if (settlementIds.length === 0) {
          const existingTx = await transaction.get(txRef);
          if (!existingTx.exists) {
            transaction.create(txRef, {
              type: 'despesa', description: before.title, amount, grossAmount: amount, retentions: 0,
              paidAmount: 0, openBalance: amount, settlements: [], date: before.date, dueDate: before.dueDate,
              status: before.dueDate && before.dueDate < today ? 'atrasado' : 'pendente',
              category: before.category || 'Reembolsos', costCenter: before.costCenter || 'Administrativo',
              contractId: '', contractNumber: '', contractClientName: '', bankAccount: before.bankAccount || '', paymentMethod: '',
              contactName: before.contactName || before.details?.employee || '', contactDocument: before.contactDocument || '',
              documentNumber: before.documentNumber || '', recurrence: 'none', installments: 1, currentInstallment: 1,
              notes: before.description || before.details?.purpose || '',
              createdAt: nowIso, updatedAt: nowIso, createdBy: actor.actorName, createdByUid: actor.actorUid,
              updatedBy: actor.actorName, updatedByUid: actor.actorUid, sourceFinanceOperationId: id, isDeleted: false,
            });
          }
          financeTransactionIds = [txRef.id];
        } else {
          financeTransactionIds = settlementIds;
        }
        transaction.update(ref, {
          approvalStatus: 'aprovado', status: 'aprovado', financeTransactionIds,
          updatedAt: nowIso, updatedBy: actor.actorName, updatedByUid: actor.actorUid,
          decidedAt: nowIso, decidedBy: actor.actorName, decidedByUid: actor.actorUid,
        });
      } else {
        transaction.update(ref, {
          approvalStatus: 'rejeitado', status: 'rejeitado',
          updatedAt: nowIso, updatedBy: actor.actorName, updatedByUid: actor.actorUid,
          decidedAt: nowIso, decidedBy: actor.actorName, decidedByUid: actor.actorUid,
        });
      }
      transaction.set(auditRef, {
        action: decision === 'aprovar' ? 'FINANCE_OPERATION_APPROVED' : 'FINANCE_OPERATION_REJECTED',
        entityType: 'financeOperation', entityId: id,
        actorUid: actor.actorUid, actorName: actor.actorName, actorRole: actor.actorRole,
        createdAt: nowIso, immutable: true, summary: `${decision === 'aprovar' ? 'Aprovado' : 'Rejeitado'}: ${before.title}`,
        metadata: { kind: before.kind, amount: before.amount, financeTransactionIds },
      });
    });
    return res.json({ success: true, financeTransactionIds });
  } catch (error: any) {
    const code = String(error?.code || error?.message || '');
    if (code.includes('FINANCE_OPERATION_NOT_FOUND')) return res.status(404).json({ error: 'FINANCE_OPERATION_NOT_FOUND' });
    if (code.includes('FINANCE_OPERATION_ALREADY_DECIDED')) return res.status(409).json({ error: 'FINANCE_OPERATION_ALREADY_DECIDED' });
    console.error('Finance operation decision failed:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.post('/api/finance/operations/import', requireAuth, requireInternalAccount, requireEditModule('finance'), writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
  if (rawItems.length === 0 || rawItems.length > 200) return res.status(400).json({ error: 'INVALID_FINANCE_OPERATION_IMPORT' });
  const actor = financeActor(req);
  const errors: Array<{ row: number; message: string }> = [];
  let imported = 0;
  let skipped = 0;
  for (let index = 0; index < rawItems.length; index += 1) {
    const row = index + 2;
    const item = rawItems[index] || {};
    if (asLimitedString(item?.sourceRecordId, 180)) { skipped += 1; continue; }
    const normalized = normalizeFinanceOperationInput(item);
    if (!normalized.data) { errors.push({ row, message: normalized.error || 'Dados inválidos.' }); continue; }
    const fingerprint = createHash('sha256').update(JSON.stringify(normalized.data)).digest('hex');
    const refId = `finop_${fingerprint.slice(0, 40)}`;
    try {
      const exists = await firestoreDb.collection('financeOperations').doc(refId).get();
      if (exists.exists) { skipped += 1; continue; }
      await createFinanceOperationRecord(item, actor, { refId, importFingerprint: fingerprint, imported: true });
      imported += 1;
    } catch (error: any) {
      const code = String(error?.code || error?.message || '');
      if (code.includes('FINANCE_OPERATION_DUPLICATE')) skipped += 1;
      else errors.push({ row, message: code.includes('INVALID_FINANCE_OPERATION') ? (code.split(':').slice(1).join(':') || 'Dados inválidos.') : 'Falha ao importar o registro.' });
    }
  }
  const nowIso = new Date().toISOString();
  await firestoreDb.collection('systemAuditLogs').add({
    action: 'FINANCE_OPERATION_XLS_IMPORT', entityType: 'financeOperationImport', entityId: `import_${Date.now()}`,
    actorUid: actor.actorUid, actorName: actor.actorName, actorRole: actor.actorRole,
    createdAt: nowIso, immutable: true,
    summary: `Importação de rotinas financeiras: ${imported} incluído(s), ${skipped} ignorado(s), ${errors.length} erro(s)`,
    metadata: { receivedRows: rawItems.length, imported, skipped, errors: errors.slice(0, 50) },
  });
  return res.json({ success: true, imported, skipped, errors });
});

app.post('/api/finance/reconciliation/import', requireAuth, requireInternalAccount, requireEditModule('finance'), writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const bankAccountId = asLimitedString(req.body?.bankAccountId, 180);
  const bankAccountLabel = asLimitedString(req.body?.bankAccountLabel, 240);
  const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
  const endingBalanceRaw = normalizeFinanceAmount(req.body?.endingBalance);
  if (!bankAccountId || !bankAccountLabel || rawItems.length === 0 || rawItems.length > 1000) return res.status(400).json({ error: 'INVALID_BANK_STATEMENT' });
  const bankRef = firestoreDb.collection('financeBankAccounts').doc(bankAccountId);
  const bankSnap = await bankRef.get();
  if (!bankSnap.exists || bankSnap.data()?.isDeleted === true) return res.status(404).json({ error: 'BANK_ACCOUNT_NOT_FOUND' });
  const actor = financeActor(req);
  const nowIso = new Date().toISOString();
  const normalized: Array<{ ref: any; data: Record<string, any> }> = [];
  for (const raw of rawItems) {
    const date = normalizeFinanceDate(raw?.date);
    const description = asLimitedString(raw?.description, 500);
    const amount = normalizeFinanceAmount(raw?.amount);
    const externalId = asLimitedString(raw?.externalId, 180);
    const documentNumber = asLimitedString(raw?.documentNumber, 120);
    if (!date || !description || amount === null || Math.abs(amount) < 0.00001) continue;
    const fingerprint = createHash('sha256').update([bankAccountId, date, Number(amount).toFixed(2), externalId, description].join('|')).digest('hex');
    const ref = firestoreDb.collection('financeBankStatementItems').doc(`fstmt_${fingerprint.slice(0, 40)}`);
    normalized.push({ ref, data: {
      bankAccountId, bankAccountLabel, date, description, amount: Number(amount.toFixed(2)), externalId, documentNumber,
      status: 'pendente', importFingerprint: fingerprint, importedAt: nowIso, importedBy: actor.actorName,
      createdAt: nowIso, updatedAt: nowIso, isDeleted: false,
    } });
  }
  if (normalized.length === 0) return res.status(400).json({ error: 'INVALID_BANK_STATEMENT' });
  let imported = 0; let skipped = 0;
  for (let offset = 0; offset < normalized.length; offset += 200) {
    const chunk = normalized.slice(offset, offset + 200);
    const snaps = await firestoreDb.getAll(...chunk.map(entry => entry.ref));
    const batch = firestoreDb.batch();
    let chunkWrites = 0;
    chunk.forEach((entry, index) => {
      if (snaps[index]?.exists) skipped += 1;
      else { batch.create(entry.ref, entry.data); imported += 1; chunkWrites += 1; }
    });
    if (chunkWrites > 0) await batch.commit();
  }
  if (endingBalanceRaw !== null) {
    await bankRef.set({ balance: Number(endingBalanceRaw.toFixed(2)), balanceUpdatedAt: nowIso, updatedAt: nowIso }, { merge: true });
  }
  await firestoreDb.collection('systemAuditLogs').add({
    action: 'FINANCE_BANK_STATEMENT_IMPORTED', entityType: 'financeBankStatement', entityId: bankAccountId,
    actorUid: actor.actorUid, actorName: actor.actorName, actorRole: actor.actorRole,
    createdAt: nowIso, immutable: true, summary: `Extrato importado: ${bankAccountLabel}`,
    metadata: { receivedRows: rawItems.length, imported, skipped, endingBalance: endingBalanceRaw },
  });
  return res.json({ success: true, imported, skipped });
});

app.post('/api/finance/reconciliation/:id', requireAuth, requireInternalAccount, requireEditModule('finance'), writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const statementId = asLimitedString(req.params.id, 180);
  const action = asLimitedString(req.body?.action, 40).toLowerCase();
  const transactionId = asLimitedString(req.body?.transactionId, 180);
  if (!statementId || !['match', 'create_and_match', 'ignore'].includes(action)) return res.status(400).json({ error: 'INVALID_BANK_STATEMENT' });
  const statementRef = firestoreDb.collection('financeBankStatementItems').doc(statementId);
  const auditRef = firestoreDb.collection('systemAuditLogs').doc();
  const actor = financeActor(req);
  const nowIso = new Date().toISOString();
  try {
    await firestoreDb.runTransaction(async (transaction) => {
      const statementSnap = await transaction.get(statementRef);
      if (!statementSnap.exists || statementSnap.data()?.isDeleted === true) {
        const err: any = new Error('BANK_STATEMENT_ITEM_NOT_FOUND'); err.code = 'BANK_STATEMENT_ITEM_NOT_FOUND'; throw err;
      }
      const item: any = statementSnap.data() || {};
      if (item.status === 'conciliado') return;
      if (action === 'ignore') {
        transaction.update(statementRef, { status: 'ignorado', updatedAt: nowIso, reconciledAt: nowIso, reconciledBy: actor.actorName, reconciledByUid: actor.actorUid });
        transaction.set(auditRef, {
          action: 'FINANCE_BANK_ITEM_IGNORED', entityType: 'financeBankStatementItem', entityId: statementId,
          actorUid: actor.actorUid, actorName: actor.actorName, actorRole: actor.actorRole,
          createdAt: nowIso, immutable: true, summary: `Movimento bancário ignorado: ${item.description}`,
          metadata: { amount: item.amount, date: item.date, bankAccountId: item.bankAccountId },
        });
        return;
      }

      const amount = Math.abs(Number(item.amount || 0));
      const expectedType = Number(item.amount || 0) < 0 ? 'despesa' : 'receita';
      let txRef: DocumentReference;
      let txDescription = '';
      if (action === 'create_and_match') {
        txRef = firestoreDb!.collection('financeTransactions').doc(`fstmt_tx_${statementId}`.slice(0, 180));
        const existingTx = await transaction.get(txRef);
        if (!existingTx.exists) {
          const settlement = {
            id: `sett_${Date.now()}_${randomBytes(3).toString('hex')}`, amount, date: item.date,
            bankAccount: item.bankAccountLabel, paymentMethod: 'Conciliação Bancária', notes: `Criado a partir do extrato: ${item.description}`,
            createdAt: nowIso, createdBy: actor.actorName, createdByUid: actor.actorUid,
          };
          txDescription = item.description;
          transaction.create(txRef, {
            type: expectedType, description: item.description, amount, grossAmount: amount, retentions: 0,
            paidAmount: amount, openBalance: 0, settlements: [settlement], date: item.date, dueDate: item.date, status: 'pago',
            category: 'Conciliação Bancária', costCenter: 'Administrativo', contractId: '', contractNumber: '', contractClientName: '',
            bankAccount: item.bankAccountLabel, paymentMethod: 'Conciliação Bancária', contactName: item.description,
            contactDocument: '', documentNumber: item.documentNumber || item.externalId || '', recurrence: 'none', installments: 1, currentInstallment: 1,
            notes: 'Lançamento criado automaticamente durante a conciliação bancária.',
            createdAt: nowIso, updatedAt: nowIso, createdBy: actor.actorName, createdByUid: actor.actorUid,
            updatedBy: actor.actorName, updatedByUid: actor.actorUid, sourceBankStatementItemId: statementId, isDeleted: false,
          });
        } else {
          txDescription = existingTx.data()?.description || item.description;
        }
      } else {
        if (!transactionId) { const err: any = new Error('TRANSACTION_NOT_FOUND'); err.code = 'TRANSACTION_NOT_FOUND'; throw err; }
        txRef = firestoreDb!.collection('financeTransactions').doc(transactionId);
        const txSnap = await transaction.get(txRef);
        if (!txSnap.exists || txSnap.data()?.isDeleted === true) { const err: any = new Error('TRANSACTION_NOT_FOUND'); err.code = 'TRANSACTION_NOT_FOUND'; throw err; }
        const before: any = txSnap.data() || {};
        if (before.type !== expectedType) { const err: any = new Error('FINANCE_RECONCILIATION_TYPE_MISMATCH'); err.code = 'FINANCE_RECONCILIATION_TYPE_MISMATCH'; throw err; }
        const originalAmount = Math.max(0, Number(before.amount || 0));
        const currentPaid = Math.max(0, Number(before.paidAmount || 0));
        const currentOpen = Math.max(0, Number.isFinite(Number(before.openBalance)) ? Number(before.openBalance) : originalAmount - currentPaid);
        if (amount > currentOpen + 0.00001) { const err: any = new Error('FINANCE_RECONCILIATION_AMOUNT_MISMATCH'); err.code = 'FINANCE_RECONCILIATION_AMOUNT_MISMATCH'; throw err; }
        const nextPaid = Math.min(originalAmount, Number((currentPaid + amount).toFixed(2)));
        const nextOpen = Math.max(0, Number((originalAmount - nextPaid).toFixed(2)));
        const nextStatus = nextOpen <= 0 ? 'pago' : (before.dueDate && before.dueDate < financeBusinessDate() ? 'atrasado' : 'pendente');
        const settlement = {
          id: `sett_${Date.now()}_${randomBytes(3).toString('hex')}`, amount, date: item.date,
          bankAccount: item.bankAccountLabel, paymentMethod: 'Conciliação Bancária', notes: `Conciliado com extrato: ${item.description}`,
          createdAt: nowIso, createdBy: actor.actorName, createdByUid: actor.actorUid,
        };
        const existingSettlements = Array.isArray(before.settlements) ? before.settlements.slice(-199) : [];
        transaction.update(txRef, {
          paidAmount: nextPaid, openBalance: nextOpen, status: nextStatus,
          settlements: [...existingSettlements, settlement], bankAccount: item.bankAccountLabel,
          updatedAt: nowIso, updatedBy: actor.actorName, updatedByUid: actor.actorUid,
        });
        txDescription = before.description || transactionId;
      }
      transaction.update(statementRef, {
        status: 'conciliado', matchedTransactionId: txRef.id, matchedTransactionDescription: txDescription,
        updatedAt: nowIso, reconciledAt: nowIso, reconciledBy: actor.actorName, reconciledByUid: actor.actorUid,
      });
      transaction.set(auditRef, {
        action: 'FINANCE_BANK_ITEM_RECONCILED', entityType: 'financeBankStatementItem', entityId: statementId,
        actorUid: actor.actorUid, actorName: actor.actorName, actorRole: actor.actorRole,
        createdAt: nowIso, immutable: true, summary: `Conciliação bancária: ${item.description}`,
        metadata: { amount: item.amount, date: item.date, bankAccountId: item.bankAccountId, transactionId: txRef.id, createdTransaction: action === 'create_and_match' },
      });
    });
    return res.json({ success: true });
  } catch (error: any) {
    const code = String(error?.code || error?.message || '');
    if (code.includes('BANK_STATEMENT_ITEM_NOT_FOUND')) return res.status(404).json({ error: 'BANK_STATEMENT_ITEM_NOT_FOUND' });
    if (code.includes('TRANSACTION_NOT_FOUND')) return res.status(404).json({ error: 'TRANSACTION_NOT_FOUND' });
    if (code.includes('FINANCE_RECONCILIATION_TYPE_MISMATCH')) return res.status(409).json({ error: 'FINANCE_RECONCILIATION_TYPE_MISMATCH' });
    if (code.includes('FINANCE_RECONCILIATION_AMOUNT_MISMATCH')) return res.status(409).json({ error: 'FINANCE_RECONCILIATION_AMOUNT_MISMATCH' });
    console.error('Finance reconciliation failed:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.get('/api/finance/audit', requireAuth, requireInternalAccount, requireAccessModule('finance'), async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const requested = Math.max(10, Math.min(300, Math.floor(Number(req.query?.limit || 150))));
  try {
    const snapshot = await firestoreDb.collection('systemAuditLogs').orderBy('createdAt', 'desc').limit(Math.min(600, requested * 3)).get();
    const items = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as any)).filter((item: any) => {
      const action = String(item.action || '');
      const entityType = String(item.entityType || '');
      return action.startsWith('FINANCE_')
        || action.startsWith('RENTAL_INVOICE_')
        || (action === 'CORPORATE_FILE_UPLOADED' && entityType === 'finance-document')
        || entityType.startsWith('finance')
        || entityType === 'rentalInvoice';
    }).slice(0, requested);
    return res.json({ success: true, items });
  } catch (error) {
    console.error('Finance audit read failed:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.post('/api/inventory/items/:id/archive', requireAuth, requireAdministratorAccount, adminApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const itemId = asLimitedString(req.params.id, 160);
  if (!itemId) return res.status(400).json({ error: 'INVALID_ITEM_ID' });

  try {
    const itemRef = firestoreDb.collection('inventoryItems').doc(itemId);
    const auditRef = firestoreDb.collection('systemAuditLogs').doc();
    const nowIso = new Date().toISOString();
    const actorName = asLimitedString(req.user?.name || req.user?.username || req.user?.email, 160) || 'Administrador';
    const actorUid = asLimitedString(req.user?.uid, 160);
    const actorRole = asLimitedString(req.user?.permissionLevel || req.user?.role, 100);

    await firestoreDb.runTransaction(async (transaction) => {
      const itemSnap = await transaction.get(itemRef);
      if (!itemSnap.exists) {
        const error: any = new Error('ITEM_NOT_FOUND');
        error.code = 'ITEM_NOT_FOUND';
        throw error;
      }
      const before: any = itemSnap.data() || {};
      if (before.isDeleted === true) return;

      transaction.update(itemRef, {
        isDeleted: true,
        deletedAt: nowIso,
        deletedBy: actorName,
        deletedByUid: actorUid,
      });
      transaction.set(auditRef, {
        action: 'INVENTORY_ITEM_ARCHIVED',
        entityType: 'inventoryItem',
        entityId: itemId,
        actorUid, actorName, actorRole,
        createdAt: nowIso,
        immutable: true,
        summary: `Item de estoque arquivado: ${asLimitedString(before.name, 160)}`,
        metadata: { quantity: Number(before.quantity || 0), category: asLimitedString(before.category, 120) },
      });
    });
    return res.json({ success: true });
  } catch (error: any) {
    const code = String(error?.code || error?.message || '');
    if (code.includes('ITEM_NOT_FOUND')) return res.status(404).json({ error: 'ITEM_NOT_FOUND' });
    console.error('Inventory archive failed:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.post('/api/instruments/:id/archive', requireAuth, requireAdministratorAccount, adminApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const instrumentId = asLimitedString(req.params.id, 160);
  if (!instrumentId) return res.status(400).json({ error: 'INVALID_INSTRUMENT_ID' });

  try {
    const instrumentRef = firestoreDb.collection('instruments').doc(instrumentId);
    const auditRef = firestoreDb.collection('systemAuditLogs').doc();
    const nowIso = new Date().toISOString();
    const actorName = asLimitedString(req.user?.name || req.user?.username || req.user?.email, 160) || 'Administrador';
    const actorUid = asLimitedString(req.user?.uid, 160);
    const actorRole = asLimitedString(req.user?.permissionLevel || req.user?.role, 100);

    await firestoreDb.runTransaction(async (transaction) => {
      const instrumentSnap = await transaction.get(instrumentRef);
      if (!instrumentSnap.exists) {
        const error: any = new Error('INSTRUMENT_NOT_FOUND'); error.code = 'INSTRUMENT_NOT_FOUND'; throw error;
      }
      const before: any = instrumentSnap.data() || {};
      if (before.isDeleted === true) return;
      transaction.update(instrumentRef, {
        isDeleted: true,
        deletedAt: nowIso,
        deletedBy: actorName,
        deletedByUid: actorUid,
        updatedAt: nowIso,
      });
      transaction.set(auditRef, {
        action: 'INSTRUMENT_ARCHIVED',
        entityType: 'instrument',
        entityId: instrumentId,
        actorUid, actorName, actorRole, createdAt: nowIso, immutable: true,
        summary: `Instrumento arquivado: ${asLimitedString(before.certificateNumber || before.coma || before.tag, 160)}`,
        metadata: {
          certificateNumber: asLimitedString(before.certificateNumber || before.coma, 160),
          tag: asLimitedString(before.tag, 160),
          clientId: asLimitedString(before.clientId, 160),
          status: asLimitedString(before.status, 120),
        },
      });
    });
    return res.json({ success: true });
  } catch (error: any) {
    const code = String(error?.code || error?.message || '');
    if (code.includes('INSTRUMENT_NOT_FOUND')) return res.status(404).json({ error: 'INSTRUMENT_NOT_FOUND' });
    console.error('Instrument archive failed:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.post('/api/field-service/:id/archive', requireAuth, requireAdministratorAccount, adminApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const recordId = asLimitedString(req.params.id, 160);
  if (!recordId) return res.status(400).json({ error: 'INVALID_RECORD_ID' });

  try {
    const recordRef = firestoreDb.collection('fieldServiceRecords').doc(recordId);
    const auditRef = firestoreDb.collection('systemAuditLogs').doc();
    const nowIso = new Date().toISOString();
    const actorName = asLimitedString(req.user?.name || req.user?.username || req.user?.email, 160) || 'Administrador';
    const actorUid = asLimitedString(req.user?.uid, 160);
    const actorRole = asLimitedString(req.user?.permissionLevel || req.user?.role, 100);

    await firestoreDb.runTransaction(async (transaction) => {
      const recordSnap = await transaction.get(recordRef);
      if (!recordSnap.exists) {
        const error: any = new Error('RECORD_NOT_FOUND'); error.code = 'RECORD_NOT_FOUND'; throw error;
      }
      const before: any = recordSnap.data() || {};
      if (before.isDeleted === true) return;
      transaction.update(recordRef, {
        isDeleted: true,
        deletedAt: nowIso,
        deletedBy: actorName,
        deletedByUid: actorUid,
      });
      transaction.set(auditRef, {
        action: 'FIELD_SERVICE_RECORD_ARCHIVED',
        entityType: 'fieldServiceRecord',
        entityId: recordId,
        actorUid, actorName, actorRole, createdAt: nowIso, immutable: true,
        summary: `Registro de serviço de campo arquivado`,
        metadata: {
          certificate: asLimitedString(before.certificate, 160),
          tag: asLimitedString(before.tag, 160),
          clientId: asLimitedString(before.clientId, 160),
        },
      });
    });
    return res.json({ success: true });
  } catch (error: any) {
    const code = String(error?.code || error?.message || '');
    if (code.includes('RECORD_NOT_FOUND')) return res.status(404).json({ error: 'RECORD_NOT_FOUND' });
    console.error('Field service archive failed:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});


const ARCHIVABLE_COLLECTIONS: Record<string, { area: 'rh' | 'health' | 'payslip' | 'finance' | 'operations'; label: string }> = {
  employeeDocuments: { area: 'rh', label: 'Documento do colaborador' },
  employeeAsos: { area: 'rh', label: 'ASO' },
  employeeTrainings: { area: 'rh', label: 'Treinamento do colaborador' },
  trainings: { area: 'rh', label: 'Treinamento' },
  employeeBirthdays: { area: 'rh', label: 'Aniversário do colaborador' },
  medical_exams: { area: 'rh', label: 'Exame ocupacional' },
  health_program_docs: { area: 'health', label: 'Documento de programa de saúde' },
  payslips: { area: 'payslip', label: 'Documento de folha' },
  financeTransactions: { area: 'finance', label: 'Lançamento financeiro' },
  financeContracts: { area: 'finance', label: 'Contrato financeiro' },
  financeMeasurements: { area: 'finance', label: 'Medição financeira' },
  financeBankAccounts: { area: 'finance', label: 'Conta bancária' },
  financeCategories: { area: 'finance', label: 'Categoria financeira' },
  financeOperations: { area: 'finance', label: 'Operação financeira complementar' },
  savedIntakes: { area: 'operations', label: 'Entrada de material' },
  rncReports: { area: 'operations', label: 'Relatório de não conformidade' },
  referenceStandards: { area: 'operations', label: 'Padrão de referência' },
  calibrationAuditLogs: { area: 'operations', label: 'Registro de tempo de calibração' },
  internal_tickets: { area: 'operations', label: 'Chamado interno' },
};

const normalizeCalibrationDate = (value: unknown): string | null => {
  const date = asLimitedString(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date
    ? null
    : date;
};

const calibrationReopenUpdates = (
  updatedAt: string,
  suggestedCalibrationDate: string | null,
) => ({
  status: 'Aguardando Calibração',
  lastCalibrationDate: FieldValue.delete(),
  nextCalibrationDate: FieldValue.delete(),
  temperature: FieldValue.delete(),
  humidity: FieldValue.delete(),
  manualCalibrationDateAllowed: true,
  reissueSuggestedCalibrationDate: suggestedCalibrationDate || FieldValue.delete(),
  updatedAt,
});

const reopenedInstrumentPayload = (
  instrumentId: string,
  source: Record<string, any>,
  updatedAt: string,
  suggestedCalibrationDate: string | null,
) => {
  const {
    lastCalibrationDate: _lastCalibrationDate,
    nextCalibrationDate: _nextCalibrationDate,
    temperature: _temperature,
    humidity: _humidity,
    manualCalibrationDateAllowed: _manualCalibrationDateAllowed,
    reissueSuggestedCalibrationDate: _reissueSuggestedCalibrationDate,
    ...preserved
  } = source;
  return {
    ...preserved,
    id: instrumentId,
    status: 'Aguardando Calibração',
    manualCalibrationDateAllowed: true,
    ...(suggestedCalibrationDate
      ? { reissueSuggestedCalibrationDate: suggestedCalibrationDate }
      : {}),
    updatedAt,
  };
};

const getFreshAdministrator = async (req: AuthRequest) => {
  if (!req.user) return null;
  const profile = await findPortalUserForAuth(req.user);
  return profile && isAdministratorProfile(profile) ? profile : null;
};

app.post(
  '/api/internal/calibration-reports/:reportId/delete-and-reopen',
  requireAuth,
  requireInternalAccount,
  writeApiRateLimit,
  async (req: AuthRequest, res) => {
    if (!firestoreDb || !req.user) {
      return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
    }

    const reportId = asLimitedString(req.params.reportId, 180);
    if (!reportId) return res.status(400).json({ error: 'INVALID_REPORT_ID' });

    try {
      const administrator = await getFreshAdministrator(req);
      if (!administrator) return res.status(403).json({ error: 'FORBIDDEN' });

      const reportRef = firestoreDb.collection('calibrationReports').doc(reportId);
      const auditRef = firestoreDb.collection('systemAuditLogs').doc();
      const updatedAt = new Date().toISOString();

      const result = await firestoreDb.runTransaction(async (transaction) => {
        const reportSnapshot = await transaction.get(reportRef);
        if (!reportSnapshot.exists) throw new Error('REPORT_NOT_FOUND');

        const report: any = reportSnapshot.data() || {};
        const instrumentId = asLimitedString(report.instrumentId, 180);
        if (!instrumentId) throw new Error('REPORT_WITHOUT_INSTRUMENT');

        const instrumentRef = firestoreDb.collection('instruments').doc(instrumentId);
        const instrumentSnapshot = await transaction.get(instrumentRef);
        if (!instrumentSnapshot.exists) throw new Error('INSTRUMENT_NOT_FOUND');

        const instrument: any = instrumentSnapshot.data() || {};
        const suggestedCalibrationDate = normalizeCalibrationDate(report.date);
        transaction.delete(reportRef);
        transaction.update(
          instrumentRef,
          calibrationReopenUpdates(updatedAt, suggestedCalibrationDate),
        );
        transaction.set(auditRef, {
          action: 'CALIBRATION_REPORT_DELETED_FOR_REISSUE',
          entityType: 'calibrationReport',
          entityId: reportId,
          actorUid: asLimitedString(req.user?.uid, 160),
          actorName: asLimitedString(
            administrator.name || administrator.username || req.user?.email,
            160,
          ) || 'Administrador',
          actorRole: asLimitedString(
            administrator.permissionLevel || administrator.role,
            100,
          ),
          createdAt: updatedAt,
          immutable: true,
          summary: 'Certificado removido definitivamente e calibração reaberta',
          metadata: {
            instrumentId,
            certNumber: asLimitedString(report.certNumber, 160),
            suggestedCalibrationDate,
            previousInstrumentStatus: asLimitedString(instrument.status, 100),
            reason: 'CERTIFICATE_CORRECTION_AND_REISSUE',
          },
        });

        return {
          reportId,
          instrumentId,
          instrument: reopenedInstrumentPayload(
            instrumentId,
            instrument,
            updatedAt,
            suggestedCalibrationDate,
          ),
        };
      });

      return res.json({ success: true, ...result });
    } catch (error: any) {
      const code = String(error?.message || error?.code || '');
      if (code.includes('REPORT_NOT_FOUND')) {
        return res.status(404).json({ error: 'REPORT_NOT_FOUND' });
      }
      if (code.includes('REPORT_WITHOUT_INSTRUMENT')) {
        return res.status(409).json({ error: 'REPORT_WITHOUT_INSTRUMENT' });
      }
      if (code.includes('INSTRUMENT_NOT_FOUND')) {
        return res.status(404).json({ error: 'INSTRUMENT_NOT_FOUND' });
      }
      console.error('Calibration report delete-and-reopen failed:', error);
      return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
  },
);

app.post(
  '/api/internal/instruments/:instrumentId/recover-archived-calibration',
  requireAuth,
  requireInternalAccount,
  writeApiRateLimit,
  async (req: AuthRequest, res) => {
    if (!firestoreDb || !req.user) {
      return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
    }

    const instrumentId = asLimitedString(req.params.instrumentId, 180);
    if (!instrumentId) {
      return res.status(400).json({ error: 'INVALID_INSTRUMENT_ID' });
    }

    try {
      const administrator = await getFreshAdministrator(req);
      if (!administrator) return res.status(403).json({ error: 'FORBIDDEN' });

      const reportsSnapshot = await firestoreDb
        .collection('calibrationReports')
        .where('instrumentId', '==', instrumentId)
        .get();
      const activeReports = reportsSnapshot.docs.filter(
        (snapshot) => snapshot.data()?.isDeleted !== true,
      );
      const archivedReports = reportsSnapshot.docs.filter(
        (snapshot) => snapshot.data()?.isDeleted === true,
      );

      if (activeReports.length > 0) {
        return res.status(409).json({ error: 'ACTIVE_CALIBRATION_REPORT_EXISTS' });
      }
      const instrumentRef = firestoreDb.collection('instruments').doc(instrumentId);
      const updatedAt = new Date().toISOString();

      if (archivedReports.length === 0) {
        const instrumentSnapshot = await instrumentRef.get();
        if (!instrumentSnapshot.exists) {
          return res.status(404).json({ error: 'INSTRUMENT_NOT_FOUND' });
        }

        const instrumentBefore: any = instrumentSnapshot.data() || {};
        if (instrumentBefore.manualCalibrationDateAllowed === true) {
          return res.json({
            success: true,
            recovered: false,
            instrumentId,
            instrument: { ...instrumentBefore, id: instrumentId },
          });
        }

        // Compatibilidade com instrumentos que já foram reabertos pelo Lote 7
        // antes de existir a autorização temporária de data manual.
        const auditEvidenceSnapshot = await firestoreDb
          .collection('systemAuditLogs')
          .where('metadata.instrumentId', '==', instrumentId)
          .limit(50)
          .get();
        const auditEvidence = auditEvidenceSnapshot.docs.find((snapshot) => {
          const action = String(snapshot.data()?.action || '');
          return action === 'CALIBRATION_REPORT_DELETED_FOR_REISSUE' ||
            action === 'ARCHIVED_CALIBRATION_RECOVERED_FOR_REISSUE';
        });

        if (!auditEvidence) {
          return res.json({ success: true, recovered: false, instrumentId });
        }

        const suggestedCalibrationDate =
          normalizeCalibrationDate(instrumentBefore.reissueSuggestedCalibrationDate) ||
          normalizeCalibrationDate(auditEvidence.data()?.metadata?.suggestedCalibrationDate);
        const auditRef = firestoreDb.collection('systemAuditLogs').doc();
        const instrument = await firestoreDb.runTransaction(async (transaction) => {
          const freshSnapshot = await transaction.get(instrumentRef);
          if (!freshSnapshot.exists) throw new Error('INSTRUMENT_NOT_FOUND');
          const freshInstrument: any = freshSnapshot.data() || {};

          transaction.update(instrumentRef, {
            manualCalibrationDateAllowed: true,
            reissueSuggestedCalibrationDate:
              suggestedCalibrationDate || FieldValue.delete(),
            updatedAt,
          });
          transaction.set(auditRef, {
            action: 'MANUAL_CALIBRATION_DATE_AUTHORIZED_AFTER_REOPEN',
            entityType: 'instrument',
            entityId: instrumentId,
            actorUid: asLimitedString(req.user?.uid, 160),
            actorName: asLimitedString(
              administrator.name || administrator.username || req.user?.email,
              160,
            ) || 'Administrador',
            actorRole: asLimitedString(
              administrator.permissionLevel || administrator.role,
              100,
            ),
            createdAt: updatedAt,
            immutable: true,
            summary: 'Data manual autorizada para calibração já reaberta',
            metadata: {
              instrumentId,
              sourceAuditId: auditEvidence.id,
              suggestedCalibrationDate,
              reason: 'LOTE_7_REOPEN_COMPATIBILITY',
            },
          });

          return {
            ...freshInstrument,
            id: instrumentId,
            manualCalibrationDateAllowed: true,
            ...(suggestedCalibrationDate
              ? { reissueSuggestedCalibrationDate: suggestedCalibrationDate }
              : {}),
            updatedAt,
          };
        });

        return res.json({
          success: true,
          recovered: false,
          dateAuthorizationRecovered: true,
          instrumentId,
          instrument,
        });
      }

      const auditRef = firestoreDb.collection('systemAuditLogs').doc();
      const removedReportIds = archivedReports.map((snapshot) => snapshot.id);
      const suggestedCalibrationDate = archivedReports
        .map((snapshot) => normalizeCalibrationDate(snapshot.data()?.date))
        .filter((date): date is string => Boolean(date))
        .sort()
        .pop() || null;

      const instrument = await firestoreDb.runTransaction(async (transaction) => {
        const instrumentSnapshot = await transaction.get(instrumentRef);
        if (!instrumentSnapshot.exists) throw new Error('INSTRUMENT_NOT_FOUND');

        const instrumentBefore: any = instrumentSnapshot.data() || {};
        archivedReports.forEach((snapshot) => transaction.delete(snapshot.ref));
        transaction.update(
          instrumentRef,
          calibrationReopenUpdates(updatedAt, suggestedCalibrationDate),
        );
        transaction.set(auditRef, {
          action: 'ARCHIVED_CALIBRATION_RECOVERED_FOR_REISSUE',
          entityType: 'instrument',
          entityId: instrumentId,
          actorUid: asLimitedString(req.user?.uid, 160),
          actorName: asLimitedString(
            administrator.name || administrator.username || req.user?.email,
            160,
          ) || 'Administrador',
          actorRole: asLimitedString(
            administrator.permissionLevel || administrator.role,
            100,
          ),
          createdAt: updatedAt,
          immutable: true,
          summary: 'Arquivamento legado removido e calibração reaberta',
          metadata: {
            instrumentId,
            removedReportIds: removedReportIds.slice(0, 50),
            suggestedCalibrationDate,
            previousInstrumentStatus: asLimitedString(instrumentBefore.status, 100),
            reason: 'LEGACY_ARCHIVE_RECOVERY_FOR_REISSUE',
          },
        });

        return reopenedInstrumentPayload(
          instrumentId,
          instrumentBefore,
          updatedAt,
          suggestedCalibrationDate,
        );
      });

      return res.json({
        success: true,
        recovered: true,
        instrumentId,
        removedReportIds,
        instrument,
      });
    } catch (error: any) {
      const code = String(error?.message || error?.code || '');
      if (code.includes('INSTRUMENT_NOT_FOUND')) {
        return res.status(404).json({ error: 'INSTRUMENT_NOT_FOUND' });
      }
      console.error('Archived calibration recovery failed:', error);
      return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
  },
);

app.post('/api/internal/archive-record', requireAuth, requireInternalAccount, writeApiRateLimit, async (req: AuthRequest, res) => {
  if (!firestoreDb || !req.user) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
  const collectionName = String(req.body?.collectionName || '').trim();
  const recordId = asLimitedString(req.body?.recordId, 180);
  const config = ARCHIVABLE_COLLECTIONS[collectionName];
  if (!config || !recordId) return res.status(400).json({ error: 'INVALID_ARCHIVE_TARGET' });

  let freshProfile: any = null;
  try {
    freshProfile = await findPortalUserForAuth(req.user);
  } catch (error) {
    console.warn('Could not refresh archive authorization profile:', error);
  }
  const isFreshAdministrator = isAdministratorProfile(freshProfile || req.user);
  const allowed = isFreshAdministrator ||
    (config.area === 'rh' && isRhEditor(req.user)) ||
    (config.area === 'health' && userCanEditModule(req.user as any, 'health_programs')) ||
    (config.area === 'payslip' && (isRhEditor(req.user) || isFinanceEditor(req.user)));
  // Exclusões/arquivamentos do Financeiro exigem Administrador, inclusive quando
  // o usuário possui permissão de edição financeira.
  if (config.area === 'finance' && !isFreshAdministrator) return res.status(403).json({ error: 'ADMIN_REQUIRED' });
  if (!allowed) return res.status(403).json({ error: 'FORBIDDEN' });

  try {
    const recordRef = firestoreDb.collection(collectionName).doc(recordId);
    const auditRef = firestoreDb.collection('systemAuditLogs').doc();
    const nowIso = new Date().toISOString();
    const actorName = asLimitedString(req.user?.name || req.user?.username || req.user?.email, 160) || 'Usuário interno';
    const actorUid = asLimitedString(req.user?.uid, 160);
    const actorRole = asLimitedString(req.user?.permissionLevel || req.user?.role, 100);

    await firestoreDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(recordRef);
      if (!snapshot.exists) {
        const error: any = new Error('RECORD_NOT_FOUND');
        error.code = 'RECORD_NOT_FOUND';
        throw error;
      }
      const before: any = snapshot.data() || {};
      if (before.isDeleted === true) return;
      if (
        collectionName === 'financeOperations' &&
        Array.isArray(before.financeTransactionIds) &&
        before.financeTransactionIds.length > 0
      ) {
        const error: any = new Error('FINANCE_OPERATION_LINKED');
        error.code = 'FINANCE_OPERATION_LINKED';
        throw error;
      }

      transaction.update(recordRef, {
        isDeleted: true,
        deletedAt: nowIso,
        deletedBy: actorName,
        deletedByUid: actorUid,
        updatedAt: nowIso,
      });
      transaction.set(auditRef, {
        action: 'CRITICAL_RECORD_ARCHIVED',
        entityType: collectionName,
        entityId: recordId,
        actorUid,
        actorName,
        actorRole,
        createdAt: nowIso,
        immutable: true,
        summary: `${config.label} arquivado`,
        metadata: {
          collectionName,
          previousName: asLimitedString(
            before.name ||
            before.title ||
            before.employeeName ||
            before.description ||
            before.contractNumber ||
            before.certNumber ||
            before.numEntrada ||
            before.rncNumber ||
            before.identification,
            180,
          ),
          clientId: asLimitedString(before.clientId, 160),
          instrumentId: asLimitedString(before.instrumentId, 160),
        },
      });
    });

    return res.json({ success: true });
  } catch (error: any) {
    const code = String(error?.code || error?.message || '');
    if (code.includes('RECORD_NOT_FOUND')) return res.status(404).json({ error: 'RECORD_NOT_FOUND' });
    if (code.includes('FINANCE_OPERATION_LINKED')) return res.status(409).json({ error: 'FINANCE_OPERATION_LINKED' });
    console.error('Critical record archive failed:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

// Firestore/Firebase Admin are the only production data stores.

// Lazy initialize Gemini API to handle missing keys gracefully
let ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (ai) return ai;
  const key = process.env.GEMINI_API_KEY;

  if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
    return null;
  }
  try {
    ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    return ai;
  } catch (err) {
    console.error("Falha ao inicializar GoogleGenAI SDK:", err);
    return null;
  }
}


// ------------------- CRON JOB (NOTIFICAÇÕES E ALERTAS) -------------------


const currentBahiaDateIso = (): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bahia',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
};

async function runRentalDueNotifications() {
  try {
    if (!firestoreDb) {
      console.warn('[RENTAL REMINDER] Admin SDK indisponível.');
      return;
    }
    const today = currentBahiaDateIso();
    const targetDueDate = rentalAddDays(today, RENTAL_REMINDER_DAYS);
    if (!targetDueDate) return;

    const snapshot = await firestoreDb.collection('rentalContracts').where('status', '==', 'ativo').get();
    if (snapshot.empty) {
      console.log('[RENTAL REMINDER] Nenhuma locação ativa.');
      return;
    }

    const dueRentals: Array<{
      rentalId: string;
      rental: any;
      dueDate: string;
      cycleIndex: number;
      periodStart: string;
      periodEnd: string;
      invoice: any | null;
      amount: number;
    }> = [];

    for (const docSnap of snapshot.docs) {
      const rental: any = docSnap.data() || {};
      const firstDueDate = rentalDate(rental.firstDueDate);
      const startDate = rentalDate(rental.startDate);
      if (!firstDueDate || !startDate) continue;
      const diff = rentalDiffDays(firstDueDate, targetDueDate);
      if (diff === null || diff < 0 || diff % RENTAL_BILLING_DAYS !== 0) continue;

      const cycleIndex = diff / RENTAL_BILLING_DAYS;
      const periodStart = rentalAddDays(startDate, cycleIndex * RENTAL_BILLING_DAYS);
      const periodEnd = rentalAddDays(periodStart, RENTAL_BILLING_DAYS - 1);
      const invoiceId = rentalInvoiceDocId(docSnap.id, targetDueDate);
      const invoiceSnap = await firestoreDb.collection('rentalInvoices').doc(invoiceId).get();
      const invoice = invoiceSnap.exists ? { id: invoiceSnap.id, ...invoiceSnap.data() } : null;

      const amount = invoice
        ? Number((invoice as any).total || 0)
        : Number((Array.isArray(rental.items) ? rental.items : [])
            .filter((item: any) => {
              const dispatchedAt = rentalDate(item.dispatchedAt || rental.dispatchAt || rental.startDate);
              const returnedAt = rentalDate(item.returnedAt);
              return !!dispatchedAt && dispatchedAt <= periodEnd && (!returnedAt || returnedAt >= periodStart);
            })
            .reduce((sum: number, item: any) => sum + Number(item.monthlyPrice || 0), 0)
            .toFixed(2));

      if (amount <= 0) continue;
      dueRentals.push({
        rentalId: docSnap.id,
        rental,
        dueDate: targetDueDate,
        cycleIndex,
        periodStart,
        periodEnd,
        invoice,
        amount,
      });
    }

    if (dueRentals.length === 0) {
      console.log(`[RENTAL REMINDER] Nenhuma locação vence em ${targetDueDate}.`);
      return;
    }

    const smtpHost = String(process.env.SMTP_HOST || '').trim();
    const smtpUser = String(process.env.SMTP_USER || '').trim();
    const smtpPass = String(process.env.SMTP_PASS || '').trim();
    const parsedPort = Number(process.env.SMTP_PORT || 587);
    const smtpPort = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 587;
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn('[RENTAL REMINDER] SMTP não configurado; alertas não enviados.');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    for (const entry of dueRentals) {
      const logId = `rental_${entry.rentalId}_${entry.dueDate.replace(/\D/g, '')}_3d`;
      const logRef = firestoreDb.collection('rentalNotificationLogs').doc(logId);
      const nowIso = new Date().toISOString();
      const leaseUntil = new Date(Date.now() + 20 * 60 * 1000).toISOString();
      let claimed = false;

      await firestoreDb.runTransaction(async (transaction) => {
        const logSnap = await transaction.get(logRef);
        const previous: any = logSnap.exists ? logSnap.data() : null;
        if (previous?.status === 'sent') return;
        if (previous?.status === 'processing' && String(previous?.leaseUntil || '') > nowIso) return;
        transaction.set(logRef, {
          rentalId: entry.rentalId,
          rentalNumber: entry.rental.rentalNumber,
          dueDate: entry.dueDate,
          type: 'three_days_before_due',
          status: 'processing',
          leaseUntil,
          attempts: Number(previous?.attempts || 0) + 1,
          updatedAt: nowIso,
          createdAt: previous?.createdAt || nowIso,
        }, { merge: true });
        claimed = true;
      });

      if (!claimed) continue;

      const invoiceLabel = entry.invoice?.invoiceNumber
        ? `Fatura ${entry.invoice.invoiceNumber}`
        : 'Fatura ainda não gerada';
      const safeClient = escapeHtml(asLimitedString(entry.rental.clientName, 240));
      const safeRentalNumber = escapeHtml(asLimitedString(entry.rental.rentalNumber, 120));
      const safeInvoiceLabel = escapeHtml(invoiceLabel);
      const safeDueDate = escapeHtml(entry.dueDate.split('-').reverse().join('/'));
      const safePeriod = escapeHtml(`${entry.periodStart.split('-').reverse().join('/')} a ${entry.periodEnd.split('-').reverse().join('/')}`);
      const safePo = escapeHtml(asLimitedString(entry.rental.purchaseOrder, 500) || '-');
      const safeProject = escapeHtml(asLimitedString(entry.rental.project, 500) || '-');
      const amountLabel = entry.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const assetCodes = (Array.isArray(entry.rental.items) ? entry.rental.items : [])
        .filter((item: any) => {
          const dispatchedAt = rentalDate(item.dispatchedAt || entry.rental.dispatchAt || entry.rental.startDate);
          const returnedAt = rentalDate(item.returnedAt);
          return !!dispatchedAt && dispatchedAt <= entry.periodEnd && (!returnedAt || returnedAt >= entry.periodStart);
        })
        .map((item: any) => asLimitedString(item.assetCode, 120))
        .filter(Boolean)
        .join(', ');

      const subject = `[LOCAÇÃO COMANINS] Vencimento em 3 dias - ${entry.rental.clientName} - ${entry.rental.rentalNumber}`;
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#0f172a;line-height:1.55;">
          <h2 style="color:#1d4ed8;margin-bottom:6px;">Locação de Instrumentos — vencimento em 3 dias</h2>
          <p style="margin-top:0;color:#475569;">Aviso automático do Portal COMANINS para o ciclo mensal de 30 dias.</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin:18px 0;">
            <tr><td style="padding:8px;border:1px solid #cbd5e1;font-weight:bold;width:34%;">Cliente</td><td style="padding:8px;border:1px solid #cbd5e1;">${safeClient}</td></tr>
            <tr><td style="padding:8px;border:1px solid #cbd5e1;font-weight:bold;">Locação</td><td style="padding:8px;border:1px solid #cbd5e1;">${safeRentalNumber}</td></tr>
            <tr><td style="padding:8px;border:1px solid #cbd5e1;font-weight:bold;">Faturamento</td><td style="padding:8px;border:1px solid #cbd5e1;">${safeInvoiceLabel}</td></tr>
            <tr><td style="padding:8px;border:1px solid #cbd5e1;font-weight:bold;">Período</td><td style="padding:8px;border:1px solid #cbd5e1;">${safePeriod}</td></tr>
            <tr><td style="padding:8px;border:1px solid #cbd5e1;font-weight:bold;">Vencimento</td><td style="padding:8px;border:1px solid #cbd5e1;color:#b91c1c;font-weight:bold;">${safeDueDate}</td></tr>
            <tr><td style="padding:8px;border:1px solid #cbd5e1;font-weight:bold;">Valor mensal</td><td style="padding:8px;border:1px solid #cbd5e1;font-weight:bold;">${escapeHtml(amountLabel)}</td></tr>
            <tr><td style="padding:8px;border:1px solid #cbd5e1;font-weight:bold;">Equipamentos</td><td style="padding:8px;border:1px solid #cbd5e1;">${escapeHtml(assetCodes || '-')}</td></tr>
            <tr><td style="padding:8px;border:1px solid #cbd5e1;font-weight:bold;">PC</td><td style="padding:8px;border:1px solid #cbd5e1;">${safePo}</td></tr>
            <tr><td style="padding:8px;border:1px solid #cbd5e1;font-weight:bold;">Obra/Projeto</td><td style="padding:8px;border:1px solid #cbd5e1;">${safeProject}</td></tr>
          </table>
          ${entry.invoice ? '<p>A fatura do ciclo já está emitida no módulo de Locação.</p>' : '<p style="color:#b45309;font-weight:bold;">A fatura deste ciclo ainda não foi gerada. Acesse o módulo de Locação para emitir antes do vencimento.</p>'}
          <p style="font-size:12px;color:#64748b;">Destinatários operacionais: comercial@comanins.com.br e financeiro@comanins.com.br.</p>
        </div>
      `;

      try {
        const info = await transporter.sendMail({
          from: `"COMANINS - Locação de Instrumentos" <${smtpUser}>`,
          to: RENTAL_NOTIFICATION_RECIPIENTS.join(', '),
          subject,
          html,
          text: [
            'LOCAÇÃO COMANINS - VENCIMENTO EM 3 DIAS',
            `Cliente: ${entry.rental.clientName}`,
            `Locação: ${entry.rental.rentalNumber}`,
            `Faturamento: ${invoiceLabel}`,
            `Período: ${entry.periodStart} a ${entry.periodEnd}`,
            `Vencimento: ${entry.dueDate}`,
            `Valor mensal: ${amountLabel}`,
            `Equipamentos: ${assetCodes || '-'}`,
            `PC: ${entry.rental.purchaseOrder || '-'}`,
            `Obra/Projeto: ${entry.rental.project || '-'}`,
          ].join('\n'),
        });
        await logRef.set({
          status: 'sent',
          sentAt: new Date().toISOString(),
          leaseUntil: FieldValue.delete(),
          messageId: asLimitedString(info.messageId, 500),
          recipients: RENTAL_NOTIFICATION_RECIPIENTS,
        }, { merge: true });
        if (entry.invoice?.id) {
          await firestoreDb.collection('rentalInvoices').doc(entry.invoice.id).set({
            reminder3DaysSentAt: new Date().toISOString(),
          }, { merge: true });
        }
        console.log(`[RENTAL REMINDER] Enviado ${entry.rental.rentalNumber} / ${entry.dueDate}.`);
      } catch (error: any) {
        console.error(`[RENTAL REMINDER] Falha ${entry.rental.rentalNumber}:`, error);
        await logRef.set({
          status: 'failed',
          lastError: asLimitedString(error?.message || error, 1000),
          failedAt: new Date().toISOString(),
          leaseUntil: FieldValue.delete(),
        }, { merge: true });
      }
    }
  } catch (error) {
    console.error('[RENTAL REMINDER] Erro na rotina:', error);
  }
}

async function runDailyNotifications() {
  try {
    if (!firestoreDb) {
      console.warn('[Firebase Admin] Rotina diária ignorada: Admin SDK indisponível neste ambiente.');
      return;
    }
    console.log("Executando verificação diária de notificações e alertas...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Funções auxiliares para cálculo de dias
    const diffInDays = (targetDate) => {
      const target = new Date(targetDate);
      target.setHours(0, 0, 0, 0);
      const diffTime = target.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // 1. Verificar Aniversários (EXATAMENTE 1 dia antes)
    const upcomingBdays = [];

    // A. Buscar de employeeBirthdays
    const bdaySnapshot = await firestoreDb.collection('employeeBirthdays').get();
    bdaySnapshot.forEach(doc => {
      const b = doc.data();
      if (!b.day || !b.month) return;
      let bdayThisYear = new Date(today.getFullYear(), b.month - 1, b.day);
      if (bdayThisYear < today) {
        bdayThisYear = new Date(today.getFullYear() + 1, b.month - 1, b.day);
      }
      const days = Math.ceil((bdayThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (days === 1) {
        upcomingBdays.push({ name: b.name, date: `${String(b.day).padStart(2, '0')}/${String(b.month).padStart(2, '0')}` });
      }
    });

    // B. Buscar de portalUsers (birthDate: YYYY-MM-DD)
    const usersSnapshot = await firestoreDb.collection('portalUsers').get();
    const internalUsers = [];
    usersSnapshot.forEach(doc => {
      const u = { id: doc.id, ...doc.data() } as any;
      internalUsers.push(u);
      if (u.birthDate) {
        const [y, m, d] = u.birthDate.split('-');
        let bdayThisYear = new Date(today.getFullYear(), parseInt(m) - 1, parseInt(d));
        if (bdayThisYear < today) {
          bdayThisYear = new Date(today.getFullYear() + 1, parseInt(m) - 1, parseInt(d));
        }
        const days = Math.ceil((bdayThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (days === 1) {
          const dateStr = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
          if (!upcomingBdays.find(b => b.name === u.name && b.date === dateStr)) {
            upcomingBdays.push({ name: u.name, date: dateStr });
          }
        }
      }
    });

    // 2. Verificar Treinamentos (EXATAMENTE 10 dias antes)
    const upcomingTrainings = [];
    const trSnapshot = await firestoreDb.collection('trainings').get();
    const trainings = [];
    trSnapshot.forEach(doc => trainings.push({ id: doc.id, ...doc.data() }));

    const empTrSnapshot = await firestoreDb.collection('employeeTrainings').get();
    empTrSnapshot.forEach(doc => {
      const record = doc.data();
      const user = internalUsers.find(u => u.id === record.employeeId);
      const training = trainings.find(t => t.id === record.trainingId);

      if (record.completionDate && training && training.validityMonths > 0) {
        const [year, month, day] = record.completionDate.split('-');
        const completionDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const expirationDate = new Date(completionDateObj);
        expirationDate.setMonth(expirationDate.getMonth() + training.validityMonths);

        const days = diffInDays(expirationDate);
        if (days === 10) {
          upcomingTrainings.push({
            employeeName: user?.name || 'Desconhecido',
            trainingName: training.name,
            expirationDate: `${String(expirationDate.getDate()).padStart(2, '0')}/${String(expirationDate.getMonth() + 1).padStart(2, '0')}/${expirationDate.getFullYear()}`
          });
        }
      }
    });

    // 3. Verificar ASO (EXATAMENTE 10 dias antes)
    const upcomingASO = [];
    const asoSnapshot = await firestoreDb.collection('medical_exams').get();
    asoSnapshot.forEach(doc => {
      const aso = doc.data();
      if (aso.nextExamDate) {
        const [year, month, day] = aso.nextExamDate.split('-');
        const examDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const days = diffInDays(examDateObj);
        if (days === 10) {
          const user = internalUsers.find(u => u.id === aso.employeeId);
          upcomingASO.push({
            employeeName: user?.name || 'Desconhecido',
            examType: aso.examType || 'ASO',
            expirationDate: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
          });
        }
      }
    });

    // 4. Verificar Padrões (EXATAMENTE 10 dias antes)
    const upcomingStandards = [];
    const stSnapshot = await firestoreDb.collection('referenceStandards').get();
    stSnapshot.forEach(doc => {
      const std = doc.data();
      if (std.expirationDate) {
        const [year, month, day] = std.expirationDate.split('-');
        const expDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const days = diffInDays(expDateObj);
        if (days === 10) {
          upcomingStandards.push({
            name: std.instrumentType || std.identification || 'Padrão Desconhecido',
            cert: std.certificateNumber || '-',
            expirationDate: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
          });
        }
      }
    });

    // 5. Verificar Programas de Saúde (PGR, PCMSO, LTCAT, etc.) - 30 dias antes ou vencidos
    const upcomingHealthDocs = [];
    try {
      const hpSnapshot = await firestoreDb.collection('health_program_docs').get();
      hpSnapshot.forEach(doc => {
        const hp = doc.data();
        if (hp.expirationDate) {
          const [year, month, day] = hp.expirationDate.split('-');
          const expDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          const days = diffInDays(expDateObj);
          if (days <= 30) {
            upcomingHealthDocs.push({
              title: hp.title || 'Programa de Saúde',
              docType: hp.docType || 'Documento',
              days,
              expirationDate: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
            });
          }
        }
      });
    } catch (hpErr) {
      console.error("Erro ao verificar documentos de programas de saúde:", hpErr);
    }

    if (upcomingBdays.length > 0 || upcomingTrainings.length > 0 || upcomingASO.length > 0 || upcomingStandards.length > 0 || upcomingHealthDocs.length > 0) {
      const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;

      if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
          }
        });

        let htmlBody = `<p>Olá Equipe,</p><p>Aqui está o resumo diário de notificações e alertas do painel COMANINS:</p>`;
        let textBody = `Olá Equipe,

Aqui está o resumo diário de notificações e alertas do painel COMANINS:

`;

        if (upcomingBdays.length > 0) {
          htmlBody += `<h3>🎂 Aniversariantes de Amanhã</h3><ul>`;
          textBody += `--- ANIVERSARIANTES DE AMANHÃ ---
`;
          upcomingBdays.forEach(b => {
            htmlBody += `<li><b>${b.name}</b> - ${b.date}</li>`;
            textBody += `- ${b.name} - ${b.date}
`;
          });
          htmlBody += `</ul>`;
        }

        if (upcomingTrainings.length > 0) {
          htmlBody += `<h3>⚠️ Treinamentos Vencendo em 10 dias</h3><ul>`;
          textBody += `
--- TREINAMENTOS VENCENDO EM 10 DIAS ---
`;
          upcomingTrainings.forEach(t => {
            htmlBody += `<li><b>${t.trainingName}</b> - ${t.employeeName} (Vencimento: ${t.expirationDate})</li>`;
            textBody += `- ${t.trainingName} (${t.employeeName}) - Vencimento: ${t.expirationDate}
`;
          });
          htmlBody += `</ul>`;
        }

        if (upcomingASO.length > 0) {
          htmlBody += `<h3>🩺 ASO / Exames Vencendo em 10 dias</h3><ul>`;
          textBody += `
--- ASO / EXAMES VENCENDO EM 10 DIAS ---
`;
          upcomingASO.forEach(a => {
            htmlBody += `<li><b>${a.examType}</b> - ${a.employeeName} (Vencimento: ${a.expirationDate})</li>`;
            textBody += `- ${a.examType} (${a.employeeName}) - Vencimento: ${a.expirationDate}
`;
          });
          htmlBody += `</ul>`;
        }

        if (upcomingStandards.length > 0) {
          htmlBody += `<h3>📏 Padrões de Referência Vencendo em 10 dias</h3><ul>`;
          textBody += `
--- PADRÕES VENCENDO EM 10 DIAS ---
`;
          upcomingStandards.forEach(s => {
            htmlBody += `<li><b>${s.name}</b> (Cert: ${s.cert}) - Vencimento: ${s.expirationDate}</li>`;
            textBody += `- ${s.name} (Cert: ${s.cert}) - Vencimento: ${s.expirationDate}
`;
          });
          htmlBody += `</ul>`;
        }

        if (upcomingHealthDocs.length > 0) {
          htmlBody += `<h3>🛡️ Programas de Saúde (PGR, PCMSO, LTCAT) Vencendo em até 30 dias ou Vencidos</h3><ul>`;
          textBody += `
--- PROGRAMAS DE SAÚDE (PGR, PCMSO) VENCENDO EM ATÉ 30 DIAS OU VENCIDOS ---
`;
          upcomingHealthDocs.forEach(h => {
            const statusLabel = h.days < 0 ? `VENCIDO HÁ ${Math.abs(h.days)} DIAS` : h.days === 0 ? 'VENCE HOJE' : `Vence em ${h.days} dias`;
            htmlBody += `<li><b>[${h.docType}] ${h.title}</b> - ${statusLabel} (Validade: ${h.expirationDate})</li>`;
            textBody += `- [${h.docType}] ${h.title} - ${statusLabel} (Validade: ${h.expirationDate})
`;
          });
          htmlBody += `</ul>`;
        }

        htmlBody += `<br/><p>Acesse o portal para mais detalhes ou para regularizar as pendências.</p><p>Atenciosamente,<br/>COMANINS Metrology Suite</p>`;
        textBody += `
Acesse o portal para mais detalhes.

Atenciosamente,
COMANINS Metrology Suite`;

        // Destinatários solicitados
        const recipients = "comercial@comanins.com.br, fabio.teixeira@comanins.com.br, financeiro@comanins.com.br, manutencao@comanins.com.br, isidro.teixeira@comanins.com.br";

        const info = await transporter.sendMail({
          from: `"COMANINS Notificações" <${SMTP_USER}>`,
          to: recipients,
          subject: `Notificações COMANINS - Dia ${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`,
          text: textBody,
          html: htmlBody
        });

        console.log("Email de notificações enviado: %s", info.messageId);
      } else {
        console.log("Configurações SMTP ausentes. O email não foi enviado.");
      }
    } else {
      console.log("Nenhuma notificação programada para hoje.");
    }
  } catch (error) {
    console.error("Erro na rotina de notificações diárias:", error);
  }
}

cron.schedule('0 8 * * *', runDailyNotifications);
// Três tentativas no mesmo dia evitam perder o aviso por indisponibilidade transitória do SMTP.
// O log idempotente impede e-mails duplicados quando a primeira tentativa já foi entregue.
cron.schedule('0 8,12,16 * * *', runRentalDueNotifications);

app.post("/api/send-health-program-alert", requireAuth, requireInternalAccount, requireEditModule('health_programs'), emailApiRateLimit, async (req: AuthRequest, res) => {
  const { docs } = req.body;
  const HEALTH_RECIPIENTS = "comercial@comanins.com.br, fabio.teixeira@comanins.com.br, financeiro@comanins.com.br, manutencao@comanins.com.br, isidro.teixeira@comanins.com.br";

  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;

  let htmlDocsList = "";
  let textDocsList = "";

  if (Array.isArray(docs) && docs.length > 0) {
    htmlDocsList = docs.map((d: any) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-weight: bold; color: #1e293b;">${d.title} (${d.docType})</td>
        <td style="padding: 10px; color: #64748b;">${d.issueDate ? new Date(d.issueDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
        <td style="padding: 10px; font-weight: bold; color: ${d.daysRemaining < 0 ? '#dc2626' : '#d97706'};">${d.expirationDate ? new Date(d.expirationDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
        <td style="padding: 10px;">
          <span style="background-color: ${d.daysRemaining < 0 ? '#fef2f2' : '#fffbe2'}; color: ${d.daysRemaining < 0 ? '#991b1b' : '#854d0e'}; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">
            ${d.daysRemaining < 0 ? `Vencido há ${Math.abs(d.daysRemaining)} dias` : d.daysRemaining === 0 ? 'Vence Hoje' : `Vence em ${d.daysRemaining} dias`}
          </span>
        </td>
      </tr>
    `).join('');

    textDocsList = docs.map((d: any) => `- ${d.title} (${d.docType}) | Validade: ${d.expirationDate} | Status: ${d.daysRemaining < 0 ? 'VENCIDO' : 'A VENCER'}`).join('\n');
  } else {
    htmlDocsList = `<tr><td colspan="4" style="padding: 12px; text-align: center; color: #64748b;">Nenhum documento com vencimento próximo.</td></tr>`;
  }

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; background-color: #ffffff; color: #0f172a;">
      <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="color: #1e40af; margin: 0; font-size: 20px;">🛡️ Alerta de Validade: Programas de Saúde e Segurança (SST)</h2>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">COMANINS Metrology Suite - Sistema de Controle de Documentos Regulatórios</p>
      </div>

      <p>Atenção Gestão e Comercial,</p>
      <p>Este é um alerta referente ao controle de validade dos documentos de <b>Programa de Saúde e Segurança do Trabalho (PGR, PCMSO, LTCAT, etc.)</b> da empresa.</p>

      <div style="margin: 20px 0; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
          <thead>
            <tr style="background-color: #f1f5f9; color: #334155;">
              <th style="padding: 10px;">Documento</th>
              <th style="padding: 10px;">Emissão</th>
              <th style="padding: 10px;">Validade</th>
              <th style="padding: 10px;">Situação</th>
            </tr>
          </thead>
          <tbody>
            ${htmlDocsList}
          </tbody>
        </table>
      </div>

      <p style="font-size: 13px; color: #475569; background-color: #f8fafc; padding: 12px; border-radius: 6px; border-left: 4px solid #2563eb;">
        <b>Destinatários Notificados:</b><br/>
        comercial@comanins.com.br<br/>
        fabio.teixeira@comanins.com.br<br/>
        financeiro@comanins.com.br<br/>
        manutencao@comanins.com.br<br/>
        isidro.teixeira@comanins.com.br
      </p>

      <br/>
      <p style="font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px;">
        Notificação automática gerada pelo sistema COMANINS Metrology Suite.
      </p>
    </div>
  `;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: `"COMANINS Segurança e Saúde" <${SMTP_USER}>`,
        to: HEALTH_RECIPIENTS,
        subject: `[ALERTA COMANINS] Controle de Validade - Programas de Saúde (PGR/PCMSO)`,
        html: htmlBody,
        text: `Alerta COMANINS - Programas de Saúde:\n\n${textDocsList}\n\nDestinatários: ${HEALTH_RECIPIENTS}`
      });

      return res.json({ success: true, emailSent: true, recipients: HEALTH_RECIPIENTS });
    } catch (err: any) {
      console.error("[HEALTH ALERT] Erro ao enviar e-mail via SMTP:", err);
      return res.json({ success: false, error: err.message, emailSent: false });
    }
  } else {
    console.log("[HEALTH ALERT] SMTP não configurado. Notificação enviada em modo de teste para:", HEALTH_RECIPIENTS);
    return res.json({ success: true, emailSent: false, smtpNotConfigured: true, recipients: HEALTH_RECIPIENTS });
  }
});


app.post("/api/test-notifications", requireAuth, requireAdministratorAccount, adminApiRateLimit, async (_req: AuthRequest, res) => {
  await runDailyNotifications();
  await runRentalDueNotifications();
  res.json({ success: true, message: "Notificações gerais e de locação verificadas." });
});

app.post("/api/generate-birthday-message", requireAuth, requireInternalAccount, aiApiRateLimit, async (req: AuthRequest, res) => {
  let name = asLimitedString(req.body?.name, 120);
  try {
    const requesterProfile = await findPortalUserForAuth(req.user);
    name = asLimitedString(requesterProfile?.name || name, 120);
  } catch {
    // The signed internal token already passed authorization; keep the supplied
    // display name only as a fallback if Firestore is temporarily unavailable.
  }
  if (!name) return res.status(400).json({ error: "Nome não fornecido" });

  const genAI = getGeminiClient();
  if (!genAI) {
    return res.json({ message: `Feliz Aniversário, ${name}! A equipe COMANINS deseja a você um excelente dia, com muita saúde, paz e sucesso.` });
  }

  try {
    const prompt = `Você é a inteligência artificial do sistema COMANINS Metrology. Hoje é o aniversário do colaborador ${name}. Escreva uma mensagem curta (máximo 3 frases), calorosa, amigável e profissional de feliz aniversário para ele, que aparecerá quando ele fizer login no sistema. Não use aspas na resposta.`;
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });
    return res.json({ message: result.text || `Feliz Aniversário, ${name}!` });
  } catch (error) {
    console.error("Erro ao gerar mensagem de aniversário:", error);
    return res.json({ message: `Feliz Aniversário, ${name}! A equipe COMANINS deseja a você um dia incrível!` });
  }
});





const passwordResetGenericResponse = {
  success: true,
  message: 'Se a conta estiver ativa e possuir um e-mail de recuperação válido, as instruções serão enviadas.',
};

app.post('/api/auth/request-password-reset', passwordResetRateLimit, async (req: AuthRequest, res) => {
  res.set('Cache-Control', 'no-store');

  try {
    if (!adminAuth || !firestoreDb) {
      return res.status(503).json({
        error: 'AUTH_SERVICE_UNAVAILABLE',
        message: 'Serviço de recuperação temporariamente indisponível. Tente novamente mais tarde.',
      });
    }

    const smtpHost = String(process.env.SMTP_HOST || '').trim();
    const smtpUser = String(process.env.SMTP_USER || '').trim();
    const smtpPass = String(process.env.SMTP_PASS || '').trim();
    const parsedPort = Number(process.env.SMTP_PORT || 587);
    const smtpPort = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 587;

    // Check infrastructure before looking up the username. This keeps service
    // failures from becoming an account-enumeration signal.
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.error('[Password reset] SMTP configuration is incomplete.');
      return res.status(503).json({
        error: 'EMAIL_SERVICE_UNAVAILABLE',
        message: 'Serviço de recuperação temporariamente indisponível. Tente novamente mais tarde.',
      });
    }

    const rawInput = asLimitedString(req.body?.username, 120).trim().toLowerCase();
    if (!rawInput) {
      return res.json(passwordResetGenericResponse);
    }

    const usersRef = firestoreDb.collection('portalUsers');
    let matchedDoc: any = null;

    // 1. If user typed technical email (e.g. usuario@comanins.internal) or plain username
    let normalizedUser = rawInput;
    if (normalizedUser.endsWith('@comanins.internal')) {
      normalizedUser = normalizedUser.slice(0, -'@comanins.internal'.length).trim();
    }

    if (!normalizedUser.includes('@')) {
      const expectedTechnicalEmail = `${normalizedUser}@comanins.internal`;
      const byUsername = await usersRef.where('username', '==', normalizedUser).limit(2).get();
      const candidates = byUsername.empty
        ? await usersRef.where('authEmail', '==', expectedTechnicalEmail).limit(2).get()
        : byUsername;

      if (candidates.size === 1) {
        matchedDoc = candidates.docs[0];
      } else if (candidates.empty) {
        // Case-insensitive / legacy fallback
        const allUsersSnap = await usersRef.get();
        const found = allUsersSnap.docs.filter((doc) => {
          const d = doc.data();
          return (
            normalizeAccessValue(d.username) === normalizedUser ||
            normalizeAccessValue(d.authEmail) === expectedTechnicalEmail
          );
        });
        if (found.length === 1) {
          matchedDoc = found[0];
        }
      }
    } else {
      // 2. User typed an email address (workEmail or personalEmail)
      const byWorkEmail = await usersRef.where('workEmail', '==', rawInput).limit(2).get();
      if (byWorkEmail.size === 1) {
        matchedDoc = byWorkEmail.docs[0];
      } else {
        const byPersonalEmail = await usersRef.where('personalEmail', '==', rawInput).limit(2).get();
        if (byPersonalEmail.size === 1) {
          matchedDoc = byPersonalEmail.docs[0];
        } else {
          // Case-insensitive email search
          const allUsersSnap = await usersRef.get();
          const found = allUsersSnap.docs.filter((doc) => {
            const d = doc.data();
            return (
              normalizeAccessValue(d.workEmail) === rawInput ||
              normalizeAccessValue(d.personalEmail) === rawInput
            );
          });
          if (found.length === 1) {
            matchedDoc = found[0];
          }
        }
      }
    }

    if (!matchedDoc) {
      return res.json(passwordResetGenericResponse);
    }

    const profile: any = { id: matchedDoc.id, ...matchedDoc.data() };
    const resolvedUsername = normalizeAccessValue(profile.username);
    if (!resolvedUsername) {
      return res.json(passwordResetGenericResponse);
    }

    const status = normalizeAccessValue(profile.status);
    if (status === 'desligado') {
      return res.json(passwordResetGenericResponse);
    }

    const workEmail = String(profile.workEmail || '').trim().toLowerCase();
    const personalEmail = String(profile.personalEmail || '').trim().toLowerCase();
    const recoveryEmail = isValidEmailAddress(workEmail)
      ? workEmail
      : isValidEmailAddress(personalEmail)
        ? personalEmail
        : '';
    const authUid = String(profile.authUid || '').trim();
    const expectedTechnicalEmail = `${resolvedUsername}@comanins.internal`;

    if (!recoveryEmail) {
      console.warn(`[Password reset] No valid recovery email for portal user ${matchedDoc.id}.`);
      return res.json(passwordResetGenericResponse);
    }

    let authUser: any = null;
    if (authUid) {
      try {
        authUser = await adminAuth.getUser(authUid);
      } catch (error: any) {
        if (error?.code !== 'auth/user-not-found') throw error;
      }
    }

    // If authUid was missing or stale, resolve by technical email directly
    if (!authUser) {
      try {
        authUser = await adminAuth.getUserByEmail(expectedTechnicalEmail);
        if (authUser?.uid && matchedDoc.ref) {
          // Self-heal the authUid linkage
          await matchedDoc.ref.update({ authUid: authUser.uid, authEmail: expectedTechnicalEmail });
        }
      } catch (error: any) {
        if (error?.code === 'auth/user-not-found') {
          console.warn(`[Password reset] Firebase Auth user not found for portal user ${matchedDoc.id} (${expectedTechnicalEmail}).`);
          return res.json(passwordResetGenericResponse);
        }
        throw error;
      }
    }

    const technicalEmail = String(authUser.email || '').trim().toLowerCase();
    const accountType = normalizeAccessValue(authUser.customClaims?.accountType);
    const claimedPortalUserId = String(authUser.customClaims?.portalUserId || '').trim();

    if (
      authUser.disabled ||
      technicalEmail !== expectedTechnicalEmail ||
      (accountType && accountType !== 'internal') ||
      (claimedPortalUserId && claimedPortalUserId !== matchedDoc.id)
    ) {
      console.warn(`[Password reset] Auth binding rejected for portal user ${matchedDoc.id}.`);
      return res.json(passwordResetGenericResponse);
    }

    const resetLink = await adminAuth.generatePasswordResetLink(technicalEmail);
    const displayName = asLimitedString(profile.name || resolvedUsername, 120) || resolvedUsername;
    const safeDisplayName = escapeHtml(displayName);
    const safeResetLink = escapeHtml(resetLink);

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.sendMail({
      from: `"COMANINS - Acesso ao Portal" <${smtpUser}>`,
      to: recoveryEmail,
      subject: 'Redefinição de senha - Portal Interno COMANINS',
      text: [
        `Olá, ${displayName}.`,
        '',
        'Recebemos uma solicitação para redefinir a senha do seu acesso ao Portal Interno COMANINS.',
        'Use o link abaixo para cadastrar uma nova senha:',
        '',
        resetLink,
        '',
        'Se você não solicitou esta alteração, ignore esta mensagem. Não compartilhe este link.',
        '',
        'COMANINS',
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;line-height:1.6;">
          <h2 style="color:#1d4ed8;">Redefinição de senha</h2>
          <p>Olá, <strong>${safeDisplayName}</strong>.</p>
          <p>Recebemos uma solicitação para redefinir a senha do seu acesso ao Portal Interno COMANINS.</p>
          <p style="margin:28px 0;">
            <a href="${safeResetLink}" style="background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;display:inline-block;">
              Redefinir minha senha
            </a>
          </p>
          <p style="font-size:13px;color:#475569;">Se você não solicitou esta alteração, ignore esta mensagem. Não compartilhe este link.</p>
          <p style="font-size:13px;color:#475569;">COMANINS</p>
        </div>
      `,
    });

    console.info(`[Password reset] Reset link sent successfully for portal user ${matchedDoc.id} to ${recoveryEmail}.`);
    return res.json(passwordResetGenericResponse);
  } catch (error) {
    console.error('[Password reset] Request failed:', error);
    return res.status(500).json({
      error: 'PASSWORD_RESET_FAILED',
      message: 'Serviço de recuperação temporariamente indisponível. Tente novamente mais tarde.',
    });
  }
});

app.post("/api/auth/sync-internal-profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user || !adminAuth || !firestoreDb) {
      return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
    }

    const profile = await syncInternalAuthProfile(req.user);
    if (!profile) {
      return res.status(404).json({ error: 'PORTAL_USER_NOT_FOUND' });
    }

    return res.json({
      success: true,
      user: sanitizePortalUserForClient(profile),
      claims: buildInternalClaims(profile),
    });
  } catch (error: any) {
    if (error?.message === 'AUTH_UID_CONFLICT') {
      return res.status(409).json({ error: 'AUTH_UID_CONFLICT' });
    }
    if (error?.message === 'NOT_INTERNAL_ACCOUNT') {
      return res.status(403).json({ error: 'NOT_INTERNAL_ACCOUNT' });
    }
    console.error('Sync internal profile error:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.get('/api/internal/portal-users', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user || !firestoreDb) {
      return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
    }

    const requesterProfile = await requireInternalPortalRequester(req.user);
    const canReadFullProfiles =
      isAdministratorProfile(requesterProfile) || isRhProfile(requesterProfile);

    const snapshot = await firestoreDb.collection('portalUsers').get();
    const users = snapshot.docs.map((doc) => {
      const profile = { id: doc.id, ...doc.data() };
      return canReadFullProfiles
        ? sanitizePortalUserForClient(profile)
        : sanitizePortalUserForDirectory(profile);
    });

    users.sort((a: any, b: any) =>
      String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR')
    );

    return res.json({
      success: true,
      accessMode: canReadFullProfiles ? 'full' : 'directory',
      users,
    });
  } catch (error: any) {
    if (error?.message === 'NOT_INTERNAL_ACCOUNT') {
      return res.status(403).json({ error: 'NOT_INTERNAL_ACCOUNT' });
    }
    if (error?.message === 'INTERNAL_PROFILE_NOT_FOUND') {
      return res.status(404).json({ error: 'INTERNAL_PROFILE_NOT_FOUND' });
    }
    console.error('Internal portal users directory error:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.get(
  '/api/internal/access-profiles',
  requireAuth,
  requireAdministratorAccount,
  adminApiRateLimit,
  async (_req: AuthRequest, res) => {
    try {
      const profiles = await listAccessProfiles();
      return res.json({
        success: true,
        modules: ACCESS_MODULE_CATALOG,
        profiles,
      });
    } catch (error) {
      console.error('List access profiles error:', error);
      return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
  },
);

app.put(
  '/api/internal/access-profiles',
  requireAuth,
  requireAdministratorAccount,
  adminApiRateLimit,
  async (req: AuthRequest, res) => {
    try {
      if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
      const requester = await requireInternalPortalRequester(req.user);
      const requestedId = asLimitedString(req.body?.id, 100);
      const isCreating = !requestedId;
      const profileId = requestedId || `profile_${randomBytes(8).toString('hex')}`;

      if (profileId === 'administrator') {
        return res.status(400).json({ error: 'ADMINISTRATOR_PROFILE_IS_IMMUTABLE' });
      }
      if (!/^[a-z0-9_-]{3,100}$/i.test(profileId)) {
        return res.status(400).json({ error: 'INVALID_ACCESS_PROFILE_ID' });
      }

      const name = asLimitedString(req.body?.name, 100);
      const description = asLimitedString(req.body?.description, 400);
      const modulePermissions = sanitizeModulePermissions(
        req.body?.modulePermissions,
        req.body?.modules,
      );
      const modules = modulesFromPermissions(modulePermissions);
      if (!name) return res.status(400).json({ error: 'ACCESS_PROFILE_NAME_REQUIRED' });
      if (modules.length === 0) {
        return res.status(400).json({ error: 'ACCESS_PROFILE_REQUIRES_MODULE' });
      }

      const profileRef = firestoreDb.collection('accessProfiles').doc(profileId);
      const currentSnapshot = await profileRef.get();
      if (isCreating && currentSnapshot.exists) {
        return res.status(409).json({ error: 'ACCESS_PROFILE_ALREADY_EXISTS' });
      }

      const current = currentSnapshot.data() || {};
      const nowIso = new Date().toISOString();
      const actorName = asLimitedString(requester?.name || requester?.username, 160) || 'Administrador';
      const nextVersion = Math.max(1, Number(current.version || 0) + 1);
      const storedProfile = {
        name,
        description,
        modules,
        modulePermissions,
        active: true,
        version: nextVersion,
        createdAt: current.createdAt || nowIso,
        createdBy: current.createdBy || actorName,
        updatedAt: nowIso,
        updatedBy: actorName,
      };
      await profileRef.set(storedProfile, { merge: true });

      const linkedUsers = await firestoreDb
        .collection('portalUsers')
        .where('accessProfileId', '==', profileId)
        .get();
      await Promise.all(
        linkedUsers.docs.map(async (doc) => {
          try {
            await refreshInternalUserClaims({ id: doc.id, ...doc.data() });
          } catch (error) {
            console.error(`Could not refresh claims for portal user ${doc.id}:`, error);
          }
        }),
      );

      await firestoreDb.collection('systemAuditLogs').add({
        action: isCreating ? 'ACCESS_PROFILE_CREATED' : 'ACCESS_PROFILE_UPDATED',
        entityType: 'accessProfile',
        entityId: profileId,
        actorUid: String(req.user?.uid || ''),
        actorName,
        actorRole: String(requester?.accessProfileName || requester?.permissionLevel || 'Administrador'),
        createdAt: nowIso,
        immutable: true,
        summary: `${isCreating ? 'Perfil de acesso criado' : 'Perfil de acesso atualizado'}: ${name}`,
        metadata: {
          modules,
          modulePermissions,
          editableModules: editableModulesFromPermissions(modulePermissions),
          version: nextVersion,
          affectedUsers: linkedUsers.size,
        },
      });

      const profile = normalizeStoredAccessProfile(
        profileId,
        storedProfile,
        getDefaultAccessProfile(profileId),
      );
      return res.json({ success: true, profile, affectedUsers: linkedUsers.size });
    } catch (error) {
      console.error('Save access profile error:', error);
      return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
  },
);

app.put(
  '/api/internal/portal-users/:id/access-profile',
  requireAuth,
  requireAdministratorAccount,
  adminApiRateLimit,
  async (req: AuthRequest, res) => {
    try {
      if (!firestoreDb) return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
      const requester = await requireInternalPortalRequester(req.user);
      const targetId = asLimitedString(req.params.id, 160);
      const accessProfileId = asLimitedString(req.body?.accessProfileId, 100);
      if (!targetId || !accessProfileId) {
        return res.status(400).json({ error: 'ACCESS_PROFILE_ASSIGNMENT_REQUIRED' });
      }

      const accessProfile = await getAccessProfileById(accessProfileId);
      if (!accessProfile || accessProfile.active === false) {
        return res.status(404).json({ error: 'ACCESS_PROFILE_NOT_FOUND' });
      }
      if (requester.id === targetId && accessProfile.id !== 'administrator') {
        return res.status(409).json({ error: 'CANNOT_REMOVE_OWN_ADMIN_ACCESS' });
      }

      const targetRef = firestoreDb.collection('portalUsers').doc(targetId);
      const targetSnapshot = await targetRef.get();
      if (!targetSnapshot.exists) {
        return res.status(404).json({ error: 'PORTAL_USER_NOT_FOUND' });
      }

      const target: any = { id: targetSnapshot.id, ...targetSnapshot.data() };
      const permissionLevel = legacyPermissionLevelForProfile(accessProfile.id);
      const nowIso = new Date().toISOString();
      await targetRef.update({
        accessProfileId: accessProfile.id,
        permissionLevel,
        accessProfileUpdatedAt: nowIso,
        accessProfileUpdatedBy: String(requester?.name || requester?.username || 'Administrador'),
      });

      const hydratedTarget = await refreshInternalUserClaims({
        ...target,
        accessProfileId: accessProfile.id,
        permissionLevel,
      });
      await firestoreDb.collection('systemAuditLogs').add({
        action: 'USER_ACCESS_PROFILE_ASSIGNED',
        entityType: 'portalUser',
        entityId: targetId,
        actorUid: String(req.user?.uid || ''),
        actorName: String(requester?.name || requester?.username || 'Administrador'),
        actorRole: String(requester?.accessProfileName || requester?.permissionLevel || 'Administrador'),
        createdAt: nowIso,
        immutable: true,
        summary: `Perfil ${accessProfile.name} atribuído a ${String(target?.name || target?.username || targetId)}`,
        metadata: {
          accessProfileId: accessProfile.id,
          accessProfileName: accessProfile.name,
          professionalRolePreserved: String(target?.role || ''),
        },
      });

      return res.json({ success: true, user: sanitizePortalUserForClient(hydratedTarget) });
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') {
        return res.status(409).json({ error: 'AUTH_USER_NOT_FOUND' });
      }
      console.error('Assign access profile error:', error);
      return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
  },
);

app.post(
  '/api/internal/intakes',
  requireAuth,
  requireInternalAccount,
  requireEditModule('material_intake'),
  writeApiRateLimit,
  async (req: AuthRequest, res) => {
    try {
      if (!firestoreDb || !req.user) {
        return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
      }

      const requester = await requireInternalPortalRequester(req.user);
      const numEntrada = normalizeIntakeNumberServer(req.body?.numEntrada);
      const clientId = asLimitedString(req.body?.clientId, 180);
      const dataEntrada = asLimitedString(req.body?.dataEntrada, 32);
      const dataPrevistaSaida = asLimitedString(req.body?.dataPrevistaSaida, 32);
      const contato = asLimitedString(req.body?.contato, 300);
      const rawRows = Array.isArray(req.body?.rows) ? req.body.rows : [];

      if (!numEntrada || !clientId || !dataEntrada) {
        return res.status(400).json({ error: 'INVALID_INTAKE_DATA' });
      }
      if (rawRows.length === 0 || rawRows.length > 500) {
        return res.status(400).json({ error: 'INVALID_INTAKE_ROWS' });
      }

      const rows = rawRows.map((row: any) => {
        const quantity = Number(row?.quant);
        if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000) {
          throw new Error('INVALID_INTAKE_ROW_QUANTITY');
        }
        return {
          quant: quantity,
          descricao: asLimitedString(row?.descricao, 400),
          escala: asLimitedString(row?.escala, 200),
          undMedida: asLimitedString(row?.undMedida, 100),
          obs: asLimitedString(row?.obs, 1000),
        };
      });

      const intakePayloadSize = Buffer.byteLength(
        JSON.stringify({ numEntrada, clientId, dataEntrada, dataPrevistaSaida, contato, rows }),
        'utf8',
      );
      if (intakePayloadSize > 750 * 1024) {
        return res.status(413).json({ error: 'INTAKE_TOO_LARGE' });
      }

      // Compatibilidade com registros anteriores ao lock de unicidade. A consulta
      // evita reutilizar números já existentes; o lock transacional abaixo fecha
      // a corrida entre novas requisições concorrentes.
      const duplicateSnapshot = await firestoreDb
        .collection('savedIntakes')
        .where('numEntrada', '==', numEntrada)
        .limit(10)
        .get();
      const existingDuplicate = activeIntakeFromSnapshot(duplicateSnapshot);
      if (existingDuplicate) {
        return res.status(409).json({
          error: 'INTAKE_NUMBER_ALREADY_EXISTS',
          intakeId: existingDuplicate.id,
          numEntrada,
        });
      }

      const nowIso = new Date().toISOString();
      const intakeId = `${Date.now()}_${randomBytes(5).toString('hex')}`;
      const intakeRef = firestoreDb.collection('savedIntakes').doc(intakeId);
      const sequenceRef = firestoreDb.collection('systemSettings').doc('intakeSequence');
      const lockRef = firestoreDb.collection('intakeNumberLocks').doc(intakeNumberLockId(numEntrada));
      const clientRef = firestoreDb.collection('clients').doc(clientId);
      const auditRef = firestoreDb.collection('systemAuditLogs').doc();
      const actorName = asLimitedString(requester?.name || requester?.username || req.user?.email, 160) || 'Usuário interno';
      const actorUid = asLimitedString(req.user.uid, 160);
      const actorRole = asLimitedString(requester?.accessProfileName || requester?.permissionLevel || requester?.role, 100);

      const intake = {
        id: intakeId,
        numEntrada,
        clientId,
        dataEntrada,
        dataPrevistaSaida,
        contato,
        rows,
        createdAt: nowIso,
        createdBy: actorName,
        createdByUid: actorUid,
        updatedAt: nowIso,
        updatedBy: actorName,
      };

      let nextSequence: { prefix: string; nextNumber: number } | null = null;

      await firestoreDb.runTransaction(async (transaction) => {
        const lockSnapshot = await transaction.get(lockRef);
        const sequenceSnapshot = await transaction.get(sequenceRef);
        const clientSnapshot = await transaction.get(clientRef);

        if (!clientSnapshot.exists) {
          const error: any = new Error('CLIENT_PROFILE_NOT_FOUND');
          error.code = 'CLIENT_PROFILE_NOT_FOUND';
          throw error;
        }

        if (lockSnapshot.exists) {
          const lockData = lockSnapshot.data() || {};
          const error: any = new Error('INTAKE_NUMBER_ALREADY_EXISTS');
          error.code = 'INTAKE_NUMBER_ALREADY_EXISTS';
          error.intakeId = String(lockData.intakeId || '');
          throw error;
        }

        const sequenceData = sequenceSnapshot.exists ? sequenceSnapshot.data() || {} : {};
        const prefix = asLimitedString(sequenceData.prefix || 'C-', 20) || 'C-';
        const currentNextNumber = Math.max(1, Number(sequenceData.nextNumber || 19928) || 19928);
        const trailingMatch = numEntrada.match(/^(.*?)(\d+)$/);
        let computedNextNumber = currentNextNumber;
        if (trailingMatch) {
          const numberPrefix = trailingMatch[1].toUpperCase();
          const numericPart = Number(trailingMatch[2]);
          if (
            numberPrefix === prefix.toUpperCase() &&
            Number.isSafeInteger(numericPart) &&
            numericPart >= currentNextNumber
          ) {
            computedNextNumber = numericPart + 1;
          }
        }
        nextSequence = { prefix, nextNumber: computedNextNumber };

        transaction.create(lockRef, {
          normalizedNumber: numEntrada,
          intakeId,
          createdAt: nowIso,
          createdByUid: actorUid,
        });
        transaction.create(intakeRef, intake);
        if (!sequenceSnapshot.exists || computedNextNumber !== currentNextNumber) {
          transaction.set(sequenceRef, { prefix, nextNumber: computedNextNumber }, { merge: true });
        }
        transaction.set(auditRef, {
          action: 'MATERIAL_INTAKE_CREATED',
          entityType: 'savedIntake',
          entityId: intakeId,
          actorUid,
          actorName,
          actorRole,
          createdAt: nowIso,
          immutable: true,
          summary: `Entrada de material criada: ${numEntrada}`,
          metadata: {
            numEntrada,
            clientId,
            rowCount: rows.length,
            uniquenessLock: lockRef.id,
          },
        });
      });

      return res.status(201).json({ success: true, intake, sequence: nextSequence });
    } catch (error: any) {
      const code = String(error?.code || error?.message || '');
      if (code.includes('INTAKE_NUMBER_ALREADY_EXISTS')) {
        return res.status(409).json({
          error: 'INTAKE_NUMBER_ALREADY_EXISTS',
          intakeId: String(error?.intakeId || ''),
        });
      }
      if (code.includes('INVALID_INTAKE_ROW_QUANTITY')) {
        return res.status(400).json({ error: 'INVALID_INTAKE_ROW_QUANTITY' });
      }
      if (code.includes('CLIENT_PROFILE_NOT_FOUND')) {
        return res.status(404).json({ error: 'CLIENT_PROFILE_NOT_FOUND' });
      }
      console.error('Atomic material intake creation failed:', error);
      return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
  },
);

app.get('/api/internal/clients', requireAuth, requireInternalAccount, requireAccessModule('clients'), async (req: AuthRequest, res) => {
  try {
    if (!req.user || !firestoreDb) {
      return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
    }
    await requireInternalPortalRequester(req.user);
    const snapshot = await firestoreDb.collection('clients').get();
    const clients = snapshot.docs
      .map((doc) => sanitizeClientForInternalDirectory({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR'));
    return res.json({ success: true, clients });
  } catch (error: any) {
    if (error?.message === 'NOT_INTERNAL_ACCOUNT') return res.status(403).json({ error: 'NOT_INTERNAL_ACCOUNT' });
    if (error?.message === 'INTERNAL_PROFILE_NOT_FOUND') return res.status(404).json({ error: 'INTERNAL_PROFILE_NOT_FOUND' });
    console.error('Internal clients directory error:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.post('/api/internal/upload-operational-image', requireAuth, requireInternalAccount, writeApiRateLimit, async (req: AuthRequest, res) => {
  try {
    if (!req.user || !adminStorage || !adminStorageBucketName) {
      return res.status(503).json({ error: 'STORAGE_SERVICE_UNAVAILABLE' });
    }
    await requireInternalPortalRequester(req.user);

    const purpose = String(req.body?.purpose || '').trim();
    const entityId = safeStorageSegmentServer(req.body?.entityId);
    const sequence = Math.max(0, Math.min(9999, Number(req.body?.sequence || 0) || 0));
    const allowed = new Set(['instrument-registration', 'instrument-calibrated', 'intake-entry']);
    if (!allowed.has(purpose)) return res.status(400).json({ error: 'INVALID_UPLOAD_PURPOSE' });
    const requiredModule: AccessModuleId = purpose === 'intake-entry'
      ? 'material_intake'
      : 'calibration';
    if (!userCanEditModule(req.user as any, requiredModule)) {
      return res.status(403).json({ error: 'MODULE_EDIT_DENIED', moduleId: requiredModule });
    }

    const { buffer, contentType, extension } = decodeOperationalDataUrl(req.body?.imageDataUrl);
    const timestamp = Date.now();
    const path = purpose === 'intake-entry'
      ? `intake-entry-photos/${entityId}/${timestamp}_${sequence}.${extension}`
      : `instrument-photos/${entityId}/${purpose === 'instrument-registration' ? 'registration' : 'calibrated'}/${timestamp}.${extension}`;

    const bucket = adminStorage.bucket(adminStorageBucketName);
    const file = bucket.file(path);
    const downloadToken = randomBytes(16).toString('hex');
    await file.save(buffer, {
      resumable: false,
      validation: 'crc32c',
      metadata: {
        contentType,
        cacheControl: 'private,max-age=3600',
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
          uploadedByUid: req.user.uid,
          uploadedAt: new Date().toISOString(),
          purpose,
        },
      },
    });
    const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(path)}?alt=media&token=${downloadToken}`;
    return res.json({ success: true, url, path });
  } catch (error: any) {
    if (error?.message === 'INVALID_IMAGE_DATA') return res.status(400).json({ error: 'INVALID_IMAGE_DATA' });
    if (error?.message === 'IMAGE_TOO_LARGE') return res.status(413).json({ error: 'IMAGE_TOO_LARGE' });
    console.error('Operational image upload error:', error);
    return res.status(500).json({ error: 'UPLOAD_FAILED' });
  }
});


const corporateFileRawBody = express.raw({ type: () => true, limit: '20mb' });

app.post('/api/internal/corporate-files', requireAuth, requireInternalAccount, writeApiRateLimit, corporateFileRawBody, async (req: AuthRequest, res) => {
  try {
    if (!req.user || !adminStorage || !adminStorageBucketName || !firestoreDb) {
      return res.status(503).json({ error: 'STORAGE_SERVICE_UNAVAILABLE' });
    }
    const purpose = String(req.headers['x-upload-purpose'] || '').trim();
    if (!CORPORATE_FILE_PURPOSES.has(purpose)) {
      return res.status(400).json({ error: 'INVALID_UPLOAD_PURPOSE' });
    }
    if (!canUploadCorporatePurpose(req.user, purpose)) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const entityId = safeStorageSegmentServer(req.headers['x-entity-id']);
    const documentType = asLimitedString(decodeUploadHeader(req.headers['x-document-type']), 120) || 'documento';
    const originalFileName = safeStorageFileNameServer(req.headers['x-file-name']);
    const contentType = resolveCorporateContentType(String(req.headers['content-type'] || ''), originalFileName);
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');

    if (!entityId || entityId === 'unknown') return res.status(400).json({ error: 'ENTITY_ID_REQUIRED' });
    if (!CORPORATE_FILE_CONTENT_TYPES.has(contentType)) return res.status(415).json({ error: 'UNSUPPORTED_FILE_TYPE' });
    if (!body.length) return res.status(400).json({ error: 'EMPTY_FILE' });
    if (body.length > CORPORATE_FILE_MAX_BYTES) return res.status(413).json({ error: 'FILE_TOO_LARGE' });

    const nowIso = new Date().toISOString();
    const version = Date.now();
    const sha256 = createHash('sha256').update(body).digest('hex');
    const suffix = randomBytes(5).toString('hex');
    const storagePath = `${corporateFileFolder(purpose, entityId)}/${version}_${suffix}_${originalFileName}`;
    const bucket = adminStorage.bucket(adminStorageBucketName);
    const file = bucket.file(storagePath);
    const actorName = asLimitedString(req.user?.name || req.user?.username || req.user?.email, 160) || 'Usuário interno';
    const actorUid = asLimitedString(req.user?.uid, 160);
    const actorRole = asLimitedString(req.user?.permissionLevel || req.user?.role, 100);

    await file.save(body, {
      resumable: false,
      validation: 'crc32c',
      metadata: {
        contentType,
        cacheControl: 'private,no-store,max-age=0',
        metadata: {
          purpose,
          employeeId: purpose === 'health-program' || purpose === 'finance-document' ? '' : entityId,
          entityId,
          documentType,
          originalFileName,
          sha256,
          version: String(version),
          uploadedByUid: actorUid,
          uploadedBy: actorName,
          uploadedAt: nowIso,
        },
      },
    });

    await firestoreDb.collection('systemAuditLogs').add({
      action: 'CORPORATE_FILE_UPLOADED',
      entityType: purpose,
      entityId,
      actorUid,
      actorName,
      actorRole,
      createdAt: nowIso,
      immutable: true,
      summary: `Arquivo corporativo enviado: ${originalFileName}`,
      metadata: {
        storagePath,
        documentType,
        contentType,
        size: body.length,
        sha256,
        version,
      },
    });

    return res.json({
      success: true,
      storagePath,
      fileName: originalFileName,
      contentType,
      size: body.length,
      sha256,
      version,
    });
  } catch (error) {
    console.error('Corporate file upload error:', error);
    return res.status(500).json({ error: 'UPLOAD_FAILED' });
  }
});

app.post('/api/internal/corporate-files/download', requireAuth, requireInternalAccount, async (req: AuthRequest, res) => {
  try {
    if (!req.user || !adminStorage || !adminStorageBucketName) {
      return res.status(503).json({ error: 'STORAGE_SERVICE_UNAVAILABLE' });
    }
    const storagePath = String(req.body?.storagePath || '').trim();
    if (!storagePath.startsWith('secure-documents/')) {
      return res.status(400).json({ error: 'INVALID_STORAGE_PATH' });
    }

    const bucket = adminStorage.bucket(adminStorageBucketName);
    const file = bucket.file(storagePath);
    const [metadata] = await file.getMetadata();
    const customMetadata = (metadata?.metadata || {}) as Record<string, any>;
    if (!canDownloadCorporatePurpose(req.user, customMetadata)) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const [buffer] = await file.download();
    const expectedSha256 = String(customMetadata.sha256 || '').trim().toLowerCase();
    const actualSha256 = createHash('sha256').update(buffer).digest('hex');
    if (expectedSha256 && expectedSha256 !== actualSha256) {
      console.error('Corporate file integrity mismatch:', { storagePath, expectedSha256, actualSha256 });
      return res.status(500).json({ error: 'FILE_INTEGRITY_CHECK_FAILED' });
    }
    const contentType = String(metadata.contentType || 'application/octet-stream');
    const originalFileName = safeStorageFileNameServer(customMetadata.originalFileName || path.basename(storagePath));
    res.setHeader('X-Content-SHA256', actualSha256);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader('Cache-Control', 'private,no-store,max-age=0');
    res.setHeader('Content-Disposition', `inline; filename="${originalFileName.replace(/"/g, '')}"`);
    return res.send(buffer);
  } catch (error: any) {
    if (error?.code === 404) return res.status(404).json({ error: 'FILE_NOT_FOUND' });
    console.error('Corporate file download error:', error);
    return res.status(500).json({ error: 'DOWNLOAD_FAILED' });
  }
});

app.post('/api/client-portal/ensure-access', requireAuth, requireInternalAccount, adminApiRateLimit, async (req: AuthRequest, res) => {
  try {
    await requireInternalPortalRequester(req.user);
    const clientId = String(req.body?.clientId || '').trim();
    if (!clientId) return res.status(400).json({ error: 'CLIENT_ID_REQUIRED' });

    const credential = await ensureClientPortalAccess(clientId);
    return res.json({ success: true, credential });
  } catch (error: any) {
    if (error?.message === 'FIREBASE_ADMIN_NOT_CONFIGURED' ||
        error?.message === 'CLIENT_PORTAL_CREDENTIAL_KEY_NOT_CONFIGURED' ||
        error?.message === 'CLIENT_PORTAL_CREDENTIAL_KEY_INVALID') {
      return res.status(503).json({ error: 'CLIENT_PORTAL_CREDENTIAL_SERVICE_UNAVAILABLE' });
    }
    if (error?.message === 'NOT_INTERNAL_ACCOUNT' || error?.message === 'INTERNAL_PROFILE_NOT_FOUND') {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }
    if (error?.message === 'CLIENT_PROFILE_NOT_FOUND') {
      return res.status(404).json({ error: 'CLIENT_PROFILE_NOT_FOUND' });
    }
    if (error?.message === 'CLIENT_CNPJ_REQUIRED') {
      return res.status(400).json({ error: 'CLIENT_CNPJ_REQUIRED' });
    }
    if (error?.message === 'CLIENT_AUTH_UID_CONFLICT') {
      return res.status(409).json({ error: 'CLIENT_AUTH_UID_CONFLICT' });
    }
    if (error?.message === 'CLIENT_PORTAL_CREDENTIAL_INVALID') {
      return res.status(500).json({ error: 'CLIENT_PORTAL_CREDENTIAL_INVALID' });
    }
    console.error('Ensure client portal access error:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.post('/api/auth/sync-client-profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await syncClientAuthProfile(req.user);
    if (!profile) {
      return res.status(404).json({ error: 'CLIENT_PROFILE_NOT_FOUND' });
    }

    return res.json({
      success: true,
      client: sanitizeClientForPortal(profile),
      claims: buildClientClaims(profile),
    });
  } catch (error: any) {
    if (error?.message === 'FIREBASE_ADMIN_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
    }
    if (error?.message === 'CLIENT_AUTH_UID_CONFLICT') {
      return res.status(409).json({ error: 'CLIENT_AUTH_UID_CONFLICT' });
    }
    if (error?.message === 'NOT_CLIENT_ACCOUNT') {
      return res.status(403).json({ error: 'NOT_CLIENT_ACCOUNT' });
    }
    console.error('Sync client profile error:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.get('/api/client-portal/data', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!firestoreDb) {
      return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
    }

    const email = String(req.user?.email || '').trim().toLowerCase();
    if (!email.endsWith('@comanins.client')) {
      return res.status(403).json({ error: 'NOT_CLIENT_ACCOUNT' });
    }

    const profile: any = await findClientForAuth(req.user);
    if (!profile) {
      return res.status(404).json({ error: 'CLIENT_PROFILE_NOT_FOUND' });
    }

    if (profile.authUid && String(profile.authUid) !== String(req.user?.uid || '')) {
      return res.status(409).json({ error: 'CLIENT_AUTH_UID_CONFLICT' });
    }

    const clientId = String(profile.id);
    const instrumentsSnap = await firestoreDb
      .collection('instruments')
      .where('clientId', '==', clientId)
      .get();

    const instruments = instrumentsSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((item: any) => item?.isDeleted !== true);
    const instrumentIdSet = new Set(instruments.map((item: any) => String(item.id)).filter(Boolean));

    // Enquanto a migração histórica ainda não terminou, mantemos o filtro legado
    // no servidor para não esconder certificados/RNCs antigos. Após o marcador
    // clientLinksV1, as leituras passam a usar clientId diretamente e deixam de
    // varrer as coleções completas.
    const indexedClientLinks = await isClientLinkMigrationComplete();
    const reportsQuery = indexedClientLinks
      ? firestoreDb.collection('calibrationReports').where('clientId', '==', clientId)
      : firestoreDb.collection('calibrationReports');
    const rncQuery = indexedClientLinks
      ? firestoreDb.collection('rncReports').where('clientId', '==', clientId)
      : firestoreDb.collection('rncReports');

    const [reportsSnap, rncSnap, intakesSnap] = await Promise.all([
      reportsQuery.get(),
      rncQuery.get(),
      firestoreDb.collection('savedIntakes').where('clientId', '==', clientId).get(),
    ]);

    // Mesmo no modo indexado, confirme o instrumento autorizado como defesa adicional
    // contra algum registro historicamente vinculado ao cliente incorreto.
    const reports = reportsSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((item: any) => item?.isDeleted !== true)
      .filter((item: any) => instrumentIdSet.has(String(item?.instrumentId || '')));

    const rncReports = rncSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((item: any) => item?.isDeleted !== true)
      .filter((item: any) => instrumentIdSet.has(String(item?.instrumentId || '')));

    const clientIntakes = deduplicateIntakesForReadServer(
      intakesSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((item: any) => item?.isDeleted !== true),
    );

    let fieldServiceRecords: any[] = [];
    if (profile?.isFieldService === true) {
      const certificateKeys = new Set(
        instruments
          .map((item: any) => String(item?.certificateNumber || '').replace(/\D/g, ''))
          .filter(Boolean),
      );

      if (certificateKeys.size > 0) {
        const fieldServiceIndexed = await isFieldServiceLinkMigrationComplete();
        if (fieldServiceIndexed) {
          const fieldServiceSnap = await firestoreDb
            .collection('fieldServiceRecords')
            .where('clientId', '==', clientId)
            .get();
          fieldServiceRecords = fieldServiceSnap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((item: any) => item?.isDeleted !== true);
        } else {
          // Compatibilidade temporária enquanto o backfill histórico é concluído.
          const fieldServiceSnap = await firestoreDb.collection('fieldServiceRecords').get();
          fieldServiceRecords = fieldServiceSnap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((item: any) => {
              if (item?.isDeleted === true) return false;
              const certificateKey = String(item?.certificate || '').replace(/\D/g, '');
              return Boolean(certificateKey) && certificateKeys.has(certificateKey);
            });
        }
      }
    }

    res.set('Cache-Control', 'no-store');
    return res.json({
      success: true,
      clientId,
      instruments,
      reports,
      clientIntakes,
      rncReports,
      fieldServiceRecords,
      dataMode: indexedClientLinks ? 'clientId-indexed' : 'legacy-fallback',
    });
  } catch (error: any) {
    if (error?.message === 'CLIENT_AUTH_UID_CONFLICT') {
      return res.status(409).json({ error: 'CLIENT_AUTH_UID_CONFLICT' });
    }
    console.error('Client portal data error:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});


app.post("/api/auth/create-user", requireAuth, requireAdministratorAccount, adminApiRateLimit, async (req: AuthRequest, res) => {
  try {
    if (!adminAuth || !firestoreDb) {
      return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
    }
    const requesterProfile = await findPortalUserForAuth(req.user);
    if (!requesterProfile || !isAdministratorProfile(requesterProfile)) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const role = String(req.body?.role || '').trim();
    const requestedAccessProfileId = String(req.body?.accessProfileId || 'limited').trim();
    const accessProfile = await getAccessProfileById(requestedAccessProfileId);

    if (!email.endsWith('@comanins.internal')) {
      return res.status(400).json({ error: 'INVALID_INTERNAL_EMAIL' });
    }
    if (password.length < 10) {
      return res.status(400).json({ error: 'WEAK_TEMP_PASSWORD' });
    }
    if (!accessProfile || accessProfile.active === false) {
      return res.status(400).json({ error: 'INVALID_ACCESS_PROFILE' });
    }

    const permissionLevel = legacyPermissionLevelForProfile(accessProfile.id);
    const initialClaims: Record<string, string | boolean | number | string[]> = {
      accountType: 'internal',
      passwordChangeRequired: true,
      accessProfileId: accessProfile.id,
      accessProfileVersion: accessProfile.version || 1,
      allowedModules: accessProfile.isAdministrator
        ? [...ALL_ACCESS_MODULES]
        : [...accessProfile.modules],
      editableModules: accessProfile.isAdministrator
        ? [...ALL_ACCESS_MODULES]
        : editableModulesFromPermissions(accessProfile.modulePermissions),
      permissionLevel,
    };
    if (role) initialClaims.role = role;

    try {
      const created = await adminAuth.createUser({
        email,
        password,
        emailVerified: false,
        disabled: false,
      });
      await adminAuth.setCustomUserClaims(created.uid, initialClaims);
      return res.json({ success: true, uid: created.uid, alreadyExists: false });
    } catch (error: any) {
      if (error?.code === 'auth/email-already-exists') {
        const existing = await adminAuth.getUserByEmail(email);

        // Reuse an existing account only when it is already bound to a portal
        // user or already carries a trusted internal claim. Otherwise the email
        // may have been pre-registered through the public Firebase sign-up API.
        const boundByUid = await firestoreDb
          .collection('portalUsers')
          .where('authUid', '==', existing.uid)
          .limit(1)
          .get();
        const trustedExisting =
          !boundByUid.empty || normalizeAccessValue(existing.customClaims?.accountType) === 'internal';

        if (trustedExisting) {
          await adminAuth.setCustomUserClaims(existing.uid, {
            ...(existing.customClaims || {}),
            ...initialClaims,
          });
          return res.json({ success: true, uid: existing.uid, alreadyExists: true });
        }

        // Take ownership of an untrusted/pre-registered technical address by
        // replacing the Auth user. The old UID will not match any portalUsers
        // document and cannot use the legacy linking path without Admin claims.
        await adminAuth.deleteUser(existing.uid);
        const recreated = await adminAuth.createUser({
          email,
          password,
          emailVerified: false,
          disabled: false,
        });
        await adminAuth.setCustomUserClaims(recreated.uid, initialClaims);
        return res.json({
          success: true,
          uid: recreated.uid,
          alreadyExists: false,
          replacedUntrustedAccount: true,
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

app.post("/api/auth/verify-admin", requireAuth, requireInternalAccount, adminApiRateLimit, async (req: AuthRequest, res) => {
  try {
    if (!adminAuth || !firestoreDb) {
      return res.status(503).json({ error: 'AUTH_SERVICE_UNAVAILABLE' });
    }
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!username || !password) {
      return res.json({ valid: false });
    }

    const email = username.includes('@')
      ? username
      : `${username}@comanins.internal`;

    if (!email.endsWith('@comanins.internal')) {
      return res.json({ valid: false });
    }

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      },
    );

    if (!response.ok) {
      return res.json({ valid: false });
    }

    const data: any = await response.json();
    if (!data?.idToken) {
      return res.json({ valid: false });
    }

    const decodedAdmin = await adminAuth.verifyIdToken(data.idToken);
    const requestedEmail = String(decodedAdmin.email || '').trim().toLowerCase();
    if (requestedEmail !== email) {
      return res.json({ valid: false });
    }

    const adminProfile = await findPortalUserForAuth(decodedAdmin);
    if (!adminProfile || !isAdministratorProfile(adminProfile)) {
      return res.json({ valid: false });
    }

    return res.json({ valid: true, username: (adminProfile as any).username || username });
  } catch (error) {
    console.error('Verify admin error:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

// Legacy local-database/auth APIs removed after the Firebase migration.

// Helper function to invoke Gemini API with Exponential Backoff Retry for 429 Rate Limits
async function callGeminiWithRetry(fn: () => Promise<any>, maxRetries = 3, initialDelay = 1000): Promise<any> {
  let attempt = 0;
  let delay = initialDelay;
  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (err: any) {
      const errStr = String(err?.message || err);
      const isRateLimit =
        errStr.includes("429") ||
        errStr.includes("Rate exceeded") ||
        errStr.includes("RESOURCE_EXHAUSTED") ||
        errStr.includes("Quota");

      if (isRateLimit && attempt < maxRetries) {
        attempt++;
        const jitter = Math.random() * 250;
        console.warn(`[Gemini API] HTTP 429 Rate Exceeded detectado. Tentativa ${attempt}/${maxRetries}. Aguardando ${delay + jitter}ms...`);
        await new Promise((r) => setTimeout(r, delay + jitter));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
}

app.post("/api/chat", requireAuth, requireInternalAccount, aiApiRateLimit, async (req: AuthRequest, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 30) {
    return res.status(400).json({ error: "Mensagens inválidas." });
  }
  const normalizedMessages = messages.map((message: any) => ({
    sender: message?.sender === 'assistant' ? 'assistant' : 'user',
    text: asLimitedString(message?.text, 4000),
  })).filter((message: any) => message.text);
  if (normalizedMessages.length === 0) {
    return res.status(400).json({ error: "Mensagens inválidas." });
  }

  const gemini = getGeminiClient();

  if (!gemini) {
    // Elegant Offline Fallback
    const lastUserMessage = normalizedMessages[normalizedMessages.length - 1]?.text || "";
    let reply = "";

    // Simulated technician responses based on query
    const textLower = lastUserMessage.toLowerCase();
    if (textLower.includes("pressão") || textLower.includes("pressure") || textLower.includes("manometro") || textLower.includes("bar")) {
      reply = "**[Modo Demo - Resposta Automática COMANINS]**\n\nIdentifiquei que sua dúvida é sobre grandezas de **Pressão**.\n\nNa calibração de manômetros e transmissores de pressão, nós utilizamos padrões com rastreabilidade RBC (Inmetro). Seguem boas práticas recomendadas:\n1. **Estabilização de temperatura**: Deixe o instrumento na sala climatizada (geralmente 20 ± 2°C) por pelo menos 4 horas antes de calibrar.\n2. **Pontos de teste**: Recomenda-se realizar leituras em 5 pontos ascendentes e 5 descendentes (0%, 25%, 50%, 75% e 100% da faixa de medição) para avaliar histerese.\n3. **Cálculo de erro**: $Erro = Valor\\_{Lido} - Valor\\_{Padrao}$. Se o maior erro absoluto for menor que o Erro Máximo Tolerado (EMT ou MPE), o instrumento é aprovado.\n\n*Nota: Insira uma chave Gemini válida nas configurações de Secrets para obter respostas analíticas detalhadas do nosso assistente de IA.*";
    } else if (textLower.includes("temperatura") || textLower.includes("termopar") || textLower.includes("pt100") || textLower.includes("grau")) {
      reply = "**[Modo Demo - Resposta Automática COMANINS]**\n\nIdentifiquei que sua dúvida é sobre grandezas de **Temperatura**.\n\nPara sensores térmicos como PT100 (RTD) ou Termopares (K, J, T):\n1. **PT100**: Segue a norma IEC 60751. A resistência padrão a 0 °C é exatamente 100.00 $\\Omega$. Para calcular a temperatura a partir da resistência, utilize a fórmula Callendar-Van Dusen:\n   $R_t = R_0 \\cdot (1 + A \\cdot t + B \\cdot t^2)$\n2. **Termopares**: Exigem cabo de compensação correto e compensação de junta fria (CJC) ativa no calibrador.\n3. **Pontos de Teste**: Geralmente calibrados em banho termostático líquido ou bloco seco industrial.\n\n*Nota: Configure sua GEMINI_API_KEY no painel de Secrets para ativar a inteligência artificial completa e interagir dinamicamente.*";
    } else if (textLower.includes("incerteza") || textLower.includes("uncertainty") || textLower.includes("fórmula") || textLower.includes("calcular")) {
      reply = "**[Modo Demo - Resposta Automática COMANINS]**\n\nPara o cálculo da incerteza expandida de medição ($U$):\n1. **Incerteza Tipo A**: Avaliação estatística por repetitividade (desvio padrão das medições dividido por $\\sqrt{n}$).\n2. **Incerteza Tipo B**: Resolução do instrumento sob teste (distribuição retangular: $res / \\sqrt{12}$), incerteza do padrão calibrado ($U_{padrão} / k$), deriva térmica do padrão, etc.\n3. **Incerteza Combinada ($u_c$)**: Soma quadrática das componentes: $u_c = \\sqrt{u_{TipoA}^2 + u_{TipoB1}^2 + u_{TipoB2}^2}$\n4. **Incerteza Expandida ($U$)**: $U = k \\cdot u_c$, onde geralmente se adota o fator de abrangência $k = 2$ para 95.45% de nível de confiança.\n\n*Dica: Conecte o modelo Gemini em produção via Secrets para obter cálculos automáticos estruturados passo a passo.*";
    } else {
      reply = `**[Modo Demo - Assistente Técnico COMANINS]**\n\nOlá! Sou o assistente técnico especializado em metrologia industrial da COMANINS.\n\nPosso auxiliar você com:\n- Fórmulas de conversão de pressão (bar, psi, mmHg, Pa) e temperatura (°C, °F, K);\n- Normas técnicas (IEC 60751, ASME B40.100, Portarias Inmetro);\n- Dicas sobre calibração de instrumentos industriais;\n- Orientações de cálculo de erro máximo tolerado (MPE) e incerteza de medição.\n\n_Como o servidor está operando atualmente sem uma chave GEMINI_API_KEY ativa (Modo Demonstração), respondo a partir de diretrizes locais predefinidas. Adicione a chave no painel do AI Studio para obter a IA generativa completa!_`;
    }

    return res.json({ text: reply });
  }

  try {
    // Prepare prompt with background guidelines so Gemini responds exactly as a Metrology Expert
    const promptHistory = normalizedMessages.map((m: any) => {
      return `${m.sender === "user" ? "Usuário" : "Assistente"}: ${m.text}`;
    }).join("\n");

    const systemInstruction = `Você é o "Assistente Técnico de Metrologia da COMANINS", um especialista altamente qualificado em calibração, manutenção de instrumentos industriais, metrologia científica e industrial, focado nas grandezas de Pressão e Temperatura.
Seus usuários são técnicos de calibração que trabalham em laboratório ou em campo, bem como clientes industriais.

Suas diretrizes:
1. Responda em português de forma clara, profissional, precisa e técnica.
2. Seja prestativo com fórmulas matemáticas, conversão de unidades (como bar para psi, °C para °F ou K), e padrões de calibração de acordo com as normas brasileiras e internacionais (Inmetro, ASTM, IEC 60751 para PT100, ASME B40.100 para manômetros).
3. Ao fornecer fórmulas matemáticas, você pode utilizar notação científica legível ou markdown padrão.
4. Mantenha as respostas focadas e evite respostas extremamente longas desnecessariamente, a menos que solicitado um passo a passo do cálculo de incerteza de medição ou detalhamento técnico.
5. Nunca cite segredos internos ou que você está rodando sob uma plataforma artificial. Mostre-se como o assistente metrológico oficial da COMANINS.`;

    const response = await callGeminiWithRetry(() =>
      gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { text: promptHistory }
        ],
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      })
    );

    res.json({ text: response.text });
  } catch (err: any) {
    console.error("Erro na chamada da API Gemini:", err);
    res.json({
      text: "O assistente técnico de IA da COMANINS está temporariamente com alta demanda. As orientações da base local de metrologia permanecem totalmente disponíveis."
    });
  }
});

// Endpoint para Gerar Análise de Não Conformidade (RNC) com IA
app.post("/api/generate-rnc", requireAuth, requireInternalAccount, aiApiRateLimit, async (req: AuthRequest, res) => {
  const instrumentTag = asLimitedString(req.body?.instrumentTag, 120);
  const instrumentDescription = asLimitedString(req.body?.instrumentDescription, 240);
  const coma = asLimitedString(req.body?.coma, 120);
  const clientName = asLimitedString(req.body?.clientName, 240);
  const reason = asLimitedString(req.body?.reason, 3000);
  const technicianName = asLimitedString(req.body?.technicianName, 160);
  const range = asLimitedString(req.body?.range, 160);
  if (!reason) return res.status(400).json({ error: 'Motivo da RNC é obrigatório.' });
  const gemini = getGeminiClient();

  if (!gemini) {
    const fallbackText = `ANÁLISE TÉCNICA E RECOMENDAÇÃO (Metrologia COMANINS):\n\n` +
      `1. DIAGNÓSTICO DO DEFEITO:\nO instrumento ${instrumentTag || 'analisado'} (${instrumentDescription || 'Medidor'}) apresentou a seguinte anormalidade durante a calibração: "${reason || 'Falha técnica'}".\n\n` +
      `2. IMPACTO METROLÓGICO:\nA falha descrita impede a rastreabilidade metrológica RBC e compromete a exatidão das medições no processo do cliente (${clientName || 'Cliente'}). O instrumento não atende aos critérios de aceitação.\n\n` +
      `3. AÇÃO CORRETIVA RECOMENDADA:\n- Encaminhar o instrumento para manutenção técnica/ajuste ou substituição de componentes.\n- Realizar nova calibração na bancada após o reparo.\n- Se o reparo for inviável, recomenda-se a baixa e descarte do equipamento.`;
    return res.json({ analysis: fallbackText });
  }

  try {
    const prompt = `Você é um Engenheiro Metrologista Sênior e Especialista em Qualidade (ABNT NBR ISO/IEC 17025) do laboratório COMANINS.
Sua tarefa é gerar uma Análise Técnica e Recomendação de Não Conformidade (RNC) extremamente detalhada, técnica e embasada para ser apresentada aos clientes corporativos/industriais.

Dados do Instrumento Submetido à Análise:
- TAG: ${instrumentTag || 'N/A'}
- Descrição: ${instrumentDescription || 'N/A'}
- COMA/Certificado: ${coma || 'N/A'}
- Cliente: ${clientName || 'N/A'}
- Faixa de Medição/Capacidade: ${range || 'N/A'}
- Técnico/Metrologista Responsável: ${technicianName || 'N/A'}
- Defeito ou Motivo apontado no laboratório: "${reason || 'Falha na calibração'}"

DIRETRIZES DE GERAÇÃO:
- Utilize terminologia técnica avançada de metrologia, calibração e instrumentação (ex: histerese, repetitividade, erro fiduciário, incerteza de medição, desvio, tolerância, VVC).
- O relatório deve transmitir alta credibilidade técnica, embasamento normativo e rigor científico.
- O texto não deve ser genérico. Aprofunde-se na provável mecânica, eletrônica ou física do erro apontado ("${reason}").

Forneça a análise obrigatoriamente estruturada nas seguintes 4 seções detalhadas:

1. DIAGNÓSTICO METROLÓGICO E DESCRIÇÃO TÉCNICA DA ANOMALIA
(Explique tecnicamente o que o defeito apontado significa na prática para a física ou eletrônica do instrumento. Detalhe como essa falha ocorre e quais os mecanismos internos ou externos que podem ter causado este desvio ou quebra de conformidade).

2. AVALIAÇÃO DE IMPACTO NO PROCESSO E RISCO DE QUALIDADE
(Explique detalhadamente as consequências do uso deste instrumento no estado atual. Como a falha afeta a incerteza da medição, a rastreabilidade e quais os riscos para o processo produtivo ou controle de qualidade do cliente).

3. FUNDAMENTAÇÃO NORMATIVA E GESTÃO DE QUALIDADE (ISO/IEC 17025)
(Mencione o impacto na garantia de resultados válidos, enfatizando a justificativa técnica para a reprovação do item ensaiado e a suspensão imediata de seu uso para proteger a conformidade do cliente).

4. AÇÕES CORRETIVAS E RECOMENDAÇÕES DIRETAS
(Liste recomendações rigorosas: indique se é cabível manutenção corretiva, ajuste e posterior recalibração, ou se a melhor conduta técnica e econômica é o descarte e substituição do equipamento).

Sua resposta deve ser entregue em texto contínuo bem formatado, utilizando jargão técnico adequado, linguagem corporativa formal e em Português do Brasil. O resultado final será impresso no certificado oficial do cliente.`;

    const response = await callGeminiWithRetry(() =>
      gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      })
    );

    res.json({ analysis: response.text || 'Análise concluída.' });
  } catch (err: any) {
    console.error("Erro ao gerar RNC com Gemini:", err);
    res.json({
      analysis: `ANÁLISE TÉCNICA DE NÃO CONFORMIDADE:\n\n1. DIAGNÓSTICO: O instrumento ${instrumentTag || ''} apresentou a seguinte inconsistência: "${reason}".\n2. IMPACTO: Impossibilidade de validação de incerteza metrológica.\n3. AÇÃO CORRETIVA: Manutenção corretiva ou substituição do equipamento.`
    });
  }
});

// Endpoint to send contact emails
// Generic email endpoint
app.post("/api/send-email", requireAuth, requireInternalAccount, emailApiRateLimit, async (req: AuthRequest, res) => {
  const to = asLimitedString(req.body?.to, 2000);
  const subject = asLimitedString(req.body?.subject, 200);
  const html = String(req.body?.html || '');
  const recipients = to.split(/[;,]/).map((value) => value.trim()).filter(Boolean);
  if (!subject || !html || html.length > 200000 || recipients.length === 0 || recipients.length > 20 || !recipients.every(isValidEmailAddress)) {
    return res.status(400).json({ error: "Dados inválidos para envio de e-mail." });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: `"COMANINS Portal" <${SMTP_USER}>`,
        to: to,
        subject: subject,
        html: html
      });

      return res.json({ success: true, emailSent: true });
    } catch (err) {
      console.error("[EMAIL] Erro ao enviar e-mail via SMTP:", err);
      return res.json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  } else {
    console.log("[EMAIL] SMTP não configurado. Dados:", { to, subject });
    return res.json({ success: true, emailSent: false, smtpNotConfigured: true });
  }
});

app.post("/api/send-contact-email", publicContactRateLimit, async (req: AuthRequest, res) => {
  const name = asLimitedString(req.body?.name, 120);
  const company = asLimitedString(req.body?.company, 160);
  const email = asLimitedString(req.body?.email, 254).toLowerCase();
  const phone = asLimitedString(req.body?.phone, 40);
  const message = asLimitedString(req.body?.message, 5000);
  const category = asLimitedString(req.body?.category, 80);

  if (!name || !isValidEmailAddress(email) || !message) {
    return res.status(400).json({ error: "Dados inválidos para envio de e-mail de contato." });
  }

  const safeName = escapeHtml(name);
  const safeCompany = escapeHtml(company || 'Não informada');
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone || 'Não informado');
  const safeCategory = escapeHtml(category || 'Outros');
  const safeMessage = escapeHtml(message);

  if (!firestoreDb) {
    return res.status(503).json({ error: 'CONTACT_SERVICE_UNAVAILABLE' });
  }

  const contactId = `msg_${Date.now()}_${randomBytes(4).toString('hex')}`;
  try {
    await firestoreDb.collection('contactMessages').doc(contactId).set({
      id: contactId,
      name,
      company,
      email,
      phone,
      message,
      category: category || 'outros',
      date: new Date().toISOString().split('T')[0],
      createdAt: FieldValue.serverTimestamp(),
      status: 'pendente',
      source: 'public-site',
    });
  } catch (error) {
    console.error('[CONTACT] Falha ao registrar contato no Firestore:', error);
    return res.status(500).json({ error: 'CONTACT_PERSISTENCE_FAILED' });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  const emailSubject = `[SITE COMANINS] Contato: ${asLimitedString(category || 'Geral', 80)} - ${asLimitedString(company || name, 160)}`;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
        <h2 style="color: #2563eb; margin: 0; font-size: 20px;">Contato pelo Site - COMANINS</h2>
      </div>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold; width: 35%;">Nome:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Empresa:</td>
            <td style="padding: 6px 0; color: #0f172a;">${safeCompany}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">E-mail:</td>
            <td style="padding: 6px 0; color: #0f172a;">${safeEmail}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Telefone:</td>
            <td style="padding: 6px 0; color: #0f172a;">${safePhone}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Categoria:</td>
            <td style="padding: 6px 0; color: #0f172a;">${safeCategory}</td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 20px;">
        <h3 style="color: #64748b; font-size: 14px; margin-bottom: 10px;">Mensagem:</h3>
        <p style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${safeMessage}</p>
      </div>
    </div>
  `;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: `"${name}" <${SMTP_USER}>`,
        replyTo: email,
        to: "comercial@comanins.com.br",
        subject: emailSubject,
        html: emailHtml,
        text: `Nome: ${name}\nEmpresa: ${company}\nE-mail: ${email}\nTelefone: ${phone}\n\nMensagem:\n${message}`
      });

      return res.json({ success: true, contactSaved: true, emailSent: true });
    } catch (err: any) {
      console.error("[CONTACT EMAIL] Erro ao enviar e-mail via SMTP:", err);
      return res.json({ success: true, contactSaved: true, emailSent: false, emailError: true });
    }
  } else {
    console.log("[CONTACT EMAIL] SMTP não configurado. Dados recebidos:", { name, company, email, phone, message });
    return res.json({ success: true, contactSaved: true, emailSent: false, smtpNotConfigured: true });
  }
});

// Endpoint de notificação de visualização de contra-cheque com compliance LGPD
app.post("/api/send-document-notification", requireAuth, requireInternalAccount, emailApiRateLimit, async (req: AuthRequest, res) => {
  let employeeName = asLimitedString(req.body?.employeeName, 160);
  let employeeRegister = asLimitedString(req.body?.employeeRegister, 100);
  const month = asLimitedString(req.body?.month, 80);
  const visualizedAt = asLimitedString(req.body?.visualizedAt, 120);
  const ip = asLimitedString(req.body?.ip, 80);
  const userAgent = asLimitedString(req.body?.userAgent, 500);
  const documentType = asLimitedString(req.body?.documentType, 120);

  try {
    const requesterProfile = await requireInternalPortalRequester(req.user);
    const canNotifyForOthers = requesterProfile && (
      isAdministratorProfile(requesterProfile) ||
      isRhProfile(requesterProfile) ||
      isFinanceProfile(requesterProfile)
    );
    if (requesterProfile && !canNotifyForOthers) {
      employeeName = asLimitedString(requesterProfile.name, 160);
      employeeRegister = asLimitedString(requesterProfile.register, 100);
    }
  } catch (error) {
    console.warn('[PAYSLIP COMPLIANCE] Could not resolve requester profile:', error);
  }

  if (!employeeName || !month) {
    return res.status(400).json({ error: "Dados incompletos para envio da notificação." });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  const docTypeLabel = documentType || "Contra-cheque";
  const emailSubject = `[COMPROVANTE LGPD] Visualização de ${docTypeLabel} - ${employeeName} (${month})`;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
        <h2 style="color: #2563eb; margin: 0; font-size: 20px;">COMANINS INSTRUMENTAÇÃO</h2>
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: bold; display: block; margin-top: 4px;">Comprovante Oficial de Visualização (LGPD)</span>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        Confirmamos que o colaborador abaixo visualizou seu(ua) <b>${docTypeLabel}</b> correspondente ao mês de referência <b>${month}</b>.
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold; width: 35%;">Colaborador:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${employeeName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Matrícula / Registro:</td>
            <td style="padding: 6px 0; color: #0f172a; font-family: monospace;">${employeeRegister || 'Não informado'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Mês de Referência:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${month}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Data e Hora de Acesso:</td>
            <td style="padding: 6px 0; color: #0f172a;">${visualizedAt}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Endereço de IP:</td>
            <td style="padding: 6px 0; color: #0f172a; font-family: monospace;">${ip || 'Client Side Connection'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Dispositivo / Browser:</td>
            <td style="padding: 6px 0; color: #0f172a; font-size: 11px; line-height: 1.4;">${userAgent || 'Desconhecido'}</td>
          </tr>
        </table>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #64748b; line-height: 1.5; text-align: justify;">
        <p><b>Aviso Legal (LGPD):</b> Este e-mail é uma notificação automática e serve como trilha de auditoria para fins de compliance com a Lei Geral de Proteção de Dados (LGPD). O acesso aos dados de folha de pagamento do respectivo colaborador foi registrado com o seu consentimento explícito em nosso portal interno de Recursos Humanos. As informações de IP e dispositivo foram coletadas exclusivamente para garantir a integridade da segurança da informação e prevenção de fraudes.</p>
      </div>

      <div style="text-align: center; margin-top: 24px; font-size: 10px; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 12px;">
        © ${new Date().getFullYear()} COMANINS Metrologia Industrial • Todos os direitos reservados.
      </div>
    </div>
  `;

  console.log(`[PAYSLIP COMPLIANCE] Notificação de visualização de ${docTypeLabel} criada para ${employeeName} (${month})`);

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: `"${SMTP_USER}" <${SMTP_USER}>`,
        to: "financeiro@comanins.com.br",
        subject: emailSubject,
        html: emailHtml,
        text: `Comprovante de Visualização de ${docTypeLabel}\n\nColaborador: ${employeeName}\nMatrícula: ${employeeRegister}\nMês: ${month}\nData/Hora: ${visualizedAt}\nIP: ${ip}\nDispositivo: ${userAgent}\n\nEste registro foi gerado em conformidade com as diretrizes da LGPD.`
      });

      console.log(`[PAYSLIP COMPLIANCE] E-mail de notificação enviado com sucesso para financeiro@comanins.com.br.`);
      return res.json({ success: true, emailSent: true });
    } catch (err: any) {
      console.error(`[PAYSLIP COMPLIANCE] Erro ao enviar e-mail via SMTP:`, err);
      return res.json({ success: true, emailSent: false, error: err.message });
    }
  } else {
    console.log(`[PAYSLIP COMPLIANCE] SMTP não configurado. Comprovante impresso no console:\nSubject: ${emailSubject}\nTo: financeiro@comanins.com.br`);
    return res.json({ success: true, emailSent: false, smtpNotConfigured: true });
  }
});

// Start server using an async wrapper to prevent top-level await in CommonJS bundling
async function startServer() {
  // Vite Setup (Development vs. Production)

  app.post("/api/parse-field-service-image", requireAuth, requireInternalAccount, aiApiRateLimit, async (req: AuthRequest, res) => {
    try {
      const imageBase64 = String(req.body?.imageBase64 || '');
      const imageMatch = imageBase64.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/i);
      if (!imageMatch) {
        return res.status(400).json({ error: "Imagem inválida ou formato não permitido." });
      }
      const imageMimeType = imageMatch[1].toLowerCase();
      const base64Data = imageMatch[2];
      if (base64Data.length > 6_000_000) {
        return res.status(413).json({ error: "Imagem excede o limite permitido." });
      }

      const aiClient = getGeminiClient();
      if (!aiClient) {
        return res.status(503).json({ error: "Gemini API key is missing or invalid." });
      }

      // Prepare image for Gemini Vision
      const prompt = `
Você é um assistente especialista em transcrição de planilhas industriais manuscritas.
Analise a FOTO INTEIRA. Ela pode conter UMA OU MUITAS LINHAS de uma planilha de Serviço de Campo preenchida à mão.

OBJETIVO:
- Transcrever todas as linhas legíveis, sem inventar conteúdo.
- Preservar TAGs, números de certificado, OS, unidades, sinais, hífens, barras, pontos e vírgulas exatamente quando legíveis.
- Não juntar duas linhas diferentes.
- Se um campo estiver vazio ou ilegível, use string vazia.
- Datas devem ser devolvidas preferencialmente em DD/MM/AAAA.
- "Certificado", "COMA", "Nº Cert.", "Cert." podem representar o campo certificate.
- "UM" significa unidade de medida.
- Responda SOMENTE JSON válido, sem markdown e sem explicações.

Formato obrigatório:
{
  "records": [
    {
      "certificate": "",
      "dataCalibracao": "",
      "interventionDate": "",
      "tag": "",
      "equipamento": "",
      "localizacao": "",
      "technician": "",
      "area": "",
      "range": "",
      "operacao": "",
      "unidadeMedida": "",
      "categoria": "",
      "emissaoPdf": "",
      "ordemServico": "",
      "tipoServico": "",
      "observacao": "",
      "unidade": "",
      "cliente": ""
    }
  ]
}

REGRAS DE QUALIDADE:
1. Percorra a tabela de cima para baixo e da esquerda para a direita.
2. Retorne uma entrada em records para cada linha real identificada.
3. Não repita cabeçalhos como se fossem dados.
4. Não adivinhe números manuscritos. Se houver dúvida real, deixe vazio.
5. Não corrija TAG/certificado com base em suposição.
`;

      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [
              { text: prompt },
              { inlineData: { mimeType: imageMimeType, data: base64Data } }
            ]
          }
        ],
        config: {
            temperature: 0.2,
            responseMimeType: "application/json"
        }
      });

      const textOutput = response.text;
      let parsedData = {};
      try {
          parsedData = JSON.parse(textOutput);
      } catch (e) {
          // Fallback if there is a problem parsing
          const jsonMatch = textOutput.match(/\{.*\}/s);
          if (jsonMatch) {
              parsedData = JSON.parse(jsonMatch[0]);
          } else {
              throw new Error("Could not parse AI response as JSON");
          }
      }

      const normalizedResponse = parsedData && typeof parsedData === 'object'
        ? parsedData as Record<string, any>
        : {};
      const records = Array.isArray(normalizedResponse.records)
        ? normalizedResponse.records.slice(0, 500)
        : [normalizedResponse];
      res.json({
        records: records.filter((row: any) => row && typeof row === 'object'),
      });
    } catch (err: any) {
      console.error("Error processing field service image:", err);
      res.status(500).json({ error: err.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn("⚠️ Vite não encontrado. Pulando HMR/Middleware de desenvolvimento.");
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Start server. Security cleanups/migrations run asynchronously and never
  // block the public site from listening.
  void scrubLegacyInternalPasswordFields();
  void backfillClientLinks();
  void backfillFieldServiceClientLinks();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor COMANINS rodando na porta ${PORT}`);
  });
}

startServer();
