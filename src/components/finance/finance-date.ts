const FINANCE_TIME_ZONE = 'America/Bahia';

const financeDateParts = (date: Date = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: FINANCE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const financeTodayLocal = (): string => financeDateParts();

export const financeMonthLocal = (): string => financeTodayLocal().slice(0, 7);

export const financeYearLocal = (): string => financeTodayLocal().slice(0, 4);

export const financeAddYearsLocal = (value: string, years = 1): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const [sourceYear, sourceMonth, sourceDay] = value.split('-').map(Number);
  const targetYear = sourceYear + years;
  const lastDay = new Date(Date.UTC(targetYear, sourceMonth, 0, 12)).getUTCDate();
  const day = Math.min(sourceDay, lastDay);
  return `${targetYear}-${String(sourceMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const financeFormatDatePt = (value?: string): string => {
  if (!value) return '—';
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('pt-BR');
};
