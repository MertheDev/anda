import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { fetchEvents } from '@/data/eventsRepo';
import { EVENTS } from '@/data/events';
import { isBackendConfigured } from '@/lib/supabase';
import type { AndaEvent } from '@/types/event';

/** Loads events whenever the screen gains focus, so a newly created plan shows up on return. */
export function useEvents() {
  const [events, setEvents] = useState<AndaEvent[]>(isBackendConfigured ? [] : EVENTS);
  const [loading, setLoading] = useState(isBackendConfigured);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setEvents(await fetchEvents());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const replace = useCallback((updated: AndaEvent) => {
    setEvents((list) => list.map((e) => (e.id === updated.id ? updated : e)));
  }, []);

  return { events, loading, failed, refresh, replace };
}
