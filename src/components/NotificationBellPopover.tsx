import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Info, 
  Check, 
  Trash2, 
  ChevronRight, 
  Database 
} from 'lucide-react';
import { 
  useFirebaseTelemetry, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  clearAllNotifications 
} from '../lib/firebaseTelemetry';

interface NotificationBellPopoverProps {
  onOpenFirebaseUsage?: () => void;
}

export default function NotificationBellPopover({ onOpenFirebaseUsage }: NotificationBellPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const telemetry = useFirebaseTelemetry();
  const popoverRef = useRef<HTMLDivElement>(null);

  const notifications = telemetry.notifications || [];
  const unreadCount = notifications.filter(n => !n.read).length;

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

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'attention':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />;
      case 'critical':
        return <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 animate-bounce" />;
      case 'limit':
        return <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 animate-pulse" />;
      default:
        return <Info className="w-4 h-4 text-royal-blue shrink-0" />;
    }
  };

  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case 'attention':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'alert':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'critical':
        return 'bg-rose-50 text-rose-800 border-rose-200 font-bold';
      case 'limit':
        return 'bg-red-600 text-white border-red-700 font-bold animate-pulse';
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-xl border transition-all flex items-center justify-center ${
          telemetry.quotaStatus === 'Risco de Cobrança'
            ? 'bg-red-50 text-red-600 border-red-300 animate-pulse'
            : telemetry.quotaStatus === 'Alerta Crítico'
            ? 'bg-rose-50 text-rose-600 border-rose-300'
            : telemetry.quotaStatus === 'Alerta'
            ? 'bg-orange-50 text-orange-600 border-orange-300'
            : telemetry.quotaStatus === 'Atenção'
            ? 'bg-amber-50 text-amber-600 border-amber-300'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
        }`}
        title="Notificações do Painel"
      >
        <Bell className="w-5 h-5" />

        {unreadCount > 0 && (
          <span className={`absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-extrabold rounded-full text-white shadow-xs ${
            telemetry.quotaStatus === 'Risco de Cobrança' || telemetry.quotaStatus === 'Alerta Crítico'
              ? 'bg-red-600 animate-ping'
              : 'bg-royal-blue'
          }`}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-fadeIn">
          {/* Popover Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-sm text-white">Notificações do Sistema</h3>
              {unreadCount > 0 && (
                <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} novas
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-xs">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllNotificationsAsRead()}
                  className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-md transition-colors"
                  title="Marcar todas como lidas"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => clearAllNotifications()}
                  className="p-1 hover:bg-slate-800 text-slate-300 hover:text-red-300 rounded-md transition-colors"
                  title="Limpar todas as notificações"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>



          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                Nenhuma notificação no momento.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markNotificationAsRead(notif.id)}
                  className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                    notif.read ? 'bg-white hover:bg-slate-50/80 opacity-75' : 'bg-blue-50/40 hover:bg-blue-50/70'
                  }`}
                >
                  <div className="mt-0.5">{getLevelIcon(notif.level)}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-900 leading-snug">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">
                        {notif.timestamp.split(' ')[1] || notif.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className={`px-2 py-0.5 rounded text-[9px] border ${getLevelBadgeClass(notif.level)}`}>
                        {notif.category === 'quota' ? 'Cota Firebase' : 'Sistema'}
                      </span>
                      {!notif.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-royal-blue" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Popover Footer */}
          {onOpenFirebaseUsage && (
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenFirebaseUsage();
                }}
                className="w-full py-2 px-3 rounded-xl bg-royal-blue text-white text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5" />
                Abrir Painel Consumo Firebase
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
