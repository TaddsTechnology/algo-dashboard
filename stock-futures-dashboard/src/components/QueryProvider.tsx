"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

// LocalStorage cache for instant loading
const CACHE_KEY = 'futures-data-cache';

function getCachedData() {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Use cache if less than 5 minutes old
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return data;
      }
    }
  } catch (e) {
    console.error('Cache read error:', e);
  }
  return null;
}

function setCachedData(data: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error('Cache write error:', e);
  }
}

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 1000, // 2 seconds
            gcTime: 10 * 60 * 1000, // 10 minutes
            refetchOnWindowFocus: true,
            refetchOnMount: true,
            retry: 2,
          },
        },
      })
  );

  // Load cached data on mount
  useEffect(() => {
    const cachedData = getCachedData();
    if (cachedData) {
      queryClient.setQueryData(['market-data-all'], cachedData);
    }
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Export cache utilities for use in components
export { getCachedData, setCachedData };
