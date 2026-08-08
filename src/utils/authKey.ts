/**
 * Utility for generating and retrieving unique authenticity keys for Calibration Certificates.
 */

export function generateAuthKey(seed?: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  if (!seed) {
    let result = 'C';
    for (let i = 0; i < 19; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Deterministic seed fallback for existing legacy reports without a saved authKey
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  let result = 'C';
  let current = Math.abs(hash) + 1234567;
  for (let i = 0; i < 19; i++) {
    current = (current * 9301 + 49297) % 233280;
    result += chars.charAt(current % chars.length);
  }
  return result;
}

export function getReportAuthKey(
  report?: { id?: string; certNumber?: string; authKey?: string } | null,
  fallbackSeed?: string
): string {
  if (report?.authKey && report.authKey.trim().length > 0) {
    return report.authKey;
  }
  const seed = report?.id || report?.certNumber || fallbackSeed || 'comanins-cert-key';
  return generateAuthKey(seed);
}
