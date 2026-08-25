export const ACCESS_MODULE_CATALOG = [
  { id: "dashboard", label: "Dashboard", group: "Geral" },
  { id: "clients", label: "Clientes", group: "Recepção" },
  { id: "material_intake", label: "Entrada de Material", group: "Recepção" },
  { id: "calibration", label: "Calibração, certificados e etiquetas", group: "Laboratório" },
  { id: "digital_signature", label: "Minha Assinatura", group: "Laboratório" },
  { id: "field_service", label: "Serviço de Campo", group: "Laboratório" },
  { id: "inventory", label: "Controle de Estoque", group: "Operações" },
  { id: "hr", label: "Colaboradores (RH)", group: "Administrativo" },
  { id: "personal_documents", label: "Meus Documentos", group: "Pessoal" },
  { id: "internal_communication", label: "Comunicação Interna", group: "Pessoal" },
  { id: "internal_communication_management", label: "Gestão da Comunicação Interna", group: "Administrativo" },
  { id: "finance", label: "Financeiro", group: "Administrativo" },
  { id: "health_programs", label: "Programas de Saúde (PGR/PCMSO)", group: "Administrativo" },
  { id: "audit", label: "Auditoria e Metrologia", group: "Administração" },
  { id: "firebase_usage", label: "Consumo Firebase", group: "Administração" },
] as const;

export type AccessModuleId = (typeof ACCESS_MODULE_CATALOG)[number]["id"];

export interface AccessProfileDefinition {
  id: string;
  name: string;
  description: string;
  modules: AccessModuleId[];
  isSystem?: boolean;
  isAdministrator?: boolean;
  active?: boolean;
  version?: number;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface AccessAwareUser {
  role?: string;
  permissionLevel?: string;
  accessProfileId?: string;
  accessProfileName?: string;
  allowedModules?: string[];
}

export const ALL_ACCESS_MODULES: AccessModuleId[] = ACCESS_MODULE_CATALOG.map(
  ({ id }) => id,
);

export const DEFAULT_ACCESS_PROFILES: AccessProfileDefinition[] = [
  {
    id: "administrator",
    name: "Administrador",
    description: "Acesso total, incluindo Configurações e gestão de perfis.",
    modules: [...ALL_ACCESS_MODULES],
    isSystem: true,
    isAdministrator: true,
    active: true,
    version: 1,
  },
  {
    id: "human_resources",
    name: "Recursos Humanos (RH)",
    description: "Rotinas de colaboradores, documentos pessoais e saúde ocupacional.",
    modules: [
      "dashboard",
      "hr",
      "personal_documents",
      "internal_communication",
      "internal_communication_management",
      "health_programs",
    ],
    isSystem: true,
    active: true,
    version: 1,
  },
  {
    id: "finance",
    name: "Financeiro",
    description: "Rotinas financeiras, contracheques e comunicação interna.",
    modules: [
      "dashboard",
      "personal_documents",
      "internal_communication",
      "internal_communication_management",
      "finance",
    ],
    isSystem: true,
    active: true,
    version: 1,
  },
  {
    id: "standard",
    name: "Padrão",
    description: "Perfil operacional intermediário para recepção, laboratório e estoque.",
    modules: [
      "dashboard",
      "clients",
      "material_intake",
      "calibration",
      "digital_signature",
      "field_service",
      "inventory",
      "personal_documents",
      "internal_communication",
    ],
    isSystem: true,
    active: true,
    version: 1,
  },
  {
    id: "limited",
    name: "Limitado",
    description: "Acesso essencial ao painel, documentos pessoais e comunicação.",
    modules: ["dashboard", "personal_documents", "internal_communication"],
    isSystem: true,
    active: true,
    version: 1,
  },
];

const normalize = (value: unknown) => String(value || "").trim().toLowerCase();
const VALID_MODULE_IDS = new Set<string>(ALL_ACCESS_MODULES);

export const sanitizeAccessModules = (modules: unknown): AccessModuleId[] => {
  if (!Array.isArray(modules)) return [];
  return Array.from(
    new Set(modules.map((moduleId) => String(moduleId)).filter((moduleId) => VALID_MODULE_IDS.has(moduleId))),
  ) as AccessModuleId[];
};

export const getDefaultAccessProfile = (profileId: string) =>
  DEFAULT_ACCESS_PROFILES.find(({ id }) => id === profileId);

export const resolveLegacyAccessProfileId = (user?: AccessAwareUser | null): string => {
  const permission = normalize(user?.permissionLevel);
  const role = normalize(user?.role);

  if (
    permission === "administrador" ||
    ["administrador", "admin", "master", "diretor", "diretoria"].includes(role)
  ) {
    return "administrator";
  }
  if (
    ["recursos humanos (rh)", "recursos humanos", "rh"].includes(permission) ||
    ["recursos humanos (rh)", "recursos humanos", "rh"].includes(role)
  ) {
    return "human_resources";
  }
  if (
    ["financeiro", "financeira", "finance"].includes(permission) ||
    ["financeiro", "financeira", "finance"].includes(role)
  ) {
    return "finance";
  }
  if (permission === "limitado") return "limited";
  if (permission === "padrão" || permission === "padrao") return "standard";

  // Compatibilidade somente para cadastros legados sem nível de permissão.
  if (!permission && (role.includes("técnico") || role.includes("tecnico") || role === "comercial")) {
    return "limited";
  }
  return "standard";
};

export const isAdministratorAccess = (user?: AccessAwareUser | null): boolean => {
  const profileId = user?.accessProfileId || resolveLegacyAccessProfileId(user);
  return profileId === "administrator";
};

export const resolveUserAccessModules = (user?: AccessAwareUser | null): AccessModuleId[] => {
  if (isAdministratorAccess(user)) return [...ALL_ACCESS_MODULES];

  if (Array.isArray(user?.allowedModules)) {
    return sanitizeAccessModules(user.allowedModules);
  }

  const legacyProfile = getDefaultAccessProfile(resolveLegacyAccessProfileId(user));
  return legacyProfile ? [...legacyProfile.modules] : [];
};

export const userHasAccessModule = (
  user: AccessAwareUser | null | undefined,
  moduleId: AccessModuleId,
): boolean => isAdministratorAccess(user) || resolveUserAccessModules(user).includes(moduleId);

export const legacyPermissionLevelForProfile = (profileId: string): string => {
  if (profileId === "administrator") return "Administrador";
  if (profileId === "human_resources") return "Recursos Humanos (RH)";
  if (profileId === "finance") return "Financeiro";
  if (profileId === "limited") return "Limitado";
  return "Padrão";
};

export const activeTabAccessModule = (activeTab: string): AccessModuleId | null => {
  const mapping: Record<string, AccessModuleId> = {
    dashboard: "dashboard",
    clients: "clients",
    entrada_material: "material_intake",
    instruments: "calibration",
    bench: "calibration",
    registro_calibracao: "calibration",
    certificados: "calibration",
    etiquetas: "calibration",
    minha_assinatura: "digital_signature",
    field_service: "field_service",
    controle_estoque: "inventory",
    colaboradores: "personal_documents",
    comunicacao_interna: "internal_communication",
    financeiro: "finance",
    programas_saude: "health_programs",
    auditoria: "audit",
    consumo_firebase: "firebase_usage",
  };
  return mapping[activeTab] || null;
};
