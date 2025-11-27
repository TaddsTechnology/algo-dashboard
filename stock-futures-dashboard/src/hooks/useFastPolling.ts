"use client";

import { useState, useEffect, useRef } from 'react';

interface PollingData {
  current: Record<string, unknown>;
  near: Record<string, unknown>;
  next: Record<string, unknown>;
  far: Record<string, unknown>;
  timestamp: number;
}

/**
 * Ultra-fast 500ms polling for real-time stock data
 * Perfect for Vercel where SSE is blocked
 */
export function useFastPolling(url: string, intervalMs: number = 500) {
  const [data, setData] = useState<PollingData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchData = async () => {
      if (!isMountedRef.current) return;
      
      try {
        const response = await fetch(url, {
          cache: 'no-store',
          headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        
        if (isMountedRef.current && result.success) {
          setData(result.data);
          setError(null);
          setPollCount(prev => prev + 1);
          
          // Log every 10th poll to avoid spam
          if ((pollCount + 1) % 10 === 0) {
            console.log(`⚡ Poll #${pollCount + 1} - Data age: ${result.data_age_seconds?.toFixed(2)}s`);
          }
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err as Error);
          console.error('❌ Polling error:', err);
        }
      }
    };

    // Initial fetch
    fetchData();

    // Start polling
    const intervalId = setInterval(fetchData, intervalMs);
    console.log(`⚡ Ultra-fast polling started (${intervalMs}ms intervals)`);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
      console.log(`🛑 Polling stopped after ${pollCount} requests`);
    };
  }, [url, intervalMs, pollCount]);

  return { data, error, pollCount };
}
