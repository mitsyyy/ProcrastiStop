import { useEffect } from 'react';

import { useFocusStore } from '@/store/focusStore';

/**
 * Display ticker only: refreshes remainingSeconds from authoritative endTimestampMs.
 * Uses 300ms cadence so second transitions never visibly stutter without causing drift.
 */
export function useFocusTicker(onAutoCompleted?: () => void) {
  const status = useFocusStore((s) => s.activeSession?.status ?? null);
  const tickDisplay = useFocusStore((s) => s.tickDisplay);

  useEffect(() => {
    if (status !== 'active') return;

    void tickDisplay().then((res) => {
      if (res === 'completed' && onAutoCompleted) {
        onAutoCompleted();
      }
    });

    const interval = setInterval(() => {
      void tickDisplay().then((res) => {
        if (res === 'completed' && onAutoCompleted) {
          onAutoCompleted();
        }
      });
    }, 300);

    return () => clearInterval(interval);
  }, [status, tickDisplay, onAutoCompleted]);
}
