import { useState, type ReactNode } from 'react';
import { MembershipContext } from './membershipContext';
import {
  clearSession,
  loadSession,
  savePaid,
  saveSignIn,
  type MembershipSession,
} from './stubAdapter';

function readInitialSession(): MembershipSession | null {
  if (typeof window === 'undefined') return null;
  return loadSession();
}

export function MembershipProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<MembershipSession | null>(
    readInitialSession,
  );

  function signIn(email: string) {
    setSession(saveSignIn(email));
  }

  function signOut() {
    clearSession();
    setSession(null);
  }

  function markPaid() {
    savePaid();
    setSession((prev) => (prev ? { ...prev, isPaid: true } : prev));
  }

  return (
    <MembershipContext.Provider
      value={{
        memberEmail: session?.email ?? null,
        isPaid: session?.isPaid ?? false,
        ready: true,
        signIn,
        signOut,
        markPaid,
      }}
    >
      {children}
    </MembershipContext.Provider>
  );
}
