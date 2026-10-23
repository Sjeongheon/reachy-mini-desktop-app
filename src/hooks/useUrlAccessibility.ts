import { useEffect, useRef, useState } from 'react';
import { getDaemonHostname } from '../config/daemon';

export interface UrlAccessibilityResult {
  isAccessible: boolean;
  isChecking: boolean;
}

export function useUrlAccessibility(
  url: string | null | undefined,
  enabled: boolean = false,
  onTimeout: (() => void) | null = null,
  timeoutMs: number = 30000
): UrlAccessibilityResult {
  const [isAccessible, setIsAccessible] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const onTimeoutRef = useRef<(() => void) | null>(onTimeout);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    if (!enabled || !url) {
      setIsAccessible(false);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    setIsAccessible(false);

    let cancelled = false;
    let succeeded = false;
    let pollTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let globalTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const startTime = Date.now();

    const markSuccess = (): void => {
      if (!cancelled && !succeeded) {
        succeeded = true;
        setIsAccessible(true);
        setIsChecking(false);
        if (globalTimeoutId) {
          clearTimeout(globalTimeoutId);
          globalTimeoutId = null;
        }
      }
    };

    const checkUrl = async (): Promise<void> => {
      if (Date.now() - startTime > timeoutMs) {
        if (!cancelled && !succeeded) {
          setIsChecking(false);
          if (onTimeoutRef.current) {
            onTimeoutRef.current();
          }
        }
        return;
      }

      try {
        const targetUrl = new URL(url);
        targetUrl.hostname = getDaemonHostname();

        const controller = new AbortController();
        const requestTimeout = setTimeout(() => controller.abort(), 5000);

        await fetch(targetUrl.toString(), {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal,
          cache: 'no-store',
        });

        clearTimeout(requestTimeout);

        markSuccess();
      } catch {
        if (!cancelled && !succeeded) {
          pollTimeoutId = setTimeout(checkUrl, 2000);
        }
      }
    };

    pollTimeoutId = setTimeout(checkUrl, 1000);

    globalTimeoutId = setTimeout(() => {
      if (!cancelled && !succeeded) {
        setIsChecking(false);
        if (onTimeoutRef.current) {
          onTimeoutRef.current();
        }
      }
    }, timeoutMs + 1000);

    return () => {
      cancelled = true;
      succeeded = true;
      if (pollTimeoutId) clearTimeout(pollTimeoutId);
      if (globalTimeoutId) clearTimeout(globalTimeoutId);
    };
  }, [url, enabled, timeoutMs]);

  return { isAccessible, isChecking };
}
