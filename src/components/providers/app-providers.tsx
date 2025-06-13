"use client";

import type { ReactNode } from 'react';

export function AppProviders({ children }: { children: ReactNode }) {
  // This can be used to wrap the app with context providers, e.g., React Query, Theme provider
  return <>{children}</>;
}
