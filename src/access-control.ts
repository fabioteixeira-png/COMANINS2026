export const ACCESS_MODULE_CATALOG = [
  { id: "dashboard", label: "Dashboard", group: "Geral" },
  { id: "clients", label: "Clientes", group: "Recepção" },
  { id: "material_intake", label: "Entrada de Material", group: "Recepção" },
  { id: "calibration", label: "Calibração, certificados e etiquetas", group: "Laboratório" },
  { id: "digital_signature", label: "Minha Assinatura", group: "Laboratório" },
  { id: "field_service", label: "Serviço de Campo", group: "Laboratório" },
  { id: "inventory", label: "Controle de Estoque", group: "Operações" },
  { id: "rental", label: "Locação de Instrumentos", group: "Operações" },
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
export type AccessMode = "view" | "edit";
export type AccessModulePermissions = Partial<Record<AccessModuleId, AccessMode>>;

export interface AccessProfileDefinition {
  id: string;
  name: string;
  description: string;
  /** Módulos visíveis. Mantido por compatibilidade com perfis/claims legados. */
  modules: AccessModuleId[];
  /** Nível por módulo. "view" = consulta; "edit" = consulta + gravação/upload/cadastro. */
  modulePermissions: AccessModulePermissions;
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
  editableModules?: string[];
}

export const ALL_ACCESS_MODULES: AccessModuleId[] = ACCESS_MODULE_CATALOG.map(
  ({ id }) => id,
);

const normalize = (value: unknown) => String(value || "").trim().toLowerCase();
const VALID_MODULE_IDS = new Set<string>(ALL_ACCESS_MODULES);

export const sanitizeAccessModules = (modules: unknown): AccessModuleId[] => {
  if (!Array.isArray(modules)) return [];
  return Array.from(
    new Set(
      modules
        .map((moduleId) => String(moduleId))
        .filter((moduleId) => VALID_MODULE_IDS.has(moduleId)),
    ),
  ) as AccessModuleId[];
};

export const buildModulePermissions = (
  modules: readonly AccessModuleId[],
  mode: AccessMode = "edit",
): AccessModulePermissions => Object.fromEntries(modules.map((moduleId) => [moduleId, mode]));

export const sanitizeModulePermissions = (
  permissions: unknown,
  legacyModules?: unknown,
): AccessModulePermissions => {
  if (permissions !== undefined && permissions !== null) {
    if (typeof permissions !== "object" || Array.isArray(permissions)) return {};

    const result: AccessModulePermissions = {};
    for (const [rawModuleId, rawMode] of Object.entries(permissions as Record<string, unknown>)) {
      if (!VALID_MODULE_IDS.has(rawModuleId)) continue;
      const mode = normalize(rawMode);
      if (mode === "view" || mode === "edit") {
        result[rawModuleId as AccessModuleId] = mode;
      }
    }
    return result;
  }

  // Migração sem quebra: todo módulo de um perfil legado era, na prática, editável.
  return buildModulePermissions(sanitizeAccessModules(legacyModules), "edit");
};

export const modulesFromPermissions = (
  permissions: AccessModulePermissions,
): AccessModuleId[] => ALL_ACCESS_MODULES.filter((moduleId) => permissions[moduleId] === "view" || permissions[moduleId] === "edit");

export const editableModulesFromPermissions = (
  permissions: AccessModulePermissions,
): AccessModuleId[] => ALL_ACCESS_MODULES.filter((moduleId) => permissions[moduleId] === "edit");

const profile = (
  definition: Omit<AccessProfileDefinition, "modulePermissions">,
): AccessProfileDefinition => ({
  ...definition,
  modulePermissions: buildModulePermissions(definition.modules, "edit"),
});

export const DEFAULT_ACCESS_PROFILES: AccessProfileDefinition[] = [
  profile({
    id: "administrator",
    name: "Administrador",
    description: "Acesso total, incluindo Configurações e gestão de perfis.",
    modules: [...ALL_ACCESS_MODULES],
    isSystem: true,
    isAdministrator: true,
    active: true,
    version: 1,
  }),
  profile({
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
  }),
  profile({
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
  }),
  profile({
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
      "rental",
      "personal_documents",
      "internal_communication",
    ],
    isSystem: true,
    active: true,
    version: 1,
  }),
  profile({
    id: "limited",
    name: "Limitado",
    description: "Acesso essencial ao painel, documentos pessoais e comunicação.",
    modules: ["dashboard", "personal_documents", "internal_communication"],
    isSystem: true,
    active: true,
    version: 1,
  }),
];

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

export const resolveUserEditableModules = (user?: AccessAwareUser | null): AccessModuleId[] => {
  if (isAdministratorAccess(user)) return [...ALL_ACCESS_MODULES];

  if (Array.isArray(user?.editableModules)) {
    return sanitizeAccessModules(user.editableModules);
  }

  // Tokens/perfis anteriores a esta versão não tinham editableModules. Para não
  // interromper produção durante rollout, os módulos já autorizados continuam editáveis.
  if (Array.isArray(user?.allowedModules)) {
    return sanitizeAccessModules(user.allowedModules);
  }

  const legacyProfile = getDefaultAccessProfile(resolveLegacyAccessProfileId(user));
  return legacyProfile ? editableModulesFromPermissions(legacyProfile.modulePermissions) : [];
};

export const userHasAccessModule = (
  user: AccessAwareUser | null | undefined,
  moduleId: AccessModuleId,
): boolean => isAdministratorAccess(user) || resolveUserAccessModules(user).includes(moduleId);

export const userCanEditModule = (
  user: AccessAwareUser | null | undefined,
  moduleId: AccessModuleId,
): boolean => isAdministratorAccess(user) || resolveUserEditableModules(user).includes(moduleId);

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
    etiqueta_caixa: "material_intake",
    instruments: "calibration",
    bench: "calibration",
    registro_calibracao: "calibration",
    certificados: "calibration",
    etiquetas: "calibration",
    minha_assinatura: "digital_signature",
    field_service: "field_service",
    controle_estoque: "inventory",
    locacao_instrumentos: "rental",
    colaboradores: "personal_documents",
    comunicacao_interna: "internal_communication",
    financeiro: "finance",
    programas_saude: "health_programs",
    auditoria: "audit",
    consumo_firebase: "firebase_usage",
  };
  return mapping[activeTab] || null;
};
