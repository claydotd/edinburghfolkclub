import { createContext } from 'react';

export type MembershipContextValue = {
  memberEmail: string | null;
  isPaid: boolean;
  ready: boolean;
  signIn: (email: string) => void;
  signOut: () => void;
  markPaid: () => void;
};

export const MembershipContext = createContext<MembershipContextValue | null>(
  null,
);
