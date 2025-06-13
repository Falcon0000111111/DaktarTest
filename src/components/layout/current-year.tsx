"use client";

import { useState, useEffect } from 'react';

export function CurrentYear() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  if (year === null) {
    // Fallback for SSR or if JS is disabled, though it will be quickly replaced on client
    // Returning the server-generated year initially can prevent layout shift
    // but the useEffect will update it on the client to ensure no mismatch.
    return <>{new Date().getFullYear()}</>; 
  }

  return <>{year}</>;
}
