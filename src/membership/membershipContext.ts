import { createContext } from 'react';

export type MembershipContextValue = {
  memberEmail: string | null;
  memberName: string | null;
  isPaid: boolean;
  paidAt: string | null;
  expiresAt: string | null;
  current: boolean;
  ready: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const MembershipContext = createContext<MembershipContextValue | null>(
  null,
);
