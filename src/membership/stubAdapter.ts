const EMAIL_KEY = 'efc-member-email';
const PAID_KEY = 'efc-member-paid';

export type MembershipSession = {
  email: string;
  isPaid: boolean;
};

/** Phase 1 stub — swap for Netlify Function + DB in Phase 2. */
export function loadSession(): MembershipSession | null {
  const email = localStorage.getItem(EMAIL_KEY);
  if (!email) return null;
  return {
    email,
    isPaid: localStorage.getItem(PAID_KEY) === 'true',
  };
}

export function saveSignIn(email: string): MembershipSession {
  const normalised = email.trim().toLowerCase();
  localStorage.setItem(EMAIL_KEY, normalised);
  const isPaid = localStorage.getItem(PAID_KEY) === 'true';
  return { email: normalised, isPaid };
}

export function savePaid(): void {
  localStorage.setItem(PAID_KEY, 'true');
}

export function clearSession(): void {
  localStorage.removeItem(EMAIL_KEY);
  // Keep paid flag tied to email for prototype realism across sign-outs of same browser;
  // clear both so each prototype session starts fresh.
  localStorage.removeItem(PAID_KEY);
}
