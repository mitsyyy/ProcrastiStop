import { useCallback, useEffect, useState } from 'react';

import { analyticsRepository } from '@/repositories/analyticsRepository';
import { useFocusStore } from '@/store/focusStore';
import { useTaskStore } from '@/store/taskStore';
import type { AnalyticsSummary } from '@/types/analytics';

export function useAnalytics() {
  const sessions = useFocusStore((s) => s.sessions);
  const tasks = useTaskStore((s) => s.tasks);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsRepository.getSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to calculate analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await analyticsRepository.getSummary();
        if (!active) return;
        setSummary(data);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to calculate analytics.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [sessions, tasks]);

  return { summary, loading, error, refresh };
}
