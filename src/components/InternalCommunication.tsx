import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Paperclip, 
  Send, 
  CheckCircle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  User, 
  X, 
  Mail, 
  Trash2, 
  ArrowLeft, 
  Download, 
  Eye, 
  Image as ImageIcon,
  Megaphone,
  Users,
  AlertTriangle,
  ShieldAlert,
  Briefcase,
  GraduationCap,
  Sparkles,
  CheckCheck,
  Bell,
  Check,
  ExternalLink,
  ChevronRight,
  Info
} from "lucide-react";
import { 
  InternalTicket, 
  TicketMessage, 
  CompanyCommunication, 
  CompanyCommunicationCardType, 
  CompanyCommunicationPriority 
} from "../types";
import { 
  syncInternalTickets, 
  saveInternalTicket, 
  deleteInternalTicket, 
  syncCompanyCommunications,
  saveCompanyCommunication,
  markCompanyCommunicationAsRead,
  deleteCompanyCommunication,
  PortalUser 
} from "../lib/firebase";
import { compressImageToWebResolution } from "../lib/imageCompressor";
import { safeFetch } from "../utils/apiClient";
import { isAdministratorAccess, userHasAccessModule } from "../access-control";
import { verifyCurrentAdminPassword } from "../utils/authApi";

export interface ParsedAttachment {
  name: string;
  url: string;
  type: string;
  isImage: boolean;
  isPdf: boolean;
}

export function parseAttachment(att: string, index: number): ParsedAttachment {
  if (!att) {
    return { name: `Anexo_${index + 1}`, url: '', type: '', isImage: false, isPdf: false };
  }

  if (att.trim().startsWith('{')) {
    try {
      const obj = JSON.parse(att);
      const url = obj.url || '';
      const name = obj.name || `Anexo_${index + 1}`;
      const type = obj.type || '';
      const isImage = type.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i.test(name) || url.startsWith('data:image/');
      const isPdf = type === 'application/pdf' || /\.pdf$/i.test(name) || url.startsWith('data:application/pdf');
      return { name, url, type, isImage, isPdf };
    } catch (e) {
      // ignore
    }
  }

  const isImage = att.startsWith('data:image/') || /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i.test(att);
  const isPdf = att.startsWith('data:application/pdf') || /\.pdf$/i.test(att);

  return {
    name: `Anexo_${index + 1}.${isImage ? 'png' : isPdf ? 'pdf' : 'bin'}`,
    url: att,
    type: isImage ? 'image/png' : isPdf ? 'application/pdf' : 'application/octet-stream',
    isImage,
    isPdf
  };
}

export function handleDownloadAttachment(att: ParsedAttachment) {
  if (!att.url) return;
  if (att.url.startsWith('data:')) {
    try {
      const arr = att.url.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : (att.type || 'application/octet-stream');
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = att.name || 'anexo';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (err) {
      console.error("Erro no download de data URL:", err);
      window.open(att.url, '_blank');
    }
  } else {
    const a = document.createElement('a');
    a.href = att.url;
    a.download = att.name || 'anexo';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

export function handleViewAttachment(att: ParsedAttachment, onOpenPreviewModal?: (att: ParsedAttachment) => void) {
  if (!att.url) return;
  if (onOpenPreviewModal) {
    onOpenPreviewModal(att);
    return;
  }
  if (att.url.startsWith('data:')) {
    try {
      const arr = att.url.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : (att.type || 'application/octet-stream');
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error("Erro ao abrir visualização:", err);
      window.open(att.url, '_blank');
    }
  } else {
    window.open(att.url, '_blank');
  }
}

function AttachmentCard({ attRaw, index, isMe = false, onOpenPreview }: { key?: any; attRaw: string; index: number; isMe?: boolean; onOpenPreview: (att: ParsedAttachment) => void }) {
  const att = parseAttachment(attRaw, index);

  return (
    <div className={`group flex flex-col p-2.5 rounded-xl border transition-all shadow-xs ${
      isMe 
        ? 'bg-blue-900/60 border-blue-400/40 text-white hover:bg-blue-900/80' 
        : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300'
    } w-full sm:w-[220px]`}>
      
      {/* Thumbnail for images */}
      {att.isImage && (
        <div 
          onClick={() => onOpenPreview(att)}
          className="w-full h-28 mb-2 rounded-lg overflow-hidden bg-slate-900/10 cursor-pointer relative group/img flex items-center justify-center border border-black/10"
        >
          <img src={att.url} alt={att.name} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center space-x-1.5 text-white font-semibold text-xs">
            <Eye className="h-4 w-4" />
            <span>Visualizar</span>
          </div>
        </div>
      )}

      {/* Header with Name and Icon */}
      <div className="flex items-center space-x-2 overflow-hidden mb-2">
        {att.isImage ? (
          <ImageIcon className={`h-4 w-4 shrink-0 ${isMe ? 'text-blue-200' : 'text-blue-600'}`} />
        ) : att.isPdf ? (
          <FileText className={`h-4 w-4 shrink-0 ${isMe ? 'text-rose-200' : 'text-rose-600'}`} />
        ) : (
          <Paperclip className={`h-4 w-4 shrink-0 ${isMe ? 'text-slate-200' : 'text-slate-600'}`} />
        )}
        <span className="text-xs font-semibold truncate" title={att.name}>
          {att.name}
        </span>
      </div>

      {/* Action Buttons: Visualizar and Baixar */}
      <div className="flex items-center space-x-1.5 mt-auto pt-2 border-t border-current/10">
        <button
          type="button"
          onClick={() => handleViewAttachment(att, onOpenPreview)}
          className={`flex-1 flex items-center justify-center space-x-1 py-1 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
            isMe
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
          }`}
          title="Visualizar arquivo"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Ver</span>
        </button>

        <button
          type="button"
          onClick={() => handleDownloadAttachment(att)}
          className={`flex-1 flex items-center justify-center space-x-1 py-1 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
            isMe
              ? 'bg-blue-400/20 hover:bg-blue-400/30 text-blue-100'
              : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
          }`}
          title="Baixar arquivo"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Baixar</span>
        </button>
      </div>
    </div>
  );
}

function InputAttachmentBadge({ attRaw, index, onRemove }: { key?: any; attRaw: string; index: number; onRemove: () => void }) {
  const att = parseAttachment(attRaw, index);

  return (
    <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-blue-900 shadow-xs">
      {att.isImage ? (
        <ImageIcon className="h-3.5 w-3.5 text-blue-600 shrink-0" />
      ) : (
        <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
      )}
      <span className="truncate max-w-[180px]" title={att.name}>{att.name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
        title="Remover anexo"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

const resolveEmployeeEmail = (u: any): string => {
  if (!u) return '';
  if (u.workEmail && typeof u.workEmail === 'string' && u.workEmail.includes('@')) return u.workEmail.trim();
  if (u.personalEmail && typeof u.personalEmail === 'string' && u.personalEmail.includes('@')) return u.personalEmail.trim();
  if (u.email && typeof u.email === 'string' && u.email.includes('@')) return u.email.trim();
  if (u.username && typeof u.username === 'string' && u.username.includes('@')) return u.username.trim();
  if (u.username && typeof u.username === 'string') return `${u.username.trim()}@comanins.com.br`;
  return '';
};

interface InternalCommunicationProps {
  currentUser?: any | null;
  internalUsers?: any[];
  targetCommunicationId?: string;
  onClearTargetCommunicationId?: () => void;
}

export default function InternalCommunication({ 
  currentUser, 
  internalUsers = [],
  targetCommunicationId,
  onClearTargetCommunicationId 
}: InternalCommunicationProps) {
  // Navigation tabs: "mural" (Notificações da Empresa) or "chamados" (Chamados e Suporte)
  const [activeTab, setActiveTab] = useState<"mural" | "chamados">("mural");

  // Company Communications state
  const [communications, setCommunications] = useState<CompanyCommunication[]>([]);
  const [muralSearch, setMuralSearch] = useState("");
  const [muralCategoryFilter, setMuralCategoryFilter] = useState<string>("todos");
  const [muralStatusFilter, setMuralStatusFilter] = useState<"todos" | "nao_lidos" | "lidos">("todos");
  const [showNewCommModal, setShowNewCommModal] = useState(false);
  const [readReceiptModalComm, setReadReceiptModalComm] = useState<CompanyCommunication | null>(null);

  // New Communication Form State
  const [commTargetType, setCommTargetType] = useState<"all" | "selected">("all");
  const [commTargetUserIds, setCommTargetUserIds] = useState<string[]>([]);
  const [commTitle, setCommTitle] = useState("");
  const [commContent, setCommContent] = useState("");
  const [commCardType, setCommCardType] = useState<CompanyCommunicationCardType>("informativo");
  const [commPriority, setCommPriority] = useState<CompanyCommunicationPriority>("normal");
  const [commAttachments, setCommAttachments] = useState<string[]>([]);
  const [commSendEmail, setCommSendEmail] = useState(true);
  const [isDispatchingComm, setIsDispatchingComm] = useState(false);
  const [commEmployeeSearch, setCommEmployeeSearch] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tickets state
  const [tickets, setTickets] = useState<InternalTicket[]>([]);
  const [ticketSearch, setTicketSearch] = useState("");
  const [filterTicketStatus, setFilterTicketStatus] = useState<"todos" | "aberto" | "respondido" | "finalizado">("todos");
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAttachments, setNewAttachments] = useState<string[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<InternalTicket | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messageAttachments, setMessageAttachments] = useState<string[]>([]);
  
  // Shared Preview Modal
  const [previewAttachment, setPreviewAttachment] = useState<ParsedAttachment | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const isUserAdmin = isAdministratorAccess(currentUser);
  const isFinanceOrAdmin =
    isUserAdmin || userHasAccessModule(currentUser, "internal_communication_management") || userHasAccessModule(currentUser, "hr");

  // Sync tickets
  useEffect(() => {
    const unsub = syncInternalTickets((list) => {
      setTickets(list);
    });
    return () => { unsub.then(u => u && u()) };
  }, []);

  // Sync company communications
  useEffect(() => {
    const unsub = syncCompanyCommunications((list) => {
      setCommunications(list || []);
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // Handle targetCommunicationId (e.g., from notification bell click)
  useEffect(() => {
    if (targetCommunicationId && communications.length > 0) {
      setActiveTab("mural");
      const target = communications.find(c => c.id === targetCommunicationId);
      if (target && currentUser) {
        // Auto mark as read
        markCompanyCommunicationAsRead(target.id, currentUser);
      }
      if (onClearTargetCommunicationId) {
        onClearTargetCommunicationId();
      }
    }
  }, [targetCommunicationId, communications, currentUser, onClearTargetCommunicationId]);

  // Keep selected ticket updated
  useEffect(() => {
    if (selectedTicket) {
      const updated = tickets.find(t => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [tickets]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Check if a communication is unread by the current user
  const isCommUnread = (c: CompanyCommunication) => {
    if (!currentUser) return false;
    if (!c.readBy) return true;
    const userKey = currentUser.username || currentUser.id || '';
    const idKey = currentUser.id || '';
    return !c.readBy[userKey] && !c.readBy[idKey];
  };

  // Filter communications relevant to this user
  const relevantCommunications = useMemo(() => {
    if (!currentUser) return communications;
    const userKey = currentUser.id || currentUser.username || '';
    const username = currentUser.username || '';

    return communications.filter((c) => {
      if (c.targetType === 'all') return true;
      if (!c.targetUserIds || c.targetUserIds.length === 0) return true;
      // Allow author or admins to see all sent communications
      if (isFinanceOrAdmin || c.authorId === userKey || c.authorId === username) return true;
      return (
        (userKey && c.targetUserIds.includes(userKey)) ||
        (username && c.targetUserIds.includes(username))
      );
    });
  }, [communications, currentUser, isFinanceOrAdmin]);

  // Count unread communications
  const unreadMuralCount = useMemo(() => {
    return relevantCommunications.filter(isCommUnread).length;
  }, [relevantCommunications, currentUser]);

  // Filtered mural communications list
  const filteredCommunications = useMemo(() => {
    return relevantCommunications.filter(c => {
      const matchSearch = !muralSearch || 
        c.title.toLowerCase().includes(muralSearch.toLowerCase()) ||
        c.content.toLowerCase().includes(muralSearch.toLowerCase()) ||
        (c.authorName && c.authorName.toLowerCase().includes(muralSearch.toLowerCase()));

      const matchCategory = muralCategoryFilter === "todos" || c.cardType === muralCategoryFilter;

      const unread = isCommUnread(c);
      const matchStatus = 
        muralStatusFilter === "todos" ||
        (muralStatusFilter === "nao_lidos" && unread) ||
        (muralStatusFilter === "lidos" && !unread);

      return matchSearch && matchCategory && matchStatus;
    });
  }, [relevantCommunications, muralSearch, muralCategoryFilter, muralStatusFilter, currentUser]);

  // Eligible employees list for targeting
  const eligibleEmployees = useMemo(() => {
    return (internalUsers || []).map(u => ({
      id: u.id || u.username,
      username: u.username || u.name,
      name: u.name || u.username,
      role: u.role || 'Colaborador',
      department: u.department || 'Geral',
      email: resolveEmployeeEmail(u)
    }));
  }, [internalUsers]);

  // Recipient emails calculation for new communication
  const computedRecipients = useMemo(() => {
    if (commTargetType === "all") {
      return eligibleEmployees
        .map(e => e.email)
        .filter(email => email && email.includes('@'));
    }
    return eligibleEmployees
      .filter(e => commTargetUserIds.includes(e.id) || commTargetUserIds.includes(e.username))
      .map(e => e.email)
      .filter(email => email && email.includes('@'));
  }, [commTargetType, commTargetUserIds, eligibleEmployees]);

  // Handle Dispatch of Company Communication
  const handleDispatchCommunication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commTitle.trim() || !commContent.trim() || !currentUser) return;
    if (commTargetType === "selected" && commTargetUserIds.length === 0) {
      alert("Por favor, selecione pelo menos um colaborador destinatário.");
      return;
    }

    setIsDispatchingComm(true);

    try {
      const selectedNames = commTargetType === "selected"
        ? eligibleEmployees.filter(e => commTargetUserIds.includes(e.id) || commTargetUserIds.includes(e.username)).map(e => e.name)
        : [];

      const newComm: CompanyCommunication = {
        id: "comm_" + Date.now().toString() + "_" + Math.random().toString(36).substring(2, 8),
        title: commTitle.trim(),
        content: commContent.trim(),
        cardType: commCardType,
        priority: commPriority,
        targetType: commTargetType,
        targetUserIds: commTargetType === "selected" ? commTargetUserIds : [],
        targetUserNames: selectedNames,
        targetEmails: computedRecipients,
        attachments: commAttachments,
        authorId: currentUser.id || currentUser.username || "admin",
        authorName: currentUser.name || currentUser.username || "Diretoria COMANINS",
        authorRole: currentUser.role || currentUser.accessProfileName || "Gestão",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        readBy: {
          [currentUser.username || currentUser.id || "admin"]: {
            readAt: new Date().toISOString(),
            userName: currentUser.name || currentUser.username || "Autor",
            userId: currentUser.id || currentUser.username
          }
        },
        emailsDispatchedCount: commSendEmail ? computedRecipients.length : 0,
        emailsDispatchedAt: commSendEmail ? new Date().toISOString() : undefined,
      };

      // 1. Save to Firestore
      await saveCompanyCommunication(newComm);

      // 2. Broadcast emails if requested
      if (commSendEmail && computedRecipients.length > 0) {
        try {
          await safeFetch("/api/company-communications/broadcast-email", {
            method: "POST",
            body: JSON.stringify({
              recipients: computedRecipients,
              title: newComm.title,
              content: newComm.content,
              cardType: newComm.cardType,
              priority: newComm.priority,
              authorName: newComm.authorName,
              attachmentsCount: newComm.attachments?.length || 0,
            })
          });
        } catch (emailErr) {
          console.warn("Aviso ao disparar e-mails:", emailErr);
        }
      }

      showToast(
        commSendEmail && computedRecipients.length > 0
          ? `✅ Notificação criada no portal e e-mails disparados para ${computedRecipients.length} colaboradores!`
          : `✅ Notificação publicada com sucesso no Mural de Comunicação Interna!`
      );

      // Reset modal form
      setShowNewCommModal(false);
      setCommTitle("");
      setCommContent("");
      setCommCardType("informativo");
      setCommPriority("normal");
      setCommTargetType("all");
      setCommTargetUserIds([]);
      setCommAttachments([]);
      setCommSendEmail(true);
    } catch (err) {
      console.error("Erro ao disparar comunicado:", err);
      alert("Ocorreu um erro ao salvar o comunicado. Verifique sua conexão.");
    } finally {
      setIsDispatchingComm(false);
    }
  };

  // Handle file attachment for new communication
  const handleAddCommAttachment = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newAtts: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 8 * 1024 * 1024) {
        alert(`O arquivo ${file.name} excede o limite de 8 MB.`);
        continue;
      }

      try {
        if (file.type.startsWith("image/")) {
          const compressed = await compressImageToWebResolution(file);
          newAtts.push(JSON.stringify({
            name: file.name,
            type: file.type,
            url: compressed
          }));
        } else {
          // Convert to data URL
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          newAtts.push(JSON.stringify({
            name: file.name,
            type: file.type,
            url: dataUrl
          }));
        }
      } catch (err) {
        console.error("Erro ao processar anexo:", err);
      }
    }

    setCommAttachments(prev => [...prev, ...newAtts]);
  };

  // Ticket handlers
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim() || !currentUser) return;
    
    const resolvedEmail = resolveEmployeeEmail(currentUser) || `${currentUser.username}@comanins.com.br`;

    const ticket: InternalTicket = {
      id: "ticket_" + Date.now().toString() + "_" + Math.random().toString(36).substring(2, 9),
      creatorId: currentUser.username || currentUser.name,
      creatorName: currentUser.name || currentUser.username,
      creatorEmail: resolvedEmail,
      title: newTitle,
      description: newDescription,
      status: "aberto",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: newAttachments,
      messages: []
    };
    
    await saveInternalTicket(ticket);
    
    safeFetch("/api/send-email", {
      method: "POST",
      body: JSON.stringify({
        to: "comercial@comanins.com.br, fabio.teixeira@comanins.com.br, financeiro@comanins.com.br, manutencao@comanins.com.br, isidro.teixeira@comanins.com.br",
        subject: `[NOVO CHAMADO] ${ticket.title} - ${ticket.creatorName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; background-color: #ffffff; color: #0f172a;">
            <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
              <h2 style="color: #1e40af; margin: 0; font-size: 18px;">📥 Novo Chamado no Portal</h2>
              <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">COMANINS Metrology Suite - Comunicação Interna</p>
            </div>
            <p>Um novo chamado foi aberto no portal:</p>
            <p><b>Colaborador:</b> ${ticket.creatorName} (${ticket.creatorEmail})</p>
            <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 14px; border-radius: 6px; margin: 16px 0;">
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #1e293b; font-weight: bold;">${ticket.title}</p>
              <p style="margin: 0; font-size: 13px; color: #334155; white-space: pre-wrap;">${ticket.description}</p>
            </div>
            <p style="font-size: 13px; color: #475569;">Acesse a aba <b>Comunicação Interna</b> no Portal COMANINS para responder.</p>
          </div>
        `
      })
    }).catch(console.error);

    setShowNewTicketModal(false);
    setNewTitle("");
    setNewDescription("");
    setNewAttachments([]);
    showToast("✅ Chamado aberto com sucesso!");
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() && messageAttachments.length === 0) return;
    if (!selectedTicket || !currentUser) return;
    
    const newMessage: TicketMessage = {
      id: "msg_" + Date.now().toString(),
      senderId: currentUser.username || currentUser.id,
      senderName: currentUser.name || currentUser.username || currentUser.id,
      text: messageText,
      createdAt: new Date().toISOString(),
      attachments: messageAttachments
    };
    
    const updatedTicket = {
      ...selectedTicket,
      messages: [...selectedTicket.messages, newMessage],
      updatedAt: new Date().toISOString(),
      status: isFinanceOrAdmin ? "respondido" : "aberto"
    } as InternalTicket;
    
    await saveInternalTicket(updatedTicket);
    setSelectedTicket(updatedTicket);
    
    if (isFinanceOrAdmin) {
      let recipientEmail = updatedTicket.creatorEmail;
      if (!recipientEmail || !recipientEmail.includes('@')) {
        const cId = updatedTicket.creatorId || updatedTicket.creatorName;
        recipientEmail = cId && cId.includes('@') ? cId : `${cId}@comanins.com.br`;
      }

      safeFetch("/api/send-email", {
        method: "POST",
        body: JSON.stringify({
          to: recipientEmail,
          subject: `[COMANINS] Resposta ao Chamado: ${updatedTicket.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; background-color: #ffffff; color: #0f172a;">
              <h2 style="color: #1e40af; margin: 0 0 12px 0;">💬 Seu Chamado foi Respondido</h2>
              <p>Olá, <b>${updatedTicket.creatorName}</b>!</p>
              <p>A equipe do Portal COMANINS respondeu ao seu chamado <b>"${updatedTicket.title}"</b>:</p>
              <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 14px; margin: 16px 0;">
                <p style="margin: 0; font-size: 14px; color: #1e293b; white-space: pre-wrap;">${newMessage.text || '(Novo arquivo anexado)'}</p>
              </div>
            </div>
          `
        })
      }).catch(console.error);
    }
    
    setMessageText("");
    setMessageAttachments([]);
  };

  const handleUpdateStatus = async (status: "aberto" | "respondido" | "finalizado") => {
    if (!selectedTicket) return;
    const updated = {
      ...selectedTicket,
      status,
      updatedAt: new Date().toISOString()
    };
    await saveInternalTicket(updated);
    setSelectedTicket(updated);
  };


  const confirmAdministratorPassword = async (actionDescription: string): Promise<boolean> => {
    if (!isUserAdmin || !currentUser?.username) {
      showToast("Somente o perfil Administrador pode executar esta exclusão.");
      return false;
    }
    const password = window.prompt(`Digite a senha do administrador logado (${currentUser.username}) para confirmar ${actionDescription}:`);
    if (password === null) return false;
    if (!password.trim()) {
      showToast("Informe a senha do administrador para continuar.");
      return false;
    }
    try {
      const valid = await verifyCurrentAdminPassword(password);
      if (!valid) {
        showToast("Credencial administrativa inválida.");
        return false;
      }
      return true;
    } catch (error: any) {
      showToast(error?.message || "Não foi possível validar a autorização administrativa.");
      return false;
    }
  };

  const handleDeleteTicket = async () => {
    if (!selectedTicket || !isUserAdmin) return;
    const authorized = await confirmAdministratorPassword('a exclusão deste chamado');
    if (!authorized) return;
    if (confirm("Tem certeza que deseja excluir este chamado permanentemente?")) {
      await deleteInternalTicket(selectedTicket.id);
      setSelectedTicket(null);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(ticketSearch.toLowerCase()) || 
      t.description.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.creatorName.toLowerCase().includes(ticketSearch.toLowerCase());
    
    const matchStatus = filterTicketStatus === "todos" || t.status === filterTicketStatus;
    const matchUser = isFinanceOrAdmin || t.creatorId === (currentUser?.username || currentUser?.name);
    return matchSearch && matchStatus && matchUser;
  });

  const getPriorityBadge = (priority: CompanyCommunicationPriority) => {
    switch (priority) {
      case "urgente":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-300 flex items-center gap-1 shadow-2xs">
            <ShieldAlert className="w-3 h-3 text-rose-600 animate-pulse" />
            URGENTE
          </span>
        );
      case "alta":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            IMPORTANTE
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            NORMAL
          </span>
        );
    }
  };

  const getCategoryBadge = (category: CompanyCommunicationCardType) => {
    switch (category) {
      case "urgente":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Aviso Urgente</span>;
      case "rh_beneficios":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">RH & Benefícios</span>;
      case "treinamento":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">Treinamento & Metrologia</span>;
      case "seguranca":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">SST & Segurança</span>;
      case "operacional":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">Operacional & Campo</span>;
      case "institucional":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Institucional</span>;
      case "eventos":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Eventos & Avisos</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">Informativo</span>;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 border border-slate-700 animate-slideDown">
          <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Main Top Header with Sub-Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Megaphone className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Comunicação Interna</span>
              <span className="text-[11px] font-normal px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                Canal Oficial COMANINS
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Notificações da empresa, comunicados aos colaboradores e central de chamados internos.
            </p>
          </div>
        </div>

        {/* Section Switcher Tabs & Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end flex-wrap">
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("mural")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "mural"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Mural de Comunicados</span>
              {unreadMuralCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-blue-600 text-white">
                  {unreadMuralCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("chamados")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "chamados"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chamados & Suporte</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                {filteredTickets.length}
              </span>
            </button>
          </div>

          {activeTab === "mural" && isFinanceOrAdmin && (
            <button
              type="button"
              onClick={() => setShowNewCommModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Disparar Notificação</span>
            </button>
          )}

          {activeTab === "chamados" && (
            <button
              type="button"
              onClick={() => setShowNewTicketModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Chamado</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: MURAL DE NOTIFICAÇÕES & COMUNICADOS DA EMPRESA                 */}
      {/* ========================================================================= */}
      {activeTab === "mural" && (
        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar comunicado, aviso ou autor..."
                value={muralSearch}
                onChange={(e) => setMuralSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              {/* Category Filter */}
              <select
                value={muralCategoryFilter}
                onChange={(e) => setMuralCategoryFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-blue-500 bg-white"
              >
                <option value="todos">Todas as Categorias</option>
                <option value="informativo">Informativo Geral</option>
                <option value="urgente">Aviso Urgente</option>
                <option value="rh_beneficios">RH & Benefícios</option>
                <option value="treinamento">Treinamento & Metrologia</option>
                <option value="seguranca">SST & Segurança</option>
                <option value="operacional">Operacional & Campo</option>
                <option value="institucional">Institucional</option>
                <option value="eventos">Eventos & Comemorações</option>
              </select>

              {/* Status Filter */}
              <select
                value={muralStatusFilter}
                onChange={(e) => setMuralStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-blue-500 bg-white"
              >
                <option value="todos">Todos os Avisos</option>
                <option value="nao_lidos">Não Lidos por Você</option>
                <option value="lidos">Já Visualizados</option>
              </select>

              {unreadMuralCount > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!currentUser) return;
                    for (const c of relevantCommunications) {
                      if (isCommUnread(c)) {
                        await markCompanyCommunicationAsRead(c.id, currentUser);
                      }
                    }
                    showToast("Todas as notificações foram marcadas como lidas.");
                  }}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Marcar todas como lidas</span>
                </button>
              )}
            </div>
          </div>

          {/* Communications Cards Feed */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {filteredCommunications.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
                <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">Nenhum comunicado encontrado</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {muralSearch || muralCategoryFilter !== "todos" || muralStatusFilter !== "todos"
                    ? "Tente alterar os filtros de busca para encontrar o aviso desejado."
                    : "No momento não há comunicados cadastrados para a sua equipe."}
                </p>
                {isFinanceOrAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowNewCommModal(true)}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Publicar Primeiro Comunicado</span>
                  </button>
                )}
              </div>
            ) : (
              filteredCommunications.map((comm) => {
                const unread = isCommUnread(comm);
                const isUrgent = comm.priority === "urgente";
                const isHigh = comm.priority === "alta";
                const userKey = currentUser?.username || currentUser?.id || "";
                const myReadStatus = comm.readBy && (comm.readBy[userKey] || (currentUser?.id ? comm.readBy[currentUser.id] : null));
                const readCount = comm.readBy ? Object.keys(comm.readBy).length : 0;
                const totalTargetUsers = comm.targetType === "all" 
                  ? eligibleEmployees.length 
                  : (comm.targetUserIds?.length || 1);

                return (
                  <div
                    key={comm.id}
                    className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
                      isUrgent
                        ? "border-rose-300 ring-1 ring-rose-200/50"
                        : isHigh
                        ? "border-amber-300 ring-1 ring-amber-200/50"
                        : unread
                        ? "border-blue-300 ring-1 ring-blue-100"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Top Accent Strip */}
                    <div className={`h-1.5 w-full ${
                      isUrgent ? "bg-rose-600" : isHigh ? "bg-amber-500" : "bg-blue-600"
                    }`} />

                    <div className="p-5 sm:p-6 space-y-4">
                      {/* Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getPriorityBadge(comm.priority)}
                          {getCategoryBadge(comm.cardType)}

                          {comm.targetType === "all" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-500" />
                              Todos os Colaboradores
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                              <User className="w-3 h-3 text-indigo-500" />
                              {comm.targetUserNames && comm.targetUserNames.length > 0
                                ? `Direcionado (${comm.targetUserNames.length} colaborador${comm.targetUserNames.length > 1 ? 'es' : ''})`
                                : "Colaboradores Específicos"}
                            </span>
                          )}

                          {unread && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white flex items-center gap-1 animate-pulse">
                              <Bell className="w-2.5 h-2.5" />
                              NÃO LIDO
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {new Date(comm.createdAt).toLocaleDateString('pt-BR')} às {new Date(comm.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Title & Author */}
                      <div>
                        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                          {comm.title}
                        </h2>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Por <b>{comm.authorName}</b> {comm.authorRole ? `(${comm.authorRole})` : ''}</span>
                          {comm.emailsDispatchedCount && comm.emailsDispatchedCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              <Mail className="w-3 h-3" />
                              Disparado para {comm.emailsDispatchedCount} e-mails
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content Message */}
                      <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {comm.content}
                      </div>

                      {/* Attached Files & Cards */}
                      {comm.attachments && comm.attachments.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                            <span>Arquivos & Cards Anexados ({comm.attachments.length}):</span>
                          </div>

                          <div className="flex flex-wrap gap-2.5">
                            {comm.attachments.map((attRaw, idx) => (
                              <AttachmentCard
                                key={idx}
                                attRaw={attRaw}
                                index={idx}
                                onOpenPreview={(att) => setPreviewAttachment(att)}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Card Footer: Read Receipts and Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          {myReadStatus ? (
                            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Visualizado por você em {new Date(myReadStatus.readAt).toLocaleString('pt-BR')}</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!currentUser) return;
                                await markCompanyCommunicationAsRead(comm.id, currentUser);
                                showToast("Comunicado marcado como lido!");
                              }}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Marcar como Lido</span>
                            </button>
                          )}

                          {isFinanceOrAdmin && (
                            <button
                              type="button"
                              onClick={() => setReadReceiptModalComm(comm)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                              title="Ver lista de colaboradores que já leram esta notificação"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>Lido por {readCount} de {totalTargetUsers}</span>
                            </button>
                          )}
                        </div>

                        {/* Admin delete action */}
                        {isUserAdmin && (
                          <button
                            type="button"
                            onClick={async () => {
                              const authorized = await confirmAdministratorPassword('a exclusão deste comunicado');
                              if (!authorized) return;
                              if (confirm(`Deseja excluir permanentemente o comunicado "${comm.title}"?`)) {
                                await deleteCompanyCommunication(comm.id);
                                showToast("Comunicado excluído com sucesso.");
                              }
                            }}
                            className="text-xs text-slate-400 hover:text-rose-600 p-1.5 rounded transition cursor-pointer flex items-center gap-1"
                            title="Excluir comunicado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: CHAMADOS E ATENDIMENTO INTERNO (TICKETING SYSTEM)              */}
      {/* ========================================================================= */}
      {activeTab === "chamados" && (
        <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
          {/* Tickets List Column */}
          <div className={`w-full md:w-1/3 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-full ${selectedTicket ? "hidden md:flex" : "flex"}`}>
            <div className="p-4 border-b border-slate-200 space-y-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar chamado..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={filterTicketStatus}
                  onChange={(e) => setFilterTicketStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 outline-none focus:border-blue-500 bg-white"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="aberto">Aberto</option>
                  <option value="respondido">Respondido</option>
                  <option value="finalizado">Finalizado</option>
                </select>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {filteredTickets.length === 0 ? (
                <div className="text-center p-8 text-slate-400 text-xs">
                  Nenhum chamado encontrado.
                </div>
              ) : (
                filteredTickets.map(ticket => (
                  <div 
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-3 rounded-xl cursor-pointer transition-colors border ${
                      selectedTicket?.id === ticket.id 
                        ? 'bg-blue-50/70 border-blue-300' 
                        : 'bg-white border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-xs text-slate-800 line-clamp-1">{ticket.title}</h3>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                        ticket.status === 'aberto' ? 'bg-amber-100 text-amber-700' :
                        ticket.status === 'respondido' ? 'bg-blue-100 text-blue-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {ticket.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center text-[11px] text-slate-500 mb-1.5">
                      <User className="h-3 w-3 mr-1" />
                      <span className="truncate">{ticket.creatorName}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                      </div>
                      {ticket.messages.length > 0 && (
                        <div className="flex items-center gap-1 font-semibold text-blue-600">
                          <MessageSquare className="h-3 w-3" />
                          <span>{ticket.messages.length}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Ticket Detail Column */}
          <div className={`w-full md:w-2/3 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-full ${!selectedTicket ? "hidden md:flex" : "flex"}`}>
            {selectedTicket ? (
              <>
                {/* Header */}
                <div className="p-4 md:p-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div className="flex items-start md:items-center space-x-3 w-full md:w-auto">
                    <button 
                      type="button"
                      onClick={() => setSelectedTicket(null)}
                      className="md:hidden p-1 text-slate-500 hover:text-slate-800"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                      <h2 className="font-bold text-sm text-slate-900">{selectedTicket.title}</h2>
                      <p className="text-[11px] text-slate-500">
                        Aberto por <b>{selectedTicket.creatorName}</b> em {new Date(selectedTicket.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                    {isFinanceOrAdmin && (
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleUpdateStatus(e.target.value as any)}
                        className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white text-slate-700 outline-none"
                      >
                        <option value="aberto">Aberto</option>
                        <option value="respondido">Respondido</option>
                        <option value="finalizado">Finalizado</option>
                      </select>
                    )}

                    {isUserAdmin && (
                      <button
                        type="button"
                        onClick={handleDeleteTicket}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                        title="Excluir chamado"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                  {/* Original Ticket Description Card */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                      <span className="font-bold text-slate-800">{selectedTicket.creatorName}</span>
                      <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {selectedTicket.description}
                    </p>

                    {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[11px] font-bold text-slate-500 block mb-1.5">Anexos:</span>
                        <div className="flex flex-wrap gap-2">
                          {selectedTicket.attachments.map((attRaw, idx) => (
                            <AttachmentCard
                              key={idx}
                              attRaw={attRaw}
                              index={idx}
                              onOpenPreview={(att) => setPreviewAttachment(att)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Messages */}
                  {selectedTicket.messages.map((msg) => {
                    const isMe = msg.senderId === (currentUser?.username || currentUser?.id);
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] rounded-xl p-3.5 shadow-2xs space-y-1.5 ${
                          isMe ? 'bg-blue-600 text-white' : 'bg-white text-slate-800 border border-slate-200'
                        }`}>
                          <div className={`flex items-center justify-between text-[10px] space-x-2 ${
                            isMe ? 'text-blue-100' : 'text-slate-400'
                          }`}>
                            <span className="font-bold">{msg.senderName}</span>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="pt-1.5 space-y-1">
                              <span className={`text-[10px] font-bold ${isMe ? 'text-blue-100' : 'text-slate-500'}`}>
                                Anexos:
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {msg.attachments.map((attRaw, idx) => (
                                  <AttachmentCard
                                    key={idx}
                                    attRaw={attRaw}
                                    index={idx}
                                    isMe={isMe}
                                    onOpenPreview={(att) => setPreviewAttachment(att)}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Send Message Form */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white space-y-2">
                  {messageAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pb-1">
                      {messageAttachments.map((att, i) => (
                        <InputAttachmentBadge
                          key={i}
                          attRaw={att}
                          index={i}
                          onRemove={() => setMessageAttachments(prev => prev.filter((_, idx) => idx !== i))}
                        />
                      ))}
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <label className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition">
                      <Paperclip className="h-4 w-4" />
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files) return;
                          for (let i = 0; i < files.length; i++) {
                            const file = files[i];
                            const reader = new FileReader();
                            reader.onload = () => {
                              setMessageAttachments(prev => [...prev, JSON.stringify({
                                name: file.name,
                                type: file.type,
                                url: reader.result as string
                              })]);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    <input
                      type="text"
                      placeholder="Digite sua mensagem..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                    />

                    <button
                      type="submit"
                      disabled={!messageText.trim() && messageAttachments.length === 0}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1 cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Enviar</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <MessageSquare className="h-12 w-12 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">Nenhum chamado selecionado</p>
                <p className="text-[11px] text-slate-400 mt-1">Selecione um chamado ao lado para ver as mensagens.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DISPARAR NOVA NOTIFICAÇÃO / COMUNICADO DA EMPRESA                  */}
      {/* ========================================================================= */}
      {showNewCommModal && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
            <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Megaphone className="h-5 w-5 text-blue-400" />
                <div>
                  <h3 className="font-extrabold text-sm text-white">Disparar Notificação para a Equipe</h3>
                  <p className="text-[11px] text-slate-400">Comunicação Oficial da Empresa aos Colaboradores</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCommModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchCommunication} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* 1. Destinatários */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  1. Destinatários da Notificação
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCommTargetType("all")}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                      commTargetType === "all"
                        ? "bg-blue-50/70 border-blue-400 text-blue-900 shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Users className={`h-4 w-4 mt-0.5 ${commTargetType === "all" ? "text-blue-600" : "text-slate-400"}`} />
                    <div>
                      <span className="block text-xs font-bold">Todos os Colaboradores</span>
                      <span className="text-[10px] text-slate-500">
                        Disparo geral para toda a empresa ({eligibleEmployees.length} colaboradores)
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCommTargetType("selected")}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                      commTargetType === "selected"
                        ? "bg-blue-50/70 border-blue-400 text-blue-900 shadow-xs"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <User className={`h-4 w-4 mt-0.5 ${commTargetType === "selected" ? "text-blue-600" : "text-slate-400"}`} />
                    <div>
                      <span className="block text-xs font-bold">Por Colaborador Específico</span>
                      <span className="text-[10px] text-slate-500">
                        Selecionar um ou mais colaboradores ({commTargetUserIds.length} selecionado{commTargetUserIds.length > 1 ? 's' : ''})
                      </span>
                    </div>
                  </button>
                </div>

                {/* Specific Collaborators Selector */}
                {commTargetType === "selected" && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Pesquisar por nome, cargo ou e-mail..."
                          value={commEmployeeSearch}
                          onChange={(e) => setCommEmployeeSearch(e.target.value)}
                          className="w-full pl-8 pr-2 py-1 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="flex items-center gap-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setCommTargetUserIds(eligibleEmployees.map(e => e.id))}
                          className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-blue-600 font-semibold cursor-pointer"
                        >
                          Marcar Todos
                        </button>
                        <button
                          type="button"
                          onClick={() => setCommTargetUserIds([])}
                          className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 font-semibold cursor-pointer"
                        >
                          Limpar
                        </button>
                      </div>
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-slate-100 pr-1">
                      {eligibleEmployees
                        .filter(e => {
                          const s = commEmployeeSearch.toLowerCase();
                          return !s || e.name.toLowerCase().includes(s) || e.role.toLowerCase().includes(s) || e.email.toLowerCase().includes(s);
                        })
                        .map((emp) => {
                          const isSelected = commTargetUserIds.includes(emp.id) || commTargetUserIds.includes(emp.username);
                          return (
                            <label
                              key={emp.id}
                              className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition ${
                                isSelected ? "bg-blue-100/70 text-blue-900 font-bold" : "hover:bg-slate-100 text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setCommTargetUserIds(prev => [...prev, emp.id]);
                                    } else {
                                      setCommTargetUserIds(prev => prev.filter(id => id !== emp.id && id !== emp.username));
                                    }
                                  }}
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                  <span className="block leading-tight">{emp.name}</span>
                                  <span className="text-[10px] text-slate-500 font-normal">
                                    {emp.role} {emp.email ? `• ${emp.email}` : '• (sem e-mail)'}
                                  </span>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Categoria e Prioridade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Categoria do Card
                  </label>
                  <select
                    value={commCardType}
                    onChange={(e) => setCommCardType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white outline-none focus:border-blue-500"
                  >
                    <option value="informativo">Informativo Geral</option>
                    <option value="urgente">Aviso Urgente / Importante</option>
                    <option value="institucional">Institucional</option>
                    <option value="rh_beneficios">RH & Benefícios</option>
                    <option value="treinamento">Treinamento & Metrologia</option>
                    <option value="seguranca">SST & Segurança do Trabalho</option>
                    <option value="operacional">Operacional & Campo</option>
                    <option value="eventos">Eventos & Celebrações</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={commPriority}
                    onChange={(e) => setCommPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white outline-none focus:border-blue-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="alta">Alta (Destaque Amarelo)</option>
                    <option value="urgente">Urgente (Destaque Vermelho com Alerta)</option>
                  </select>
                </div>
              </div>

              {/* 3. Título / Assunto */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título / Assunto da Notificação *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Treinamento de Segurança Obrigatório / Atualização de Benefícios"
                  value={commTitle}
                  onChange={(e) => setCommTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:border-blue-500"
                />
              </div>

              {/* 4. Mensagem do Comunicado */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mensagem / Conteúdo do Comunicado *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Escreva a mensagem que os colaboradores visualizarão no portal e receberão por e-mail..."
                  value={commContent}
                  onChange={(e) => setCommContent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:border-blue-500 resize-none leading-relaxed"
                />
              </div>

              {/* 5. Anexos (Cards, Arquivos, Imagens, PDFs) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Anexar Card, Imagem, Arquivo ou PDF
                  </label>
                  <span className="text-[10px] text-slate-400">Até 8 MB por arquivo</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3 py-2 border border-dashed border-blue-400 bg-blue-50/50 hover:bg-blue-50 text-blue-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer">
                    <Paperclip className="h-4 w-4" />
                    <span>Selecionar Arquivos / Cards</span>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => handleAddCommAttachment(e.target.files)}
                    />
                  </label>

                  {commAttachments.length > 0 && (
                    <span className="text-xs text-slate-500">
                      {commAttachments.length} arquivo(s) adicionado(s)
                    </span>
                  )}
                </div>

                {commAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {commAttachments.map((att, i) => (
                      <InputAttachmentBadge
                        key={i}
                        attRaw={att}
                        index={i}
                        onRemove={() => setCommAttachments(prev => prev.filter((_, idx) => idx !== i))}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* 6. Disparo de E-mails */}
              <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={commSendEmail}
                    onChange={(e) => setCommSendEmail(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <span>Disparar notificação também para os e-mails cadastrados dos colaboradores</span>
                </label>
                {commSendEmail && (
                  <p className="text-[11px] text-blue-700 pl-6">
                    📧 Será enviado um e-mail estruturado e oficial para <b>{computedRecipients.length} colaboradores</b> com e-mail cadastrado.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewCommModal(false)}
                  disabled={isDispatchingComm}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isDispatchingComm || !commTitle.trim() || !commContent.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-xs transition flex items-center space-x-2 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>{isDispatchingComm ? "Disparando..." : "Disparar Notificação para a Equipe"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VISUALIZAÇÃO DE QUEM JÁ LEU (STATUS DE LEITURA)                   */}
      {/* ========================================================================= */}
      {readReceiptModalComm && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-scaleUp">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Confirmação de Leitura</h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">{readReceiptModalComm.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setReadReceiptModalComm(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2">
              <span className="text-xs font-bold text-slate-700 block mb-2">
                Colaboradores que já visualizaram no portal:
              </span>

              {readReceiptModalComm.readBy && Object.keys(readReceiptModalComm.readBy).length > 0 ? (
                Object.entries(readReceiptModalComm.readBy).map(([key, info]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs border border-slate-100">
                    <div className="flex items-center gap-2">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold text-slate-800">{info.userName || key}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(info.readAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Nenhum colaborador registrou leitura até o momento.
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setReadReceiptModalComm(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVO CHAMADO INTERNO                                               */}
      {/* ========================================================================= */}
      {showNewTicketModal && (
        <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-scaleUp">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Novo Chamado / Solicitação</h3>
              <button
                type="button"
                onClick={() => setShowNewTicketModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título do Chamado *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dúvida sobre holerite / Solicitação de equipamento"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descrição detalhada *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Descreva detalhadamente o que você precisa..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Anexar Arquivos
                </label>
                <label className="px-3 py-2 border border-dashed border-blue-400 bg-blue-50/50 hover:bg-blue-50 text-blue-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer inline-flex">
                  <Paperclip className="h-4 w-4" />
                  <span>Escolher Arquivos</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files) return;
                      for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        const reader = new FileReader();
                        reader.onload = () => {
                          setNewAttachments(prev => [...prev, JSON.stringify({
                            name: file.name,
                            type: file.type,
                            url: reader.result as string
                          })]);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>

                {newAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {newAttachments.map((att, i) => (
                      <InputAttachmentBadge
                        key={i}
                        attRaw={att}
                        index={i}
                        onRemove={() => setNewAttachments(prev => prev.filter((_, idx) => idx !== i))}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition"
                >
                  Abrir Chamado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PREVIEW DE ANEXO (IMAGEM / PDF)                                    */}
      {/* ========================================================================= */}
      {previewAttachment && (
        <div className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold text-slate-800 truncate max-w-md">
                {previewAttachment.name}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleDownloadAttachment(previewAttachment)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Baixar arquivo"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 flex items-center justify-center bg-slate-100 min-h-[300px]">
              {previewAttachment.isImage ? (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.name}
                  className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-md"
                />
              ) : previewAttachment.isPdf ? (
                <iframe
                  src={previewAttachment.url}
                  className="w-full h-[75vh] rounded-lg border border-slate-200"
                  title={previewAttachment.name}
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <FileText className="h-16 w-16 text-slate-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">{previewAttachment.name}</p>
                  <button
                    type="button"
                    onClick={() => handleDownloadAttachment(previewAttachment)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs"
                  >
                    Baixar para o dispositivo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
