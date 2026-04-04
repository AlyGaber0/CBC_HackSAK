'use client';

/** Returns the provider auth token stored in localStorage */
export function getProviderToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('triaje_provider_token') ?? '';
}

/** Sets the provider auth token in localStorage */
export function setProviderToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('triaje_provider_token', token);
}

/** fetch() wrapper that injects the x-provider-token header on every request */
export function providerFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = getProviderToken();
  return fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string>),
      ...(token ? { 'x-provider-token': token } : {}),
    },
  });
}
