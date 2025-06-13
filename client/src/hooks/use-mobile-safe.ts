import { useState, useEffect } from 'react';

export function useMobileSafe<T>(data: T, fallback: T): T {
  const [safeData, setSafeData] = useState<T>(fallback);

  useEffect(() => {
    try {
      if (data !== null && data !== undefined) {
        setSafeData(data);
      } else {
        setSafeData(fallback);
      }
    } catch (error) {
      console.error('Mobile safe hook error:', error);
      setSafeData(fallback);
    }
  }, [data, fallback]);

  return safeData;
}

export function safeArray<T>(data: T[] | undefined | null): T[] {
  try {
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Safe array error:', error);
    return [];
  }
}

export function safeObject<T extends object>(data: T | undefined | null, fallback: T): T {
  try {
    return (data && typeof data === 'object') ? data : fallback;
  } catch (error) {
    console.error('Safe object error:', error);
    return fallback;
  }
}