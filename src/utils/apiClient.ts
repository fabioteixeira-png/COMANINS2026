import { auth } from '../lib/firebase';

/**
 * Utility for API requests with:
 * - Rate Limiter / Concurrency Control (max 3 concurrent requests)
 * - In-flight Request Lock / Deduplication (prevents duplicate requests while pending)
 * - Response Caching with configurable TTL
 * - Exponential Backoff Retry for HTTP 429 (Rate Exceeded)
 * - Friendly 429 Error Handling without crashing the app
 * - Debounce helper
 */

// Debounce Utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, waitMs);
  };
}

// In-Flight Promise Locks
const pendingRequests = new Map<string, Promise<any>>();

// Cache Store
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const apiCache = new Map<string, CacheEntry<any>>();

// Concurrency Queue Limiter
class ConcurrencyLimiter {
  private maxConcurrent: number;
  private activeCount: number = 0;
  private queue: (() => void)[] = [];

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.maxConcurrent) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.activeCount++;
    try {
      return await fn();
    } finally {
      this.activeCount--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        if (next) next();
      }
    }
  }
}

export const limiter = new ConcurrencyLimiter(3);

export interface FetchOptions extends RequestInit {
  ttlMs?: number; // Cache TTL in ms (0 = disable cache)
  maxRetries?: number; // Max retries for 429
  initialRetryDelayMs?: number; // Initial exponential backoff delay in ms
}

/**
 * Enhanced fetch wrapper with rate limiting, deduplication, caching, and exponential backoff.
 */
export async function safeFetch<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    ttlMs = 0,
    maxRetries = 3,
    initialRetryDelayMs = 1000,
    method = 'GET',
    body,
    headers,
    ...restInit
  } = options;

  const isGet = method.toUpperCase() === 'GET';
  const requestKey = `${method.toUpperCase()}:${url}:${typeof body === 'string' ? body : JSON.stringify(body || '')}`;

  // 1. Check Cache
  if (isGet && ttlMs > 0) {
    const cached = apiCache.get(requestKey);
    if (cached && Date.now() - cached.timestamp < ttlMs) {
      return cached.data as T;
    }
  }

  // 2. Check In-Flight Request Lock
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey) as Promise<T>;
  }

  // 3. Define execution logic with Exponential Backoff Retry for 429
  const executeFetch = async (): Promise<T> => {
    return limiter.run(async () => {
      let attempt = 0;
      let delay = initialRetryDelayMs;

      while (attempt <= maxRetries) {
        try {
          const requestHeaders = new Headers(headers || {});
          if (!requestHeaders.has('Content-Type')) {
            requestHeaders.set('Content-Type', 'application/json');
          }

          // Attach Firebase ID token only to this application's API routes.
          // Never forward COMANINS credentials to third-party URLs (e.g. api.ipify.org).
          if (url.startsWith('/api/') && auth.currentUser && !requestHeaders.has('Authorization')) {
            const token = await auth.currentUser.getIdToken();
            requestHeaders.set('Authorization', `Bearer ${token}`);
          }

          const res = await fetch(url, {
            method,
            headers: requestHeaders,
            body,
            ...restInit,
          });

          // Check for Rate Limit (HTTP 429)
          if (res.status === 429) {
            console.warn(`[API Client] HTTP 429 Rate Exceeded em ${url}. Tentativa ${attempt + 1}/${maxRetries + 1}`);
            if (attempt < maxRetries) {
              attempt++;
              const jitter = Math.random() * 200;
              await new Promise((resolve) => setTimeout(resolve, delay + jitter));
              delay *= 2; // Exponential backoff
              continue;
            }
            throw new Error('RATE_EXCEEDED');
          }

          if (!res.ok) {
            const errorText = await res.text().catch(() => '');
            if (errorText.includes('Rate exceeded') || errorText.includes('Quota')) {
              if (attempt < maxRetries) {
                attempt++;
                const jitter = Math.random() * 200;
                await new Promise((resolve) => setTimeout(resolve, delay + jitter));
                delay *= 2;
                continue;
              }
              throw new Error('RATE_EXCEEDED');
            }
            throw new Error(`HTTP Error ${res.status}: ${errorText || res.statusText}`);
          }

          const data = await res.json();

          // Save to cache
          if (isGet && ttlMs > 0) {
            apiCache.set(requestKey, { data, timestamp: Date.now() });
          }

          return data as T;
        } catch (err: any) {
          if (
            err.message === 'RATE_EXCEEDED' ||
            String(err).includes('429') ||
            String(err).includes('Rate exceeded')
          ) {
            if (attempt < maxRetries) {
              attempt++;
              const jitter = Math.random() * 200;
              await new Promise((resolve) => setTimeout(resolve, delay + jitter));
              delay *= 2;
              continue;
            }
            console.warn(`[API Client] 429 Rate Exceeded em ${url} persistiu após retentativas.`);
            return {
              error: 'Rate exceeded',
              message: 'Limite de requisições temporariamente excedido. Os dados locais continuam seguros.',
              rateExceeded: true,
            } as unknown as T;
          }

          if (attempt >= maxRetries) {
            console.error(`[API Client] Erro na requisição ${url}:`, err);
            throw err;
          }

          attempt++;
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        }
      }

      throw new Error(`Falha na requisição após ${maxRetries} tentativas.`);
    });
  };

  // 4. Lock in-flight request
  const fetchPromise = executeFetch().finally(() => {
    pendingRequests.delete(requestKey);
  });

  pendingRequests.set(requestKey, fetchPromise);
  return fetchPromise;
}
