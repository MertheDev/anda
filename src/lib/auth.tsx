import type { Session } from '@supabase/supabase-js';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { z } from 'zod';

import i18n from '@/i18n';
import { cleanText } from '@/lib/security';
import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  displayName: string;
  role: 'traveler' | 'business';
}

export type AuthResult = { ok: true; needsConfirmation?: boolean } | { ok: false; error: 'backendOff' | 'failed' };

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, displayName: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
}

export const credentialsSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(72),
});
export const displayNameSchema = z.string().trim().min(2).max(40);

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('id, display_name, role').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  return { id: data.id, displayName: data.display_name, role: data.role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // The profile is tagged with its user id so a stale one is never shown after sign-out or account switch.
  const [loaded, setLoaded] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    void client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, next) => setSession(next));
    // Tokens only auto-refresh while the app is in the foreground.
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void client.auth.startAutoRefresh();
      else void client.auth.stopAutoRefresh();
    });
    return () => {
      sub.subscription.unsubscribe();
      appState.remove();
    };
  }, []);

  const userId = session?.user.id;
  const profile = userId && loaded?.id === userId ? loaded : null;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void loadProfile(userId).then((p) => {
      if (!cancelled) setLoaded(p);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signIn = useCallback<AuthContextValue['signIn']>(async (email, password) => {
    if (!supabase) return { ok: false, error: 'backendOff' };
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? { ok: false, error: 'failed' } : { ok: true };
  }, []);

  const signUp = useCallback<AuthContextValue['signUp']>(async (email, password, displayName) => {
    if (!supabase) return { ok: false, error: 'backendOff' };
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: cleanText(displayName, 40), locale: i18n.language === 'tr' ? 'tr' : 'en' } },
    });
    if (error) return { ok: false, error: 'failed' };
    return { ok: true, needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  const updateDisplayName = useCallback(
    async (name: string) => {
      const parsed = displayNameSchema.safeParse(cleanText(name, 40));
      if (!supabase || !userId || !parsed.success) return false;
      const { error } = await supabase.from('profiles').update({ display_name: parsed.data }).eq('id', userId);
      if (error) return false;
      setLoaded((p) => (p ? { ...p, displayName: parsed.data } : p));
      return true;
    },
    [userId],
  );

  const deleteAccount = useCallback(async () => {
    if (!supabase) return false;
    const { error } = await supabase.rpc('delete_my_account');
    if (error) return false;
    await supabase.auth.signOut();
    return true;
  }, []);

  const value = useMemo(
    () => ({ session, profile, loading, signIn, signUp, signOut, updateDisplayName, deleteAccount }),
    [session, profile, loading, signIn, signUp, signOut, updateDisplayName, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
