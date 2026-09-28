import { useContext } from 'react';
import {
  MembershipContext,
  type MembershipContextValue,
} from './membershipContext';

export function useMembership(): MembershipContextValue {
  const ctx = useContext(MembershipContext);
  if (!ctx) {
    throw new Error('useMembership must be used within MembershipProvider');
  }
  return ctx;
}
