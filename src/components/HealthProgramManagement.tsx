import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Mail, 
  Trash2, 
  Edit, 
  Eye, 
  Upload, 
  Building, 
  User, 
  Calendar, 
  FileCheck, 
  Download, 
  RefreshCw,
  Send,
  Camera
} from 'lucide-react';
import { HealthProgramDocument, HealthProgramDocType } from '../types';
import { 
  syncHealthProgramDocs, 
  addHealthProgramDoc, 
  updateHealthProgramDoc, 
  deleteHealthProgramDoc,
  uploadCorporateFile,
  fetchCorporateFileBlobUrl,
  downloadCorporateFile,
} from '../lib/firebase';
import { authJsonFetch, verifyAdminCredentials } from '../utils/authApi';
import { isAdministratorAccess, userCanEditModule } from '../access-control';

interface HealthProgramManagementProps {
  currentUser?: {
    name?: string;
    username?: string;
    role?: string;
    permissionLevel?: string;
    accessProfileId?: string;
    allowedModules?: string[];
    editableModules?: string[];
    password?: string;
  };
  internalUsers?: any[];
}

const RECIPIENT_EMAILS = [
  "comercial@comanins.com.br",
  "fabio.teixeira@comanins.com.br",
  "financeiro@comanins.com.br",
  "manutencao@comanins.com.br",
  "isidro.teixeira@comanins.com.br"
];

export const HealthProgramManagement: React.FC<HealthProgramManagementProps> = ({ currentUser, internalUsers }) => {
  const [docs, setDocs] = useState<HealthProgramDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const isUserAdmin = isAdministratorAccess(currentUser);
  const canEditHealthPrograms = userCanEditModule(currentUser, 'health_programs');

  // Delete Password Confirmation Modal State
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<HealthProgramDocument | null>(null);
  const [deletePasswordInput, setDeletePasswordInput] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string>('');
  
  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingDoc, setEditingDoc] = useState<HealthProgramDocument | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDocType, setFormDocType] = useState<HealthProgramDocType>('PGR');
  const [formIssueDate, setFormIssueDate] = useState<string>('');
  const [formExpirationDate, setFormExpirationDate] = useState<string>('');
  const [formCompany, setFormCompany] = useState<string>('');
  const [formTechnical, setFormTechnical] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formFileUrl, setFormFileUrl] = useState<string>(''); // legado: arquivos antigos em Base64/URL
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formFileName, setFormFileName] = useState<string>('');
  const [formFileType, setFormFileType] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<HealthProgramDocument | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  // Email Alert Feedback State
  const [sendingAlert, setSendingAlert] = useState<boolean>(false);
  const [alertFeedback, setAlertFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Firestore Sync (No auto-reseeding to keep database production-clean)
  useEffect(() => {
    let unsubscribe: () => void;
    
    syncHealthProgramDocs((data) => {
      setDocs(data);
      setLoading(false);
    }).then(unsub => {
      unsubscribe = unsub;
    }).catch(err => {
      console.error("Erro ao sincronizar documentos de programa de saúde:", err);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!canEditHealthPrograms) {
      setShowModal(false);
      setEditingDoc(null);
      setDeleteConfirmDoc(null);
      setFormFile(null);
    }
  }, [canEditHealthPrograms]);

  // Documentos novos são privados no Storage; para visualizar usamos uma URL
  // temporária em memória obtida pelo backend autenticado.
  useEffect(() => {
    let cancelled = false;
    let createdUrl = '';
    const loadPreview = async () => {
      setPreviewBlobUrl('');
      if (!previewDoc?.fileStoragePath) return;
      setPreviewLoading(true);
      try {
        createdUrl = await fetchCorporateFileBlobUrl(previewDoc.fileStoragePath);
        if (!cancelled) setPreviewBlobUrl(createdUrl);
      } catch (error) {
        console.error('Erro ao carregar documento privado de SST:', error);
        if (!cancelled) alert('Não foi possível carregar o arquivo anexo. Verifique sua sessão e tente novamente.');
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    };
    void loadPreview();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [previewDoc?.id, previewDoc?.fileStoragePath]);

  // Calculate days remaining helper
  const getDaysRemaining = (expDateStr: string): number => {
    if (!expDateStr) return 999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = expDateStr.split('-').map(Number);
    const exp = new Date(y, m - 1, d);
    exp.setHours(0, 0, 0, 0);
    const diffMs = exp.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  // Helper for Status Badge info
  const getStatusInfo = (expDateStr: string) => {
    const days = getDaysRemaining(expDateStr);
    if (days < 0) {
      return {
        label: `Vencido há ${Math.abs(days)} dia(s)`,
        status: 'vencido',
        badgeClass: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle,
        days
      };
    } else if (days <= 30) {
      return {
        label: days === 0 ? 'Vence Hoje!' : `A Vencer em ${days} dia(s)`,
        status: 'a_vencer',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse',
        icon: AlertTriangle,
        days
      };
    } else {
      return {
        label: `Válido (${days} dias)`,
        status: 'valido',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: CheckCircle,
        days
      };
    }
  };

  // Filtered Documents
  const processedDocs = useMemo(() => {
    return docs.map(doc => {
      const daysRemaining = getDaysRemaining(doc.expirationDate);
      const statusObj = getStatusInfo(doc.expirationDate);
      return {
        ...doc,
        daysRemaining,
        statusType: statusObj.status
      };
    }).filter(doc => {
      // Search
      const q = search.toLowerCase().trim();
      const matchSearch = !q || 
        doc.title.toLowerCase().includes(q) ||
        doc.docType.toLowerCase().includes(q) ||
        (doc.responsibleCompany && doc.responsibleCompany.toLowerCase().includes(q)) ||
        (doc.responsibleTechnical && doc.responsibleTechnical.toLowerCase().includes(q));

      // Doc Type
      const matchType = filterType === 'all' || doc.docType === filterType;

      // Status Filter
      const matchStatus = filterStatus === 'all' || doc.statusType === filterStatus;

      return matchSearch && matchType && matchStatus;
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [docs, search, filterType, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    let total = docs.length;
    let valid = 0;
    let warning = 0;
    let expired = 0;

    docs.forEach(doc => {
      const days = getDaysRemaining(doc.expirationDate);
      if (days < 0) expired++;
      else if (days <= 30) warning++;
      else valid++;
    });

    return { total, valid, warning, expired };
  }, [docs]);

  // Urgent docs for Banner and Email
  const urgentDocs = useMemo(() => {
    return docs.map(d => ({
      ...d,
      daysRemaining: getDaysRemaining(d.expirationDate)
    })).filter(d => d.daysRemaining <= 30);
  }, [docs]);

  // Handle Form Modal Reset
  const handleOpenModal = (docToEdit?: HealthProgramDocument) => {
    if (!canEditHealthPrograms) {
      alert("Seu perfil possui somente permissão de visualização em Programas de Saúde.");
      return;
    }
    if (docToEdit) {
      setEditingDoc(docToEdit);
      setFormTitle(docToEdit.title);
      setFormDocType(docToEdit.docType);
      setFormIssueDate(docToEdit.issueDate);
      setFormExpirationDate(docToEdit.expirationDate);
      setFormCompany(docToEdit.responsibleCompany || '');
      setFormTechnical(docToEdit.responsibleTechnical || '');
      setFormNotes(docToEdit.notes || '');
      setFormFileUrl(docToEdit.fileUrl || '');
      setFormFile(null);
      setFormFileName(docToEdit.fileName || '');
      setFormFileType(docToEdit.fileType || '');
    } else {
      setEditingDoc(null);
      setFormTitle('');
      setFormDocType('PGR');
      setFormIssueDate(new Date().toISOString().split('T')[0]);
      // Default 1 year expiration
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setFormExpirationDate(nextYear.toISOString().split('T')[0]);
      setFormCompany('');
      setFormTechnical('');
      setFormNotes('');
      setFormFileUrl('');
      setFormFile(null);
      setFormFileName('');
      setFormFileType('');
    }
    setShowModal(true);
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEditHealthPrograms) {
      e.target.value = '';
      alert("Seu perfil possui somente permissão de visualização em Programas de Saúde.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert("O arquivo selecionado deve ter no máximo 20MB.");
      e.target.value = '';
      return;
    }

    const allowed = new Set([
      'application/pdf',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
      'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]);
    if (file.type && !allowed.has(file.type)) {
      alert('Tipo de arquivo não suportado. Utilize PDF, imagem, Word, Excel ou TXT.');
      e.target.value = '';
      return;
    }

    setFormFile(file);
    setFormFileName(file.name);
    setFormFileType(file.type || 'application/octet-stream');
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditHealthPrograms) {
      alert("Seu perfil possui somente permissão de visualização em Programas de Saúde.");
      setShowModal(false);
      return;
    }
    if (!formTitle.trim() || !formIssueDate || !formExpirationDate) {
      alert("Por favor, preencha o título do documento, a data de emissão e a data de validade.");
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const targetId = editingDoc?.id || `hpdoc_${Date.now()}`;
      let fileFields: Partial<HealthProgramDocument> = {};

      if (formFile) {
        const uploaded = await uploadCorporateFile(
          formFile,
          'health-program',
          targetId,
          `${formDocType}:${formTitle.trim()}`,
          formFile.name,
        );
        const fileHistory = [...(editingDoc?.fileHistory || [])];
        if (editingDoc?.fileStoragePath) {
          fileHistory.push({
            storagePath: editingDoc.fileStoragePath,
            fileName: editingDoc.fileName,
            fileType: editingDoc.fileType,
            fileSize: editingDoc.fileSize,
            fileSha256: editingDoc.fileSha256,
            fileVersion: editingDoc.fileVersion,
            replacedAt: now,
          });
        }
        fileFields = {
          // A versão anterior do Storage entra no histórico. Se o registro for
          // legado em Base64/URL, fileUrl não é tocado no update e permanece
          // preservado até a migração histórica controlada.
          fileName: uploaded.fileName,
          fileType: uploaded.contentType,
          fileStoragePath: uploaded.storagePath,
          fileSize: uploaded.size,
          fileSha256: uploaded.sha256,
          fileVersion: uploaded.version,
          fileHistory,
        };
      }

      const commonFields = {
        title: formTitle.trim(),
        docType: formDocType,
        issueDate: formIssueDate,
        expirationDate: formExpirationDate,
        responsibleCompany: formCompany.trim(),
        responsibleTechnical: formTechnical.trim(),
        notes: formNotes.trim(),
        updatedAt: now,
        ...fileFields,
      };

      if (editingDoc) {
        await updateHealthProgramDoc(editingDoc.id, commonFields);
      } else {
        await addHealthProgramDoc({
          ...commonFields,
          // Nenhum arquivo novo => campos legados ficam vazios.
          fileUrl: formFile ? '' : formFileUrl,
          fileName: formFileName,
          fileType: formFileType,
          createdAt: now,
          createdBy: currentUser?.name || currentUser?.username || 'Usuário do Portal'
        } as Omit<HealthProgramDocument, 'id'>, targetId);
      }
      setShowModal(false);
      setFormFile(null);
    } catch (err) {
      console.error("Erro ao salvar documento de programa de saúde:", err);
      alert("Ocorreu um erro ao salvar o documento. O registro não foi concluído; tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  // Download Attached File Helper
  const handleDownloadFile = async (doc: HealthProgramDocument) => {
    const fileName = doc.fileName || `${doc.title}.pdf`;
    if (doc.fileStoragePath) {
      try {
        await downloadCorporateFile(doc.fileStoragePath, fileName);
      } catch (error) {
        console.error('Erro ao baixar documento privado:', error);
        alert('Não foi possível baixar o arquivo.');
      }
      return;
    }
    if (!doc.fileUrl) return;
    try {
      const link = document.createElement('a');
      link.href = doc.fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Erro ao baixar arquivo legado:", err);
      window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Request Delete Handler (Admin check)
  const handleRequestDelete = (doc: HealthProgramDocument) => {
    if (!canEditHealthPrograms) {
      alert("Seu perfil possui somente permissão de visualização em Programas de Saúde.");
      return;
    }
    if (!isUserAdmin) {
      alert("Apenas usuários com perfil Administrador podem arquivar documentos de Programas de Saúde (PGR/PCMSO).");
      return;
    }
    setDeleteConfirmDoc(doc);
    setDeletePasswordInput('');
    setDeleteError('');
  };

  // Confirm Delete Handler with Password Validation
  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditHealthPrograms || !isUserAdmin) {
      setDeleteConfirmDoc(null);
      alert("Operação não permitida para o seu perfil.");
      return;
    }
    if (!deleteConfirmDoc) return;

    const pwd = deletePasswordInput.trim();
    if (!pwd) {
      setDeleteError("Por favor, digite a sua senha de login.");
      return;
    }

    try {
      const isValid = await verifyAdminCredentials(currentUser?.username || '', pwd);
      if (!isValid) {
        setDeleteError("Credencial administrativa inválida. O arquivamento foi cancelado.");
        return;
      }
    } catch (error: any) {
      setDeleteError(error?.message || "Não foi possível validar a autorização administrativa.");
      return;
    }

    try {
      await deleteHealthProgramDoc(deleteConfirmDoc.id);
      setDeleteConfirmDoc(null);
      setDeletePasswordInput('');
    } catch (err) {
      console.error("Erro ao arquivar documento:", err);
      setDeleteError("Falha ao arquivar o documento no banco de dados.");
    }
  };

  // Send Email Alert Handler
  const handleSendEmailAlert = async () => {
    if (!canEditHealthPrograms) {
      alert("Seu perfil possui somente permissão de visualização em Programas de Saúde.");
      return;
    }
    setSendingAlert(true);
    setAlertFeedback(null);

    try {
      const response = await authJsonFetch('/api/send-health-program-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docs: urgentDocs })
      });

      const resData = await response.json();
      if (resData.success) {
        setAlertFeedback({
          type: 'success',
          message: `Notificação enviada com sucesso para os 5 destinatários configurados!`
        });
      } else {
        setAlertFeedback({
          type: 'error',
          message: `Ocorreu uma falha ao enviar o e-mail: ${resData.error || 'Erro desconhecido'}`
        });
      }
    } catch (err: any) {
      console.error("Erro ao solicitar envio de e-mail de alerta:", err);
      setAlertFeedback({
        type: 'error',
        message: "Erro de conexão ao enviar o e-mail de notificação."
      });
    } finally {
      setSendingAlert(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 text-white p-6 rounded-xl shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-blue-600/30 rounded-lg border border-blue-400/30">
              <ShieldCheck className="h-7 w-7 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Programas de Saúde e Segurança (SST)</h1>
              <p className="text-slate-300 text-sm">
                Controle de validade e anexos de laudos e programas regulatórios (PGR, PCMSO, LTCAT, etc.)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canEditHealthPrograms && (
            <>
              <button
                onClick={() => handleSendEmailAlert()}
                disabled={sendingAlert}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg border border-slate-700 text-sm font-semibold flex items-center space-x-2 transition-all shadow-sm hover:shadow focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                title="Enviar e-mail para comercial, fabio.teixeira, financeiro, manutencao e isidro.teixeira"
              >
                {sendingAlert ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
                ) : (
                  <Send className="h-4 w-4 text-blue-400" />
                )}
                <span>Notificar por E-mail</span>
              </button>

              <button
                onClick={() => handleOpenModal()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold flex items-center space-x-2 transition-all shadow-md hover:shadow-lg focus:ring-2 focus:ring-blue-400"
              >
                <Plus className="h-4 w-4" />
                <span>Novo Documento</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Alert Feedback Toast */}
      {alertFeedback && (
        <div className={`p-4 rounded-lg border text-sm flex items-start justify-between ${
          alertFeedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center space-x-2">
            {alertFeedback.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <span>{alertFeedback.message}</span>
          </div>
          <button 
            onClick={() => setAlertFeedback(null)} 
            className="text-slate-400 hover:text-slate-600 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Recipient Notice Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Mail className="h-4 w-4 text-slate-500 shrink-0" />
          <span><b>E-mails configurados para notificações automáticas (30 dias antes do vencimento):</b></span>
        </div>
        <div className="flex flex-wrap gap-1">
          {RECIPIENT_EMAILS.map((email, idx) => (
            <span key={idx} className="bg-white border border-slate-300 text-slate-700 px-2 py-0.5 rounded text-[11px] font-mono">
              {email}
            </span>
          ))}
        </div>
      </div>

      {/* Urgent Warning Banner if Any Expiring Docs */}
      {urgentDocs.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 animate-bounce" />
              <span>Atenção: Existe(m) {urgentDocs.length} documento(s) com vencimento em até 30 dias ou vencido(s)!</span>
            </div>
            <button
              onClick={handleSendEmailAlert}
              disabled={sendingAlert}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3 py-1.5 rounded transition shadow-sm flex items-center space-x-1"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Disparar Alerta Agora</span>
            </button>
          </div>
          <div className="text-xs text-amber-800 space-y-1 pl-7">
            {urgentDocs.map(doc => (
              <div key={doc.id} className="flex items-center space-x-2">
                <span className="font-semibold">• [{doc.docType}] {doc.title}:</span>
                <span>Validade: {new Date(doc.expirationDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  doc.daysRemaining < 0 ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'
                }`}>
                  {doc.daysRemaining < 0 ? `Vencido há ${Math.abs(doc.daysRemaining)} dias` : doc.daysRemaining === 0 ? 'Vence Hoje' : `Vence em ${doc.daysRemaining} dias`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total de Documentos</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Válidos (&gt;30 dias)</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.valid}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">A Vencer (&le;30 dias)</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.warning}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vencidos</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.expired}</p>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <XCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, tipo, empresa ou técnico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="all">Todos os Tipos (PGR, PCMSO, LTCAT...)</option>
              <option value="PGR">PGR - Prog. de Gerenciamento de Riscos</option>
              <option value="PCMSO">PCMSO - Controle Médico de Saúde Ocupacional</option>
              <option value="LTCAT">LTCAT - Laudo Técnico Condições Ambientais</option>
              <option value="PPP">PPP - Perfil Profissiográfico Previdenciário</option>
              <option value="AET">AET - Análise Ergonômica do Trabalho</option>
              <option value="APR">APR - Análise Preliminar de Risco</option>
              <option value="DIR">DIR - Declaração Inexistência de Risco</option>
              <option value="Outro">Outro Documento</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="all">Todos os Status de Validade</option>
              <option value="valido">🟢 Válidos (&gt; 30 dias)</option>
              <option value="a_vencer">🟡 A Vencer em Breve (&le; 30 dias)</option>
              <option value="vencido">🔴 Vencidos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="text-sm">Carregando documentos de programas de saúde...</p>
          </div>
        ) : processedDocs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <FileText className="h-12 w-12 text-slate-300 mx-auto" />
            <p className="text-slate-700 font-medium">Nenhum documento encontrado.</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Clique no botão "Novo Documento" para cadastrar os programas de saúde (PGR, PCMSO, LTCAT) da empresa com datas de emissão e validade.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Documento / Programa</th>
                  <th className="py-3 px-4">Emissão</th>
                  <th className="py-3 px-4">Validade</th>
                  <th className="py-3 px-4">Situação / Notificação</th>
                  <th className="py-3 px-4">Responsável / Consultoria</th>
                  <th className="py-3 px-4 text-center">Anexo</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {processedDocs.map((doc) => {
                  const statusInfo = getStatusInfo(doc.expirationDate);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      {/* Title & Type */}
                      <td className="py-3 px-4">
                        <div className="flex items-start space-x-3">
                          <span className="mt-0.5 px-2 py-1 rounded text-xs font-bold bg-slate-800 text-white shrink-0">
                            {doc.docType}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">{doc.title}</p>
                            {doc.notes && (
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{doc.notes}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Issue Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 text-xs">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{doc.issueDate ? new Date(doc.issueDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</span>
                        </div>
                      </td>

                      {/* Expiration Date */}
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-xs">
                        <div className="flex items-center space-x-1 text-slate-900">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{doc.expirationDate ? new Date(doc.expirationDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold border ${statusInfo.badgeClass}`}>
                          <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>

                      {/* Responsible */}
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {doc.responsibleCompany && (
                          <div className="flex items-center space-x-1 font-medium text-slate-800">
                            <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{doc.responsibleCompany}</span>
                          </div>
                        )}
                        {doc.responsibleTechnical && (
                          <div className="flex items-center space-x-1 text-slate-500 mt-0.5">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{doc.responsibleTechnical}</span>
                          </div>
                        )}
                        {!doc.responsibleCompany && !doc.responsibleTechnical && (
                          <span className="text-slate-400 font-italic">Não informado</span>
                        )}
                      </td>

                      {/* Attachment */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {(doc.fileStoragePath || doc.fileUrl) ? (
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold border border-blue-200 transition"
                              title="Visualizar documento"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Visualizar</span>
                            </button>
                            <button
                              onClick={() => void handleDownloadFile(doc)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-xs font-semibold border border-slate-300 transition"
                              title="Baixar arquivo"
                            >
                              <Download className="h-3.5 w-3.5 text-slate-600" />
                              <span>Baixar</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Sem anexo</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          {canEditHealthPrograms && (
                            <button
                              onClick={() => handleOpenModal(doc)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                              title="Editar Documento"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}

                          {canEditHealthPrograms && (
                            <button
                              onClick={() => handleRequestDelete(doc)}
                              disabled={!isUserAdmin}
                              className={`p-1.5 rounded transition ${
                                isUserAdmin
                                  ? 'text-slate-600 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                                  : 'text-slate-300 cursor-not-allowed opacity-40'
                              }`}
                              title={isUserAdmin ? "Arquivar Documento (Requer senha de Administrador)" : "Apenas usuários com perfil Administrador podem arquivar"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && canEditHealthPrograms && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="h-6 w-6 text-blue-400" />
                <h3 className="font-bold text-lg">
                  {editingDoc ? 'Editar Documento de Saúde' : 'Anexar Documento de Saúde (SST)'}
                </h3>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white font-bold text-xl p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Doc Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tipo de Documento *
                  </label>
                  <select
                    value={formDocType}
                    onChange={(e) => setFormDocType(e.target.value as HealthProgramDocType)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    required
                  >
                    <option value="PGR">PGR (Prog. Gerenciamento Riscos)</option>
                    <option value="PCMSO">PCMSO (Controle Médico)</option>
                    <option value="LTCAT">LTCAT (Laudo Cond. Ambientais)</option>
                    <option value="PPP">PPP (Perfil Profissiográfico)</option>
                    <option value="AET">AET (Análise Ergonômica)</option>
                    <option value="APR">APR (Análise Preliminar Risco)</option>
                    <option value="DIR">DIR (Declaração Inexistência Risco)</option>
                    <option value="Outro">Outro Documento</option>
                  </select>
                </div>

                {/* Title */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nome / Título do Documento *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: PGR 2026 - Programa de Gerenciamento de Riscos"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Issue Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Data de Emissão *
                  </label>
                  <input
                    type="date"
                    value={formIssueDate}
                    onChange={(e) => setFormIssueDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Expiration Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Data de Validade *
                  </label>
                  <input
                    type="date"
                    value={formExpirationDate}
                    onChange={(e) => setFormExpirationDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-[11px] text-amber-700 mt-1 font-medium">
                    ⚡ Notificação por e-mail automática 30 dias antes do vencimento.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Responsible Company */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Empresa / Consultoria Responsável
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: SST Engenharia & Soluções"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Responsible Technical */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Responsável Técnico (Engenheiro/Médico/Técnico)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Eng. Fulano - CREA/MTE 12345"
                    value={formTechnical}
                    onChange={(e) => setFormTechnical(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Observações / Recomendações
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais ou pendências do laudo..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Attachment File Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Anexar Arquivo do Documento (PDF / Imagem)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                  <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 text-center bg-slate-50 transition cursor-pointer relative">
                    <input
                      type="file"
                      accept=".pdf,image/*,.heic,.heif"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="h-8 w-8 text-slate-400 mx-auto mb-1" />
                    {formFileName ? (
                      <div className="text-sm font-semibold text-blue-700">
                        📄 Arquivo Selecionado: {formFileName}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600">
                        <span className="font-bold text-blue-600">Clique para selecionar</span> ou arraste o arquivo aqui
                      </div>
                    )}
                  </div>
                  <label className="cursor-pointer px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center space-x-2 hover:bg-blue-100 transition-colors">
                    <Camera className="h-5 w-5" />
                    <span>Tirar foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-500">Formatos aceitos: PDF, JPG, PNG, WEBP, GIF e HEIC/HEIF.</p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow transition flex items-center space-x-2 disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="h-4 w-4 animate-spin" />}
                  <span>{editingDoc ? 'Salvar Alterações' : 'Cadastrar Documento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <FileCheck className="h-5 w-5 text-blue-400" />
                <h3 className="font-bold text-base truncate">{previewDoc.title}</h3>
              </div>
              <button 
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-white font-bold text-xl px-2"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs text-slate-700 border border-slate-200">
                <div>
                  <span className="font-bold text-slate-500">Tipo:</span> {previewDoc.docType}
                </div>
                <div>
                  <span className="font-bold text-slate-500">Situação:</span> {getStatusInfo(previewDoc.expirationDate).label}
                </div>
                <div>
                  <span className="font-bold text-slate-500">Data de Emissão:</span> {new Date(previewDoc.issueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
                <div>
                  <span className="font-bold text-slate-500">Data de Validade:</span> {new Date(previewDoc.expirationDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
                {previewDoc.responsibleCompany && (
                  <div>
                    <span className="font-bold text-slate-500">Consultoria:</span> {previewDoc.responsibleCompany}
                  </div>
                )}
                {previewDoc.responsibleTechnical && (
                  <div>
                    <span className="font-bold text-slate-500">Resp. Técnico:</span> {previewDoc.responsibleTechnical}
                  </div>
                )}
              </div>

              {(previewDoc.fileStoragePath || previewDoc.fileUrl) ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100 flex flex-col items-center justify-center min-h-[300px]">
                  {previewLoading ? (
                    <div className="text-center p-8 text-slate-500 text-sm">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Carregando arquivo protegido...
                    </div>
                  ) : (() => {
                    const resolvedUrl = previewDoc.fileStoragePath ? previewBlobUrl : (previewDoc.fileUrl || '');
                    const mime = previewDoc.fileType || '';
                    const isImage = mime.startsWith('image/') || resolvedUrl.startsWith('data:image/');
                    const isPdf = mime === 'application/pdf' || resolvedUrl.startsWith('data:application/pdf');
                    if (resolvedUrl && isImage) {
                      return <img src={resolvedUrl} alt={previewDoc.title} className="max-h-[500px] object-contain" />;
                    }
                    if (resolvedUrl && isPdf) {
                      return <iframe src={resolvedUrl} className="w-full h-[500px]" title={previewDoc.title} />;
                    }
                    return (
                      <div className="text-center p-6 space-y-3">
                        <FileText className="h-12 w-12 text-slate-400 mx-auto" />
                        <p className="text-sm font-semibold text-slate-700">{previewDoc.fileName || 'Arquivo Anexado'}</p>
                        <button
                          type="button"
                          onClick={() => void handleDownloadFile(previewDoc)}
                          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 transition shadow"
                        >
                          <Download className="h-4 w-4" />
                          <span>Baixar Arquivo</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 italic text-sm">
                  Nenhum arquivo de documento foi anexado a este registro.
                </div>
              )}
            </div>

            <div className="bg-slate-100 p-4 border-t border-slate-200 flex items-center justify-between shrink-0">
              {(previewDoc.fileStoragePath || previewDoc.fileUrl) ? (
                <button
                  onClick={() => void handleDownloadFile(previewDoc)}
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-xs hover:bg-blue-700 transition flex items-center space-x-1.5 shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  <span>Baixar Arquivo Anexo</span>
                </button>
              ) : <div />}
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-slate-800 text-white font-semibold rounded-lg text-xs hover:bg-slate-700 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Password Confirmation Modal */}
      {deleteConfirmDoc && canEditHealthPrograms && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-red-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trash2 className="h-5 w-5" />
                <h3 className="font-bold text-base">Confirmar Arquivamento com Senha</h3>
              </div>
              <button
                onClick={() => setDeleteConfirmDoc(null)}
                className="text-white/80 hover:text-white font-bold text-xl px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmDelete} className="p-6 space-y-4">
              <p className="text-xs text-slate-700">
                Você está prestes a arquivar este documento de saúde. Ele sairá da lista operacional, mas permanecerá preservado no banco e na trilha de auditoria:
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-900">
                {deleteConfirmDoc.title}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Digite a Senha do Usuário Logado ({currentUser?.name || currentUser?.username || 'Administrador'}) *
                </label>
                <input
                  type="password"
                  autoFocus
                  required
                  value={deletePasswordInput}
                  onChange={(e) => {
                    setDeletePasswordInput(e.target.value);
                    setDeleteError('');
                  }}
                  placeholder="Digite sua senha de login..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                {deleteError && (
                  <p className="text-xs font-bold text-red-600 mt-1">{deleteError}</p>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmDoc(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow transition flex items-center space-x-1"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Confirmar Exclusão</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthProgramManagement;
