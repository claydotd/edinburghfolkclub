import { useEffect, useState, type ReactNode } from 'react';
import { isNewsDemo } from '../news/api';
import { fetchMemberSession, memberLogin, memberLogout } from './api';
import { MembershipContext } from './membershipContext';
import {
  clearSession,
  loadSession,
  saveSignIn,
  type MembershipSession,
} from './stubAdapter';
import type { Member } from './types';

type MembershipState = {
  email: string | null;
  name: string | null;
  isPaid: boolean;
  paidAt: string | null;
  expiresAt: string | null;
  current: boolean;
};

const emptyState: MembershipState = {
  email: null,
  name: null,
  isPaid: false,
  paidAt: null,
  expiresAt: null,
  current: false,
};

function fromMember(member: Member | null): MembershipState {
  if (!member) return emptyState;
  return {
    email: member.email,
    name: member.name,
    isPaid: member.paid,
    paidAt: member.paidAt,
    expiresAt: member.expiresAt,
    current: member.current,
  };
}

function fromDemo(session: MembershipSession | null): MembershipState {
  if (!session) return emptyState;
  return {
    ...emptyState,
    email: session.email,
    isPaid: session.isPaid,
    current: session.isPaid,
  };
}

export function MembershipProvider({ children }: { children: ReactNode }) {
  const demo = isNewsDemo();
  const [state, setState] = useState<MembershipState>(emptyState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (demo) {
        if (!cancelled) {
          setState(fromDemo(loadSession()));
          setReady(true);
        }
        return;
      }
      try {
        const member = await fetchMemberSession();
        if (!cancelled) setState(fromMember(member));
      } catch {
        if (!cancelled) setState(emptyState);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [demo]);

  async function signIn(email: string) {
    if (demo) {
      setState(fromDemo(saveSignIn(email)));
      return;
    }
    const member = await memberLogin(email);
    setState(fromMember(member));
  }

  async function signOut() {
    try {
      if (demo) clearSession();
      else await memberLogout();
    } finally {
      setState(emptyState);
    }
  }

  return (
    <MembershipContext.Provider
      value={{
        memberEmail: state.email,
        memberName: state.name,
        isPaid: state.isPaid,
        paidAt: state.paidAt,
        expiresAt: state.expiresAt,
        current: state.current,
        ready,
        signIn,
        signOut,
      }}
    >
      {children}
    </MembershipContext.Provider>
  );
}
