import { useEffect, useCallback, useRef } from 'react';
import { useSessionStore } from '../store/session-store';
import { useSettingsStore } from '../store/settings-store';
import { ApiClient } from '../api/client';

export function usePolling(intervalMs = 15_000) {
  const session = useSessionStore();
  const settings = useSettingsStore();
  const timerRef = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (!settings.apiKeyValid) return;
    const client = new ApiClient(session.tenantId, session.projectId);

    try {
      const [sessionData, guidanceData] = await Promise.allSettled([
        client.getSession(),
        client.getGuidance(),
      ]);

      if (sessionData.status === 'fulfilled' && sessionData.value) {
        session.setSession({
          currentCycle: sessionData.value.currentCycle,
          currentPhase: sessionData.value.currentPhase,
          synapticStrength: sessionData.value.synapticStrength,
        });
      }

      if (guidanceData.status === 'fulfilled' && guidanceData.value) {
        session.setGuidance({
          nextSteps: guidanceData.value.nextSteps ?? [],
          orientation: guidanceData.value.orientation ?? '',
          phaseProgress: guidanceData.value.phaseProgress ?? 0,
        });
      }
    } catch {
      // Silently fail — sidebar shows stale data
    }
  }, [session, settings]);

  useEffect(() => {
    refresh();
    timerRef.current = window.setInterval(refresh, intervalMs);
    return () => window.clearInterval(timerRef.current);
  }, [refresh, intervalMs]);

  return { refresh };
}
