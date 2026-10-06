import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Bell, 
  Megaphone, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Check, 
  ExternalLink, 
  FileText, 
  Sparkles, 
  ShieldAlert, 
  Briefcase,
  Paperclip
} from 'lucide-react';
import { 
  syncCompanyCommunications, 
  markCompanyCommunicationAsRead, 
  PortalUser 
} from '../lib/firebase';
import { CompanyCommunication } from '../types';

export interface NotificationUser {
  id?: string;
  username?: string;
  name?: string;
  role?: string;
  permissionLevel?: string;
  [key: string]: any;
}

interface NotificationBellPopoverProps {
  currentUser?: NotificationUser | null;
  onNavigateToCommunication?: (communicationId?: string) => void;
  onOpenFirebaseUsage?: () => void;
}

export default function NotificationBellPopover({ 
  currentUser, 
  onNavigateToCommunication, 
  onOpenFirebaseUsage 
}: NotificationBellPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [communications, setCommunications] = useState<CompanyCommunication[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Subscribe to company communications
  useEffect(() => {
    const unsub = syncCompanyCommunications((list) => {
      setCommunications(list || []);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Filter communications relevant to this user
  const relevantCommunications = useMemo(() => {
    if (!currentUser) return communications;
    const userKey = currentUser.id || currentUser.username || '';
    const username = currentUser.username || '';

    return communications.filter((c) => {
      if (c.targetType === 'all') return true;
      if (!c.targetUserIds || c.targetUserIds.length === 0) return true;
      return (
        (userKey && c.targetUserIds.includes(userKey)) ||
        (username && c.targetUserIds.includes(username))
      );
    });
  }, [communications, currentUser]);

  // Check which are unread by the current user
  const isUnreadByMe = (c: CompanyCommunication) => {
    if (!currentUser) return false;
    if (!c.readBy) return true;
    const userKey = currentUser.username || currentUser.id || '';
    const idKey = currentUser.id || '';
    return !c.readBy[userKey] && !c.readBy[idKey];
  };

  const unreadList = useMemo(() => {
    return relevantCommunications.filter(isUnreadByMe);
  }, [relevantCommunications, currentUser]);

  const unreadCount = unreadList.length;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    for (const c of unreadList) {
      await markCompanyCommunicationAsRead(c.id, currentUser);
    }
  };

  const handleClickCommunication = async (c: CompanyCommunication) => {
    if (currentUser && isUnreadByMe(c)) {
      await markCompanyCommunicationAsRead(c.id, currentUser);
    }
    setIsOpen(false);
    if (onNavigateToCommunication) {
      onNavigateToCommunication(c.id);
    }
  };

  const getCardIcon = (cardType?: string, priority?: string) => {
    if (priority === 'urgente') {
      return <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />;
    }
    if (priority === 'alta') {
      return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
    }
    switch (cardType) {
      case 'rh_beneficios':
        return <Briefcase className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'treinamento':
        return <FileText className="w-4 h-4 text-indigo-600 shrink-0" />;
      case 'eventos':
        return <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />;
      case 'seguranca':
        return <ShieldAlert className="w-4 h-4 text-orange-600 shrink-0" />;
      default:
        return <Megaphone className="w-4 h-4 text-blue-600 shrink-0" />;
    }
  };

  const formatCommTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      if (isToday) {
        return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      }
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
          unreadCount > 0
            ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-xs'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
        }`}
        title={unreadCount > 0 ? `${unreadCount} nova(s) comunicação(ões) interna(s)` : "Notificações de Comunicação Interna"}
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-blue-600 animate-wiggle' : ''}`} />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-extrabold rounded-full text-white shadow-xs bg-rose-600 min-w-4.5 h-4.5 flex items-center justify-center animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-fadeIn">
          {/* Popover Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-blue-400" />
              <div>
                <h3 className="font-bold text-sm text-white leading-tight">Comunicação Interna</h3>
                <p className="text-[11px] text-slate-400">Notificações e Comunicados da Empresa</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-blue-300 hover:text-white flex items-center gap-1 transition-colors"
                  title="Marcar todas as mensagens como lidas"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Marcar lidas</span>
                </button>
              ) : (
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                  Em dia
                </span>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-84 overflow-y-auto divide-y divide-slate-100">
            {relevantCommunications.length === 0 ? (
              <div className="py-10 px-4 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-600">Nenhum comunicado no momento</p>
                <p className="mt-1 text-[11px] text-slate-400">Você está em dia com todas as comunicações da empresa.</p>
              </div>
            ) : (
              relevantCommunications.slice(0, 10).map((comm) => {
                const unread = isUnreadByMe(comm);
                const hasAttachments = comm.attachments && comm.attachments.length > 0;

                return (
                  <div
                    key={comm.id}
                    onClick={() => handleClickCommunication(comm)}
                    className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                      unread 
                        ? 'bg-blue-50/70 hover:bg-blue-100/60 font-medium' 
                        : 'bg-white hover:bg-slate-50/90 opacity-85'
                    }`}
                  >
                    <div className="mt-0.5">{getCardIcon(comm.cardType, comm.priority)}</div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-bold text-xs text-slate-900 leading-snug truncate">
                          {comm.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-1 shrink-0">
                          {formatCommTime(comm.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {comm.content}
                      </p>

                      <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                        {comm.targetType === 'all' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Geral (Todos)
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Direcionado a você
                          </span>
                        )}

                        {comm.priority === 'urgente' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            Urgente
                          </span>
                        )}

                        {hasAttachments && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-0.5">
                            <Paperclip className="w-2.5 h-2.5" />
                            <span>Anexo</span>
                          </span>
                        )}

                        {unread && (
                          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-blue-700">
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                            Nova
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Popover Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onNavigateToCommunication) {
                  onNavigateToCommunication();
                }
              }}
              className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Acessar Mural de Comunicação Interna
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
