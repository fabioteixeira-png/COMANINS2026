import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, MessageSquare, Paperclip, Send, CheckCircle, Clock, FileText, User, X, Mail } from "lucide-react";
import { InternalTicket, TicketMessage } from "../types";
import { syncInternalTickets, saveInternalTicket, PortalUser } from "../lib/firebase";
import { compressImageToWebResolution } from "../lib/imageCompressor";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const isFinanceOrAdmin = currentUser?.role === "Financeiro" || currentUser?.role === "Administrador";

  useEffect(() => {
    const unsub = syncInternalTickets((list) => {
      setTickets(list);
    });
    unsub.then(u => u && u()); return () => { unsub.then(u => u && u()) };
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
    
    const ticket: InternalTicket = {
      id: "ticket_" + Date.now().toString() + "_" + Math.random().toString(36).substring(2, 9),
      creatorId: currentUser.id,
      creatorName: currentUser.name || currentUser.username,
      creatorEmail: currentUser.username, // username is email
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
    fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "financeiro@comanins.com.br",
        subject: `Novo Chamado: ${ticket.title}`,
        html: `
          <h2>Novo Chamado Administrativo/Financeiro</h2>
          <p><strong>Colaborador:</strong> ${ticket.creatorName}</p>
          <p><strong>Título:</strong> ${ticket.title}</p>
          <p><strong>Descrição:</strong> ${ticket.description}</p>
          <p>Acesse o portal para responder.</p>
        `
      })
    }).catch(console.error);

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
      senderId: currentUser.id,
      senderName: currentUser.name || currentUser.username,
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
    
    if (isFinanceOrAdmin) {
      // Notify creator
      fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: updatedTicket.creatorEmail,
          subject: `Resposta no seu chamado: ${updatedTicket.title}`,
          html: `
            <h2>Seu chamado foi respondido</h2>
            <p><strong>Título:</strong> ${updatedTicket.title}</p>
            <p><strong>Mensagem:</strong> ${newMessage.text}</p>
            <p>Acesse o portal para visualizar e continuar o atendimento.</p>
          `
        })
      }).catch(console.error);
    } else {
      // Notify financeiro
      fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "financeiro@comanins.com.br",
          subject: `Nova interação no chamado: ${updatedTicket.title}`,
          html: `
            <h2>Nova mensagem do colaborador</h2>
            <p><strong>Colaborador:</strong> ${updatedTicket.creatorName}</p>
            <p><strong>Título:</strong> ${updatedTicket.title}</p>
            <p><strong>Mensagem:</strong> ${newMessage.text}</p>
            <p>Acesse o portal para responder.</p>
          `
        })
      }).catch(console.error);
    }
    
    setMessageText("");
    setMessageAttachments([]);
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
      const b64s = await Promise.all(
        files.map(async (f) => {
          if (f.type.startsWith("image/")) {
            return await compressImageToWebResolution(f);
          } else {
            return new Promise<string>((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => resolve(r.result as string);
              r.onerror = reject;
              r.readAsDataURL(f);
            });
          }
        })
      );
      setter([...currentList, ...b64s]);
    } catch (err) {
      console.error(err);
      alert("Erro ao anexar arquivo.");
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (!isFinanceOrAdmin && t.creatorId !== currentUser?.id) return false;
    
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.creatorName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "todos" || t.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)] p-6 animate-fade-in flex space-x-6">
      {/* List Column */}
      <div className="w-1/3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
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
      <div className="w-2/3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
        {selectedTicket ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h2 className="font-display font-bold text-xl text-slate-800">{selectedTicket.title}</h2>
                  <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                    selectedTicket.status === 'aberto' ? 'bg-amber-100 text-amber-700' :
                    selectedTicket.status === 'respondido' ? 'bg-blue-100 text-blue-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {selectedTicket.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-slate-600 flex items-center space-x-4">
                  <span className="flex items-center"><User className="h-4 w-4 mr-1 text-slate-400" /> {selectedTicket.creatorName}</span>
                  <span className="flex items-center"><Clock className="h-4 w-4 mr-1 text-slate-400" /> {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                </div>
              </div>
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
                  <div className="mt-4 pl-10 flex flex-wrap gap-2">
                    {selectedTicket.attachments.map((att, i) => (
                      <a key={i} href={att} target="_blank" rel="noreferrer" className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors">
                        <FileText className="h-3 w-3" />
                        <span>Anexo {i + 1}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Messages */}
              {selectedTicket.messages.map(msg => {
                const isMe = msg.senderId === currentUser?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl p-4 shadow-sm ${isMe ? 'bg-royal-blue text-white' : 'bg-white border border-slate-200'}`}>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="text-xs font-bold opacity-80">{msg.senderName}</div>
                        <div className="text-[10px] opacity-60">{new Date(msg.createdAt).toLocaleString()}</div>
                      </div>
                      <div className={`text-sm whitespace-pre-wrap ${isMe ? 'text-blue-50' : 'text-slate-700'}`}>
                        {msg.text}
                      </div>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {msg.attachments.map((att, i) => (
                            <a key={i} href={att} target="_blank" rel="noreferrer" className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isMe ? 'bg-blue-800/50 hover:bg-blue-800 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                              <FileText className="h-3 w-3" />
                              <span>Anexo {i + 1}</span>
                            </a>
                          ))}
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
                  <div className="flex flex-wrap gap-2 mb-3">
                    {messageAttachments.map((att, i) => (
                      <div key={i} className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-700">
                        <FileText className="h-3 w-3" />
                        <span>Anexo {i + 1}</span>
                        <button type="button" onClick={() => setMessageAttachments(prev => prev.filter((_, idx) => idx !== i))} className="ml-2 text-rose-500 hover:text-rose-700">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
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
                      <label className="p-2 cursor-pointer text-slate-400 hover:text-royal-blue transition-colors flex items-center justify-center rounded-lg hover:bg-slate-100">
                        <Paperclip className="h-5 w-5" />
                        <input type="file" multiple className="hidden" onChange={(e) => handleAttachmentUpload(e, setMessageAttachments, messageAttachments)} />
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
                <span>Os chamados de comunicação interna são encaminhados para <strong>financeiro@comanins.com.br</strong>.</span>
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
                        <input type="file" multiple className="sr-only" onChange={(e) => handleAttachmentUpload(e, setNewAttachments, newAttachments)} />
                      </label>
                    </div>
                    <p className="text-xs text-slate-500">Imagens ou Documentos</p>
                  </div>
                </div>
                
                {newAttachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {newAttachments.map((att, i) => (
                      <div key={i} className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                        <FileText className="h-3 w-3" />
                        <span>Anexo {i + 1}</span>
                        <button type="button" onClick={() => setNewAttachments(prev => prev.filter((_, idx) => idx !== i))} className="ml-2 text-rose-500 hover:text-rose-700">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
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
    </div>
  );
}
