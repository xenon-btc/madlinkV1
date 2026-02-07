import React from 'react';
import { useAuthStore } from '../store/auth';

export function SubscriptionCheck({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();

  if (!user) {
    return null;
  }

  return <>{children}</>;
}