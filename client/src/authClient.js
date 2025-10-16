import { createAuthClient } from 'better-auth/react';

const baseURL = import.meta.env.VITE_AUTH_BASE_URL?.trim() || undefined;

export const auth = createAuthClient({
  baseURL,
  fetch: (input, init = {}) =>
    fetch(input, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init.headers ?? {}),
      },
    }),
});

export const { useSession, signIn, signOut } = auth;
