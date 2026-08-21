import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, MessageSquare, Paperclip, Send, CheckCircle, Clock, FileText, User, X, Mail, Trash2, ArrowLeft, Download, Eye, Image as ImageIcon } from "lucide-react";
import { InternalTicket, TicketMessage } from "../types";
import { syncInternalTickets, saveInternalTicket, deleteInternalTicket, PortalUser } from "../lib/firebase";
import { compressImageToWebResolution } from "../lib/imageCompressor";
import { safeFetch } from "../utils/apiClient";

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
    <div className={`group flex flex-col p-2.5 rounded-xl border transition-all shadow-sm ${
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
          className={`flex-1 flex items-center justify-center space-x-1 py-1 px-2 rounded-lg text-[11px] font-bold transition ${
            isMe
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
          }`}
          title="Visualizar arquivo em tela cheia"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Ver</span>
        </button>

        <button
          type="button"
          onClick={() => handleDownloadAttachment(att)}
          className={`flex-1 flex items-center justify-center space-x-1 py-1 px-2 rounded-lg text-[11px] font-bold transition ${
            isMe
              ? 'bg-blue-400/20 hover:bg-blue-400/30 text-blue-100'
              : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
          }`}
          title="Baixar arquivo no seu dispositivo"
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
    <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-blue-900 shadow-sm">
      {att.isImage ? (
        <ImageIcon className="h-3.5 w-3.5 text-blue-600 shrink-0" />
      ) : (
        <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
      )}
      <span className="truncate max-w-[180px]" title={att.name}>{att.name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
        title="Remover anexo"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function InternalCommunication({ currentUser }: { currentUser: PortalUser | null }) {
  const [tickets, setTickets] = useState<InternalTicket[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"todos" | "aberto" | "respondido" | "finalizado">("todos");
  
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAttachments, setNewAttachments] = useState<string[]>([]);
  
  const [selectedTicket, setSelectedTicket] = useState<InternalTicket | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messageAttachments, setMessageAttachments] = useState<string[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<ParsedAttachment | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const isUserAdmin = currentUser?.permissionLevel === "Administrador" || currentUser?.role === "Administrador" || currentUser?.role === "Admin" || currentUser?.role === "admin" || currentUser?.role === "Diretoria" || currentUser?.role === "master";
  const isFinanceOrAdmin = isUserAdmin || currentUser?.role === "Financeiro" || currentUser?.role === "Recursos Humanos (RH)";

  useEffect(() => {
    const unsub = syncInternalTickets((list) => {
      setTickets(list);
    });
    return () => { unsub.then(u => u && u()) };
  }, []);
  
  useEffect(() => {
    if (selectedTicket) {
      const updated = tickets.find(t => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [tickets]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim() || !currentUser) return;
    
    const resolvedEmail = 
      (currentUser as any).workEmail || 
      (currentUser as any).personalEmail || 
      (currentUser.username && currentUser.username.includes('@') ? currentUser.username : `${currentUser.username}@comanins.com.br`);

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
    
    // SEND NOTIFICATION TO FINANCEIRO
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
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #1e293b; font-weight: bold;">
                ${ticket.title}
              </p>
              <p style="margin: 0; font-size: 13px; color: #334155; white-space: pre-wrap;">
                ${ticket.description}
              </p>
              ${ticket.attachments && ticket.attachments.length > 0 ? `
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #2563eb; font-weight: bold;">
                  📎 ${ticket.attachments.length} arquivo(s) anexado(s).
                </p>
              ` : ''}
            </div>

            <p style="font-size: 13px; color: #475569;">
              Acesse a aba <b>Comunicação Interna</b> no Portal COMANINS para responder a esta solicitação.
            </p>
            <br/>
            <p style="font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px;">
              Notificação automática gerada pelo sistema COMANINS Metrology Suite.
            </p>
          </div>
        `
      })
    }).then(res => console.log("Email response:", res)).catch(console.error);

    setShowNewTicketModal(false);
    setNewTitle("");
    setNewDescription("");
    setNewAttachments([]);
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
      // Resolve recipient email address for creator
      let recipientEmail = updatedTicket.creatorEmail;
      if (!recipientEmail || !recipientEmail.includes('@')) {
        const cId = updatedTicket.creatorId || updatedTicket.creatorName;
        recipientEmail = cId && cId.includes('@') ? cId : `${cId}@comanins.com.br`;
      }

      // Notify creator (colaborador)
      safeFetch("/api/send-email", {
        method: "POST",
        body: JSON.stringify({
          to: recipientEmail,
          subject: `[COMANINS] Resposta ao Chamado: ${updatedTicket.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; background-color: #ffffff; color: #0f172a;">
              <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
                <h2 style="color: #1e40af; margin: 0; font-size: 18px;">💬 Seu Chamado foi Respondido</h2>
                <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">COMANINS Metrology Suite - Comunicação Interna</p>
              </div>

              <p>Olá, <b>${updatedTicket.creatorName}</b>!</p>
              <p>A equipe do Portal COMANINS respondeu ao seu chamado <b>"${updatedTicket.title}"</b>:</p>

              <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 14px; border-radius: 6px; margin: 16px 0;">
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; font-weight: bold;">
                  Resposta de ${newMessage.senderName}:
                </p>
                <p style="margin: 0; font-size: 14px; color: #1e293b; white-space: pre-wrap;">
                  ${newMessage.text || '(Novo arquivo anexado na resposta)'}
                </p>
                ${newMessage.attachments && newMessage.attachments.length > 0 ? `
                  <p style="margin: 10px 0 0 0; font-size: 12px; color: #2563eb; font-weight: bold;">
                    📎 ${newMessage.attachments.length} arquivo(s) anexado(s) à resposta.
                  </p>
                ` : ''}
              </div>

              <p style="font-size: 13px; color: #475569;">
                Acesse o Portal COMANINS na aba <b>Comunicação Interna</b> para visualizar a resposta completa, baixar anexos ou responder.
              </p>

              <br/>
              <p style="font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px;">
                Notificação automática gerada pelo sistema COMANINS Metrology Suite.
              </p>
            </div>
          `
        })
      }).then(res => console.log("Email response:", res)).catch(console.error);
    } else {
      // Notify administrative team
      safeFetch("/api/send-email", {
        method: "POST",
        body: JSON.stringify({
          to: "comercial@comanins.com.br, fabio.teixeira@comanins.com.br, financeiro@comanins.com.br, manutencao@comanins.com.br, isidro.teixeira@comanins.com.br",
          subject: `[INTERAÇÃO EM CHAMADO] ${updatedTicket.title} - ${updatedTicket.creatorName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; background-color: #ffffff; color: #0f172a;">
              <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
                <h2 style="color: #1e40af; margin: 0; font-size: 18px;">💬 Nova Interação no Chamado</h2>
                <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">COMANINS Metrology Suite - Comunicação Interna</p>
              </div>

              <p>O colaborador <b>${updatedTicket.creatorName}</b> enviou uma nova mensagem no chamado <b>"${updatedTicket.title}"</b>:</p>

              <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 14px; border-radius: 6px; margin: 16px 0;">
                <p style="margin: 0; font-size: 14px; color: #1e293b; white-space: pre-wrap;">
                  ${newMessage.text || '(Novo anexo enviado)'}
                </p>
                ${newMessage.attachments && newMessage.attachments.length > 0 ? `
                  <p style="margin: 10px 0 0 0; font-size: 12px; color: #2563eb; font-weight: bold;">
                    📎 ${newMessage.attachments.length} arquivo(s) anexado(s).
                  </p>
                ` : ''}
              </div>

              <p style="font-size: 13px; color: #475569;">
                Acesse o Portal COMANINS na aba <b>Comunicação Interna</b> para responder.
              </p>
            </div>
          `
        })
      }).then(res => console.log("Email response:", res)).catch(console.error);
    }
    
    setMessageText("");
    setMessageAttachments([]);
  };


  const handleDeleteTicket = async () => {
    if (!selectedTicket || !isUserAdmin) return;
    if (window.confirm("Tem certeza que deseja excluir este chamado permanentemente? Essa ação não pode ser desfeita.")) {
      try {
        await deleteInternalTicket(selectedTicket.id);
        setSelectedTicket(null);
      } catch (err) {
        console.error("Erro ao excluir", err);
        alert("Falha ao excluir chamado.");
      }
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    const updatedTicket = {
      ...selectedTicket,
      status: "finalizado",
      updatedAt: new Date().toISOString()
    } as InternalTicket;
    
    await saveInternalTicket(updatedTicket);
  };
  
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: any, currentList: string[]) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files) as File[];
    try {
      const items = await Promise.all(
        files.map(async (f) => {
          const isImage = f.type.startsWith("image/") || /\.(jpe?g|png|heic|heif|webp|gif|bmp)$/i.test(f.name || "");
          let b64 = "";
          if (isImage) {
            b64 = await compressImageToWebResolution(f);
          } else {
            b64 = await new Promise<string>((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => resolve(r.result as string);
              r.onerror = reject;
              r.readAsDataURL(f);
            });
          }
          return JSON.stringify({
            name: f.name,
            type: f.type || (isImage ? 'image/jpeg' : 'application/octet-stream'),
            url: b64
          });
        })
      );
      setter([...currentList, ...items]);
    } catch (err) {
      console.error(err);
      alert("Erro ao anexar arquivo.");
    }
  };

  console.log("ALL TICKETS:", tickets.length, tickets);
  console.log("CURRENT USER:", currentUser);
  console.log("IS FINANCE OR ADMIN:", isFinanceOrAdmin);
  const filteredTickets = tickets.filter(t => {
    const isCreator = t.creatorId === currentUser?.username || t.creatorId === currentUser?.id || t.creatorName === currentUser?.name || t.creatorName === currentUser?.username;
    if (!isFinanceOrAdmin && !isCreator) return false;
    
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.creatorName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "todos" || t.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-slate-50 h-[calc(100dvh-4rem)] md:min-h-[calc(100vh-4rem)] p-2 md:p-6 animate-fade-in flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6 overflow-hidden md:overflow-visible">
      {/* List Column */}
      <div className={`w-full md:w-1/3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full ${selectedTicket ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg text-slate-800">Chamados</h2>
            {!isFinanceOrAdmin && (
              <button
                onClick={() => setShowNewTicketModal(true)}
                className="p-2 bg-royal-blue text-white rounded-lg hover:bg-royal-dark transition-colors"
                title="Novo Chamado"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar chamados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-royal-blue/20 focus:border-royal-blue"
            />
          </div>
          
          <div className="flex space-x-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-royal-blue/20"
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
            <div className="text-center p-8 text-slate-500 text-sm">
              Nenhum chamado encontrado.
            </div>
          ) : (
            filteredTickets.map(ticket => (
              <div 
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`p-3 rounded-lg cursor-pointer transition-colors border ${selectedTicket?.id === ticket.id ? 'bg-royal-blue/5 border-royal-blue/30' : 'bg-white border-transparent hover:bg-slate-50'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-sm text-slate-800 line-clamp-1">{ticket.title}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                    ticket.status === 'aberto' ? 'bg-amber-100 text-amber-700' :
                    ticket.status === 'respondido' ? 'bg-blue-100 text-blue-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {ticket.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center text-xs text-slate-500 mb-2">
                  <User className="h-3 w-3 mr-1" />
                  <span className="truncate">{ticket.creatorName}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                  </div>
                  {ticket.messages.length > 0 && (
                    <div className="flex items-center">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      <span>{ticket.messages.length}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Detail Column */}
      <div className={`w-full md:w-2/3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full ${!selectedTicket ? "hidden md:flex" : "flex"}`}>
        {selectedTicket ? (
          <>
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-start md:items-center space-x-3 w-full md:w-auto">
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors flex-shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center space-x-2 md:space-x-3 mb-1 md:mb-2">
                    <h2 className="font-display font-bold text-base md:text-xl text-slate-800 line-clamp-1">{selectedTicket.title}</h2>
                    <span className={`text-[10px] md:text-xs font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded-md shrink-0 ${
                      selectedTicket.status === 'aberto' ? 'bg-amber-100 text-amber-700' :
                      selectedTicket.status === 'respondido' ? 'bg-blue-100 text-blue-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {selectedTicket.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[10px] md:text-sm text-slate-600 flex items-center space-x-3 md:space-x-4">
                    <span className="flex items-center truncate"><User className="h-3 w-3 md:h-4 md:w-4 mr-1 text-slate-400 shrink-0" /> <span className="truncate">{selectedTicket.creatorName}</span></span>
                    <span className="flex items-center shrink-0"><Clock className="h-3 w-3 md:h-4 md:w-4 mr-1 text-slate-400" /> {new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                {isUserAdmin && (
                  <button 
                    onClick={handleDeleteTicket}
                    className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold text-sm rounded-lg flex items-center space-x-2 transition-colors"
                    title="Excluir Chamado (Apenas Administrador)"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Excluir</span>
                  </button>
                )}
                {selectedTicket.status !== 'finalizado' && (
                  <button 
                    onClick={handleCloseTicket}
                    className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-semibold text-sm rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Finalizar Chamado</span>
                  </button>
                )}
              </div>
            </div>
            
            {/* Conversation */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              {/* Initial Description */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                    {selectedTicket.creatorName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">{selectedTicket.creatorName}</div>
                    <div className="text-xs text-slate-400">{new Date(selectedTicket.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <div className="text-slate-700 text-sm whitespace-pre-wrap pl-10">
                  {selectedTicket.description}
                </div>
                {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                  <div className="mt-4 pl-10">
                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Arquivos Anexados ({selectedTicket.attachments.length}):</p>
                    <div className="flex flex-wrap gap-2.5">
                      {selectedTicket.attachments.map((attRaw, i) => (
                        <AttachmentCard
                          key={i}
                          attRaw={attRaw}
                          index={i}
                          isMe={false}
                          onOpenPreview={(parsed) => setPreviewAttachment(parsed)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Messages */}
              {selectedTicket.messages.map(msg => {
                const isMe = msg.senderId === currentUser?.id || msg.senderId === currentUser?.username;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-sm ${isMe ? 'bg-royal-blue text-white' : 'bg-white border border-slate-200'}`}>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="text-xs font-bold opacity-90">{msg.senderName}</div>
                        <div className="text-[10px] opacity-65">{new Date(msg.createdAt).toLocaleString('pt-BR')}</div>
                      </div>
                      <div className={`text-sm whitespace-pre-wrap leading-relaxed ${isMe ? 'text-blue-50' : 'text-slate-700'}`}>
                        {msg.text}
                      </div>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-current/10">
                          <p className={`text-[11px] font-bold mb-2 uppercase tracking-wider ${isMe ? 'text-blue-200' : 'text-slate-500'}`}>Anexos ({msg.attachments.length}):</p>
                          <div className="flex flex-wrap gap-2">
                            {msg.attachments.map((attRaw, i) => (
                              <AttachmentCard
                                key={i}
                                attRaw={attRaw}
                                index={i}
                                isMe={isMe}
                                onOpenPreview={(parsed) => setPreviewAttachment(parsed)}
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
            
            {/* Input area */}
            {selectedTicket.status !== 'finalizado' ? (
              <div className="p-4 border-t border-slate-200 bg-white">
                {messageAttachments.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-bold text-slate-600 mb-1.5">Anexos prontos para enviar ({messageAttachments.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {messageAttachments.map((attRaw, i) => (
                        <InputAttachmentBadge
                          key={i}
                          attRaw={attRaw}
                          index={i}
                          onRemove={() => setMessageAttachments(prev => prev.filter((_, idx) => idx !== i))}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
                  <div className="flex-1 relative">
                    <textarea
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Digite sua resposta..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-royal-blue/20 focus:border-royal-blue resize-none min-h-[50px] max-h-[150px]"
                      rows={2}
                    />
                    <div className="absolute right-2 bottom-2">
                      <label className="p-2 cursor-pointer text-slate-400 hover:text-royal-blue transition-colors flex items-center justify-center rounded-lg hover:bg-slate-100" title="Anexar arquivos (PDF, imagens, documentos)">
                        <Paperclip className="h-5 w-5" />
                        <input type="file" accept="image/*,.heic,.heif,application/pdf,.doc,.docx" multiple className="hidden" onChange={(e) => handleAttachmentUpload(e, setMessageAttachments, messageAttachments)} />
                      </label>
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={!messageText.trim() && messageAttachments.length === 0}
                    className="p-3 bg-royal-blue text-white rounded-xl hover:bg-royal-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-4 border-t border-slate-200 bg-slate-100 text-center text-slate-500 text-sm">
                Este chamado foi finalizado e não pode receber novas mensagens.
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
            <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium text-slate-500">Selecione um chamado</p>
            <p className="text-sm mt-2 text-center max-w-sm">Escolha um chamado na lista ao lado para visualizar os detalhes ou criar uma nova solicitação.</p>
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold font-display text-slate-800 flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-royal-blue" />
                <span>Novo Chamado Administrativo/Financeiro</span>
              </h2>
              <button onClick={() => setShowNewTicketModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="p-6 overflow-y-auto space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600 shrink-0" />
                <span>Os chamados de comunicação interna são encaminhados para <strong>financeiro, fabio, isidro, solange e manutenção (@comanins.com.br)</strong>.</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Título / Assunto</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Solicitação de reembolso, Dúvida no holerite..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-royal-blue/20 focus:border-royal-blue"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <textarea
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Descreva detalhadamente sua solicitação..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-royal-blue/20 focus:border-royal-blue min-h-[120px] resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Anexos (Opcional)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="space-y-1 text-center">
                    <Paperclip className="mx-auto h-8 w-8 text-slate-400" />
                    <div className="flex text-sm text-slate-600 justify-center">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-royal-blue hover:text-royal-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-royal-blue">
                        <span>Anexar arquivos</span>
                        <input type="file" accept="image/*,.heic,.heif,application/pdf,.doc,.docx" multiple className="sr-only" onChange={(e) => handleAttachmentUpload(e, setNewAttachments, newAttachments)} />
                      </label>
                    </div>
                    <p className="text-xs text-slate-500">Imagens ou Documentos</p>
                  </div>
                </div>
                
                {newAttachments.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-bold text-slate-600 mb-1.5">Anexos selecionados ({newAttachments.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {newAttachments.map((attRaw, i) => (
                        <InputAttachmentBadge
                          key={i}
                          attRaw={attRaw}
                          index={i}
                          onRemove={() => setNewAttachments(prev => prev.filter((_, idx) => idx !== i))}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </form>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowNewTicketModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateTicket}
                disabled={!newTitle.trim() || !newDescription.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-royal-blue rounded-lg hover:bg-royal-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Send className="h-4 w-4" />
                <span>Abrir Chamado</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Attachment Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2 truncate pr-4">
                {previewAttachment.isImage ? (
                  <ImageIcon className="h-5 w-5 text-blue-400 shrink-0" />
                ) : (
                  <FileText className="h-5 w-5 text-blue-400 shrink-0" />
                )}
                <span className="font-bold text-sm truncate">{previewAttachment.name}</span>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadAttachment(previewAttachment)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 transition shadow"
                >
                  <Download className="h-4 w-4" />
                  <span>Baixar Arquivo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="text-slate-400 hover:text-white p-1 text-xl font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex items-center justify-center bg-slate-100 min-h-[300px]">
              {previewAttachment.isImage ? (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.name}
                  className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-md border border-slate-200"
                />
              ) : previewAttachment.isPdf ? (
                <iframe
                  src={previewAttachment.url}
                  className="w-full h-[70vh] rounded-lg border border-slate-200 shadow-inner"
                  title={previewAttachment.name}
                />
              ) : (
                <div className="text-center p-8 space-y-4">
                  <FileText className="h-16 w-16 text-slate-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">{previewAttachment.name}</p>
                  <p className="text-xs text-slate-500">Este formato de arquivo não pode ser pré-visualizado diretamente no navegador.</p>
                  <button
                    type="button"
                    onClick={() => handleDownloadAttachment(previewAttachment)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg inline-flex items-center space-x-2 shadow"
                  >
                    <Download className="h-4 w-4" />
                    <span>Baixar para o dispositivo</span>
                  </button>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
              <span className="truncate max-w-md">{previewAttachment.name}</span>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
