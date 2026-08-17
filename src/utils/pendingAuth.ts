const PENDING_AUTH_KEY = 'turnofly_pending_auth_v1';
const PENDING_AUTH_TTL_MS = 60 * 60 * 1000;

interface PendingAuthRequest {
  email: string;
  expiresAt: number;
}

export const getPendingAuthEmail = (): string | null => {
  try {
    const value = localStorage.getItem(PENDING_AUTH_KEY);
    if (!value) return null;

    const pending = JSON.parse(value) as PendingAuthRequest;
    if (!pending.email || !pending.expiresAt || pending.expiresAt <= Date.now()) {
      localStorage.removeItem(PENDING_AUTH_KEY);
      return null;
    }

    return pending.email;
  } catch {
    localStorage.removeItem(PENDING_AUTH_KEY);
    return null;
  }
};

export const savePendingAuthEmail = (email: string): void => {
  const pending: PendingAuthRequest = {
    email: email.trim().toLowerCase(),
    expiresAt: Date.now() + PENDING_AUTH_TTL_MS,
  };

  localStorage.setItem(PENDING_AUTH_KEY, JSON.stringify(pending));
};

export const clearPendingAuthEmail = (): void => {
  localStorage.removeItem(PENDING_AUTH_KEY);
};
