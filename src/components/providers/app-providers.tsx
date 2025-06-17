
"use client";

import type { ReactNode } from 'react';
import { ThemeProvider } from './theme-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light" storageKey="finalquiz-theme">
      {children}
    </ThemeProvider>
  );
}
