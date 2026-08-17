import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { clearPendingAuthEmail } from '../utils/pendingAuth';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const getClient = () => {
  if (!supabase) {
    throw new Error('Supabase no está configurado en este dispositivo.');
  }

  return supabase;
};

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setIsLoading(false);
        if (data.session) clearPendingAuthEmail();
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
        setIsLoading(false);
        if (nextSession) clearPendingAuthEmail();
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      isConfigured: isSupabaseConfigured,
      sendCode: async (email) => {
        const { error } = await getClient().auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) throw error;
      },
      verifyCode: async (email, token) => {
        const client = getClient();
        let verification = await client.auth.verifyOtp({
          email,
          token,
          type: 'email',
        });

        if (verification.error) {
          verification = await client.auth.verifyOtp({
            email,
            token,
            type: 'signup',
          });
        }

        if (verification.error) throw verification.error;
        if (!verification.data.session) {
          throw new Error('Supabase no devolvio una sesion despues de validar el codigo.');
        }

        clearPendingAuthEmail();
        setSession(verification.data.session);
      },
      signOut: async () => {
        setIsLoading(true);
        const { error } = await getClient().auth.signOut({ scope: 'local' });
        if (error) {
          setIsLoading(false);
          throw error;
        }
        setSession(null);
        setIsLoading(false);
      },
    }),
    [session, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de AuthProvider.');
  }

  return context;
};
