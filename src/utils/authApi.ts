import type { Auth } from 'firebase/auth';
import { auth, clientAuth } from '../lib/firebase';

async function authenticatedJsonFetch(
  authInstance: Auth,
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const currentUser = authInstance.currentUser;
  if (!currentUser) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const token = await currentUser.getIdToken();
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(input, { ...init, headers });
}

/** Internal employee/API session. */
export function authJsonFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  return authenticatedJsonFetch(auth, input, init);
}

/** Client Portal/API session, isolated from the employee session. */
export function clientAuthJsonFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  return authenticatedJsonFetch(clientAuth, input, init);
}

export async function verifyAdminCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const cleanUsername = (username || '').trim();
  const cleanPassword = password || '';
  if (!cleanUsername || !cleanPassword) return false;

  const response = await authJsonFetch('/api/auth/verify-admin', {
    method: 'POST',
    body: JSON.stringify({ username: cleanUsername, password: cleanPassword }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    throw new Error('Não foi possível validar a autorização administrativa.');
  }

  const data = await response.json();
  return data.valid === true;
}
