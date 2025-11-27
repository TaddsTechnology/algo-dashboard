import { useState, useEffect } from 'react';

interface MarketData {
  current: Record<string, unknown>;
  near: Record<string, unknown>;
  next: Record<string, unknown>;
  far: Record<string, unknown>;
  timestamp: number;
}

export function usePollingData(intervalMs = 3000) {
  const [data, setData] = useState<MarketData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const response = await fetch('https://taddsTeam-algo.hf.space/api/all-futures-combined', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        
        if (isMounted && result.success) {
          setData(result.data);
          setIsLoading(false);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    };

    // Initial fetch
    fetchData();

    // Poll every intervalMs
    const interval = setInterval(fetchData, intervalMs);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [intervalMs]);

  return { data, error, isLoading };
}
