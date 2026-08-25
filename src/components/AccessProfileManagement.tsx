import React, { useEffect, useMemo, useState } from "react";
import { Check, KeyRound, Loader2, Plus, Save, Search, ShieldCheck, Users } from "lucide-react";
import type { PortalUser } from "../lib/firebase";
import type { AccessModuleId, AccessProfileDefinition } from "../access-control";
import { resolveLegacyAccessProfileId } from "../access-control";
import { authJsonFetch } from "../utils/authApi";

interface ModuleCatalogItem {
  id: AccessModuleId;
  label: string;
  group: string;
}

interface AccessProfileManagementProps {
  currentUser: PortalUser | null;
  internalUsers: PortalUser[];
  onAssignAccessProfile: (
    userId: string,
    accessProfileId: string,
  ) => Promise<PortalUser>;
}

const emptyDraft = (): AccessProfileDefinition => ({
  id: "",
  name: "",
  description: "",
  modules: ["dashboard"],
  active: true,
});

const errorMessage = (code: string) => {
  const messages: Record<string, string> = {
    ADMINISTRATOR_PROFILE_IS_IMMUTABLE:
      "O perfil Administrador é protegido e não pode ser reduzido.",
    ACCESS_PROFILE_NAME_REQUIRED: "Informe o nome do perfil.",
    ACCESS_PROFILE_REQUIRES_MODULE: "Selecione ao menos um módulo.",
    CANNOT_REMOVE_OWN_ADMIN_ACCESS:
      "Por segurança, o administrador conectado não pode retirar o próprio acesso.",
    AUTH_USER_NOT_FOUND:
      "O colaborador ainda não possui uma conta de autenticação vinculada.",
    MODULE_ACCESS_DENIED: "Seu acesso não permite executar esta operação.",
  };
  return messages[code] || "Não foi possível concluir a operação.";
};

export default function AccessProfileManagement({
  currentUser,
  internalUsers,
  onAssignAccessProfile,
}: AccessProfileManagementProps) {
  const [profiles, setProfiles] = useState<AccessProfileDefinition[]>([]);
  const [modules, setModules] = useState<ModuleCatalogItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draft, setDraft] = useState<AccessProfileDefinition>(emptyDraft());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assigningUserId, setAssigningUserId] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadProfiles = async (preferredId?: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await authJsonFetch("/api/internal/access-profiles");
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "LOAD_FAILED");
      const nextProfiles = Array.isArray(data?.profiles) ? data.profiles : [];
      const nextModules = Array.isArray(data?.modules) ? data.modules : [];
      setProfiles(nextProfiles);
      setModules(nextModules);

      const nextSelectedId =
        preferredId && nextProfiles.some((profile: AccessProfileDefinition) => profile.id === preferredId)
          ? preferredId
          : nextProfiles[0]?.id || "";
      setSelectedId(nextSelectedId);
      const nextDraft = nextProfiles.find(
        (profile: AccessProfileDefinition) => profile.id === nextSelectedId,
      );
      setDraft(nextDraft ? { ...nextDraft, modules: [...nextDraft.modules] } : emptyDraft());
    } catch (loadError: any) {
      setError(errorMessage(loadError?.message || "LOAD_FAILED"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfiles();
  }, []);

  const groupedModules = useMemo(() => {
    return modules.reduce<Record<string, ModuleCatalogItem[]>>((groups, item) => {
      groups[item.group] = [...(groups[item.group] || []), item];
      return groups;
    }, {});
  }, [modules]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...internalUsers]
      .filter((user) => {
        if (!term) return true;
        return [user.name, user.username, user.role, user.department]
          .some((value) => String(value || "").toLowerCase().includes(term));
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pt-BR"));
  }, [internalUsers, search]);

  const selectProfile = (profile: AccessProfileDefinition) => {
    setSelectedId(profile.id);
    setDraft({ ...profile, modules: [...profile.modules] });
    setNotice("");
    setError("");
  };

  const startNewProfile = () => {
    setSelectedId("__new__");
    setDraft(emptyDraft());
    setNotice("");
    setError("");
  };

  const toggleModule = (moduleId: AccessModuleId) => {
    if (draft.id === "administrator") return;
    setDraft((current) => ({
      ...current,
      modules: current.modules.includes(moduleId)
        ? current.modules.filter((id) => id !== moduleId)
        : [...current.modules, moduleId],
    }));
  };

  const saveProfile = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await authJsonFetch("/api/internal/access-profiles", {
        method: "PUT",
        body: JSON.stringify({
          id: selectedId === "__new__" ? undefined : draft.id,
          name: draft.name,
          description: draft.description,
          modules: draft.modules,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "SAVE_FAILED");
      setNotice(
        data?.affectedUsers > 0
          ? `Perfil salvo. ${data.affectedUsers} usuário(s) vinculado(s) receberão a nova autorização na próxima atualização do login.`
          : "Perfil salvo com sucesso.",
      );
      await loadProfiles(data?.profile?.id);
    } catch (saveError: any) {
      setError(errorMessage(saveError?.message || "SAVE_FAILED"));
    } finally {
      setSaving(false);
    }
  };

  const assignProfile = async (user: PortalUser, accessProfileId: string) => {
    if (!user.id) return;
    setAssigningUserId(user.id);
    setError("");
    setNotice("");
    try {
      const updated = await onAssignAccessProfile(user.id, accessProfileId);
      const profile = profiles.find(({ id }) => id === accessProfileId);
      setNotice(
        `Perfil ${profile?.name || accessProfileId} atribuído a ${updated.name || user.name}. O cargo profissional foi preservado.`,
      );
    } catch (assignError: any) {
      setError(errorMessage(assignError?.message || "ASSIGN_FAILED"));
    } finally {
      setAssigningUserId("");
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-10 flex items-center justify-center text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando perfis de acesso...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-950">
        <div className="font-extrabold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Cargo profissional e autorização estão separados
        </div>
        <p className="mt-1 text-xs leading-relaxed">
          O campo <b>Cargo</b> continua descrevendo a função do colaborador na empresa. O perfil abaixo
          controla exclusivamente quais módulos do sistema ele pode abrir. Somente Administradores podem
          alterar esta configuração.
        </p>
      </div>

      {(notice || error) && (
        <div
          className={`rounded-xl border p-3 text-sm font-semibold ${
            error
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {error || notice}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-5">
        <aside className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm h-fit">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-royal-blue" /> Perfis
            </h3>
            <button
              type="button"
              onClick={startNewProfile}
              className="p-2 rounded-lg bg-royal-blue text-white hover:bg-blue-800"
              title="Criar novo perfil"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => selectProfile(profile)}
                className={`w-full text-left rounded-xl border p-3 transition-colors ${
                  selectedId === profile.id
                    ? "border-royal-blue bg-blue-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="font-bold text-sm text-slate-900 flex items-center justify-between gap-2">
                  <span>{profile.name}</span>
                  {profile.id === "administrator" && <ShieldCheck className="h-4 w-4 text-emerald-600" />}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {profile.modules.length} módulo(s)
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-xs font-bold text-slate-700">
              Nome do perfil
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                disabled={draft.id === "administrator"}
                maxLength={100}
                className="mt-1 w-full border border-slate-300 rounded-lg p-2.5 disabled:bg-slate-100"
                placeholder="Ex.: Comercial, Técnico de Campo..."
              />
            </label>
            <label className="text-xs font-bold text-slate-700">
              Descrição
              <input
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                disabled={draft.id === "administrator"}
                maxLength={400}
                className="mt-1 w-full border border-slate-300 rounded-lg p-2.5 disabled:bg-slate-100"
                placeholder="Finalidade deste perfil"
              />
            </label>
          </div>

          <div>
            <h4 className="font-extrabold text-slate-900 mb-3">Módulos autorizados</h4>
            <div className="space-y-4">
              {Object.entries(groupedModules).map(([group, items]) => (
                <div key={group}>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    {group}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {items.map((item) => {
                      const checked = draft.modules.includes(item.id);
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => toggleModule(item.id)}
                          disabled={draft.id === "administrator"}
                          className={`text-left rounded-xl border p-3 text-xs font-bold flex items-center gap-2 ${
                            checked
                              ? "border-blue-300 bg-blue-50 text-blue-900"
                              : "border-slate-200 bg-white text-slate-600"
                          } disabled:cursor-not-allowed`}
                        >
                          <span
                            className={`h-5 w-5 rounded flex items-center justify-center border ${
                              checked ? "bg-royal-blue border-royal-blue text-white" : "border-slate-300"
                            }`}
                          >
                            {checked && <Check className="h-3.5 w-3.5" />}
                          </span>
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void saveProfile()}
              disabled={saving || draft.id === "administrator"}
              className="px-5 py-2.5 rounded-xl bg-royal-blue hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {selectedId === "__new__" ? "Criar perfil" : "Salvar permissões"}
            </button>
          </div>
        </section>
      </div>

      <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-royal-blue" /> Perfil por colaborador
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              A alteração não modifica Cargo, matrícula, documentos nem dados de RH.
            </p>
          </div>
          <label className="relative block sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full border border-slate-300 rounded-xl py-2 pl-9 pr-3 text-xs"
              placeholder="Buscar colaborador, usuário ou cargo"
            />
          </label>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-3">Colaborador</th>
                <th className="text-left p-3">Cargo profissional</th>
                <th className="text-left p-3">Perfil de acesso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const currentProfileId = user.accessProfileId || resolveLegacyAccessProfileId(user);
                const isSelf = Boolean(currentUser?.id && currentUser.id === user.id);
                return (
                  <tr key={user.id || user.username}>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{user.name || "Sem nome"}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{user.username}</div>
                    </td>
                    <td className="p-3 text-slate-700">{user.role || "Não informado"}</td>
                    <td className="p-3 min-w-64">
                      <div className="flex items-center gap-2">
                        <select
                          value={currentProfileId}
                          onChange={(event) => void assignProfile(user, event.target.value)}
                          disabled={assigningUserId === user.id}
                          className="w-full border border-slate-300 rounded-lg p-2 bg-white font-semibold disabled:opacity-60"
                        >
                          {profiles.map((profile) => (
                            <option
                              key={profile.id}
                              value={profile.id}
                              disabled={isSelf && profile.id !== "administrator"}
                            >
                              {profile.name}
                            </option>
                          ))}
                        </select>
                        {assigningUserId === user.id && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
