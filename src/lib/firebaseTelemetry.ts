import { useState, useEffect } from 'react';

export const DAILY_READS_LIMIT = 50000;
export const DAILY_WRITES_LIMIT = 20000;
export const DAILY_DELETES_LIMIT = 20000;

export type QuotaStatus = 'Normal' | 'Atenção' | 'Alerta' | 'Alerta Crítico' | 'Risco de Cobrança';

export interface TelemetryNotification {
  id: string;
  title: string;
  message: string;
  level: 'info' | 'attention' | 'alert' | 'critical' | 'limit';
  timestamp: string;
  read: boolean;
  category: 'quota' | 'system';
}

export interface ModuleUsage {
  reads: number;
  writes: number;
  deletes: number;
  lastActivity: string;
}

export interface FirebaseTelemetry {
  dailyReads: number;
  dailyWrites: number;
  dailyDeletes: number;
  monthlyReads: number;
  monthlyWrites: number;
  monthlyDeletes: number;
  lastResetDate: string; // YYYY-MM-DD
  lastResetMonth: string; // YYYY-MM
  moduleBreakdown: Record<string, ModuleUsage>;
  notifications: TelemetryNotification[];
  quotaStatus: QuotaStatus;
}

const STORAGE_KEY = 'comanins_firebase_telemetry_v1';

function getTodayKey(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function getMonthKey(): string {
  const d = new Date();
  return d.toISOString().substring(0, 7);
}

const INITIAL_TELEMETRY: FirebaseTelemetry = {
  dailyReads: 0,
  dailyWrites: 0,
  dailyDeletes: 0,
  monthlyReads: 0,
  monthlyWrites: 0,
  monthlyDeletes: 0,
  lastResetDate: getTodayKey(),
  lastResetMonth: getMonthKey(),
  moduleBreakdown: {},
  notifications: [
    {
      id: 'init_welcome',
      title: 'Controle de Consumo Firebase Ativo',
      message: 'O monitoramento de cota de leituras, gravações e exclusões está em execução.',
      level: 'info',
      timestamp: new Date().toLocaleString('pt-BR'),
      read: false,
      category: 'system',
    },
  ],
  quotaStatus: 'Normal',
};

export function getTelemetryData(): FirebaseTelemetry {
  if (typeof window === 'undefined') return INITIAL_TELEMETRY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_TELEMETRY;
    const data: FirebaseTelemetry = JSON.parse(raw);

    const today = getTodayKey();
    const month = getMonthKey();

    let modified = false;

    // Daily reset check
    if (data.lastResetDate !== today) {
      data.dailyReads = 0;
      data.dailyWrites = 0;
      data.dailyDeletes = 0;
      data.lastResetDate = today;
      data.quotaStatus = 'Normal';
      modified = true;
    }

    // Monthly reset check
    if (data.lastResetMonth !== month) {
      data.monthlyReads = 0;
      data.monthlyWrites = 0;
      data.monthlyDeletes = 0;
      data.lastResetMonth = month;
      modified = true;
    }

    if (modified) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    return data;
  } catch (e) {
    console.error('Error reading telemetry data:', e);
    return INITIAL_TELEMETRY;
  }
}

export function calculateQuotaStatus(dailyReads: number): QuotaStatus {
  const ratio = dailyReads / DAILY_READS_LIMIT;
  if (ratio >= 1.0) return 'Risco de Cobrança';
  if (ratio >= 0.95) return 'Alerta Crítico';
  if (ratio >= 0.85) return 'Alerta';
  if (ratio >= 0.70) return 'Atenção';
  return 'Normal';
}

function notifyTelemetryUpdate(data: FirebaseTelemetry) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('firebase-telemetry-update', { detail: data }));
  }
}

export function trackFirebaseOp(
  opType: 'read' | 'write' | 'delete',
  count: number = 1,
  moduleName: string = 'Geral'
): void {
  if (count <= 0) return;
  try {
    const data = getTelemetryData();
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // 1. Update global counters
    if (opType === 'read') {
      data.dailyReads += count;
      data.monthlyReads += count;
    } else if (opType === 'write') {
      data.dailyWrites += count;
      data.monthlyWrites += count;
    } else if (opType === 'delete') {
      data.dailyDeletes += count;
      data.monthlyDeletes += count;
    }

    // 2. Update Module breakdown
    if (!data.moduleBreakdown[moduleName]) {
      data.moduleBreakdown[moduleName] = {
        reads: 0,
        writes: 0,
        deletes: 0,
        lastActivity: nowStr,
      };
    }

    const mod = data.moduleBreakdown[moduleName];
    if (opType === 'read') mod.reads += count;
    if (opType === 'write') mod.writes += count;
    if (opType === 'delete') mod.deletes += count;
    mod.lastActivity = nowStr;

    // 3. Evaluate Quota Status and Alerts
    const prevStatus = data.quotaStatus;
    const newStatus = calculateQuotaStatus(data.dailyReads);
    data.quotaStatus = newStatus;

    // 4. Generate notification if threshold crossed
    const ratio = data.dailyReads / DAILY_READS_LIMIT;
    const readsFormatted = data.dailyReads.toLocaleString('pt-BR');

    if (newStatus !== prevStatus) {
      if (newStatus === 'Atenção' && !data.notifications.some(n => n.id === `quota_70_${data.lastResetDate}`)) {
        data.notifications.unshift({
          id: `quota_70_${data.lastResetDate}`,
          title: 'Atenção: Consumo Firebase em 70%',
          message: `O limite diário gratuito atingiu 70% (${readsFormatted} de ${DAILY_READS_LIMIT.toLocaleString('pt-BR')} leituras realizas hoje).`,
          level: 'attention',
          timestamp: new Date().toLocaleString('pt-BR'),
          read: false,
          category: 'quota',
        });
      } else if (newStatus === 'Alerta' && !data.notifications.some(n => n.id === `quota_85_${data.lastResetDate}`)) {
        data.notifications.unshift({
          id: `quota_85_${data.lastResetDate}`,
          title: 'Alerta: Consumo Firebase em 85%',
          message: `O consumo de leituras do Firestore atingiu 85% do limite gratuito diário (${readsFormatted} / ${DAILY_READS_LIMIT.toLocaleString('pt-BR')}).`,
          level: 'alert',
          timestamp: new Date().toLocaleString('pt-BR'),
          read: false,
          category: 'quota',
        });
      } else if (newStatus === 'Alerta Crítico' && !data.notifications.some(n => n.id === `quota_95_${data.lastResetDate}`)) {
        data.notifications.unshift({
          id: `quota_95_${data.lastResetDate}`,
          title: 'Alerta Crítico: 95% da Cota do Firebase',
          message: `Cota de leituras diárias em 95% (${readsFormatted} / ${DAILY_READS_LIMIT.toLocaleString('pt-BR')}). Próximo do limite de gratuidade!`,
          level: 'critical',
          timestamp: new Date().toLocaleString('pt-BR'),
          read: false,
          category: 'quota',
        });
      } else if (newStatus === 'Risco de Cobrança' && !data.notifications.some(n => n.id === `quota_100_${data.lastResetDate}`)) {
        data.notifications.unshift({
          id: `quota_100_${data.lastResetDate}`,
          title: 'Risco de Cobrança: Cota Gratuita Excedida',
          message: `A cota diária gratuita do Firebase foi atingida (${readsFormatted} / ${DAILY_READS_LIMIT.toLocaleString('pt-BR')} leituras). Uso adicional pode gerar cobrança no plano Blaze.`,
          level: 'limit',
          timestamp: new Date().toLocaleString('pt-BR'),
          read: false,
          category: 'quota',
        });
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    notifyTelemetryUpdate(data);
  } catch (e) {
    console.error('Error tracking Firebase op:', e);
  }
}

export function simulateQuotaUsage(targetPercent: number): void {
  const data = getTelemetryData();
  data.dailyReads = Math.round((targetPercent / 100) * DAILY_READS_LIMIT);
  data.quotaStatus = calculateQuotaStatus(data.dailyReads);

  const readsFormatted = data.dailyReads.toLocaleString('pt-BR');
  const level = targetPercent >= 100 ? 'limit' : targetPercent >= 95 ? 'critical' : targetPercent >= 85 ? 'alert' : targetPercent >= 70 ? 'attention' : 'info';

  data.notifications.unshift({
    id: `sim_${Date.now()}`,
    title: `Simulação de Consumo: ${targetPercent}%`,
    message: `Simulação aplicada: ${readsFormatted} de ${DAILY_READS_LIMIT.toLocaleString('pt-BR')} leituras atingidas (${targetPercent}%). Status: ${data.quotaStatus}.`,
    level: level,
    timestamp: new Date().toLocaleString('pt-BR'),
    read: false,
    category: 'quota',
  });

  if (!data.moduleBreakdown['Calibração / Instrumental']) {
    data.moduleBreakdown['Calibração / Instrumental'] = { reads: Math.round(data.dailyReads * 0.45), writes: 120, deletes: 5, lastActivity: 'Agora' };
  }
  if (!data.moduleBreakdown['Colaboradores (RH)']) {
    data.moduleBreakdown['Colaboradores (RH)'] = { reads: Math.round(data.dailyReads * 0.25), writes: 45, deletes: 2, lastActivity: 'Agora' };
  }
  if (!data.moduleBreakdown['Financeiro / Contratos']) {
    data.moduleBreakdown['Financeiro / Contratos'] = { reads: Math.round(data.dailyReads * 0.15), writes: 30, deletes: 0, lastActivity: 'Agora' };
  }
  if (!data.moduleBreakdown['Clientes / Guias']) {
    data.moduleBreakdown['Clientes / Guias'] = { reads: Math.round(data.dailyReads * 0.15), writes: 60, deletes: 1, lastActivity: 'Agora' };
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  notifyTelemetryUpdate(data);
}

export function resetTelemetryData(): void {
  const data: FirebaseTelemetry = {
    ...INITIAL_TELEMETRY,
    notifications: [
      {
        id: `reset_${Date.now()}`,
        title: 'Contador Resetado',
        message: 'Os contadores locais de consumo do Firebase foram zerados para testes.',
        level: 'info',
        timestamp: new Date().toLocaleString('pt-BR'),
        read: false,
        category: 'system',
      },
    ],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  notifyTelemetryUpdate(data);
}

export function markNotificationAsRead(id: string): void {
  const data = getTelemetryData();
  data.notifications = data.notifications.map(n => n.id === id ? { ...n, read: true } : n);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  notifyTelemetryUpdate(data);
}

export function markAllNotificationsAsRead(): void {
  const data = getTelemetryData();
  data.notifications = data.notifications.map(n => ({ ...n, read: true }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  notifyTelemetryUpdate(data);
}

export function clearAllNotifications(): void {
  const data = getTelemetryData();
  data.notifications = [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  notifyTelemetryUpdate(data);
}

export function useFirebaseTelemetry() {
  const [telemetry, setTelemetry] = useState<FirebaseTelemetry>(getTelemetryData());

  useEffect(() => {
    const handleUpdate = (e: CustomEvent<FirebaseTelemetry>) => {
      setTelemetry(e.detail || getTelemetryData());
    };

    window.addEventListener('firebase-telemetry-update', handleUpdate as EventListener);
    return () => {
      window.removeEventListener('firebase-telemetry-update', handleUpdate as EventListener);
    };
  }, []);

  return telemetry;
}
