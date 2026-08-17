import type { AppSettings, HorarioEvidence, PersonalEvent, WorkerProfile } from '../types';
import { supabase } from '../lib/supabase';

export interface UserAppSnapshot {
  version: 1;
  settings: AppSettings;
  workers: WorkerProfile[];
  events: PersonalEvent[];
  evidence: HorarioEvidence[];
}

export type CloudLoadResult =
  | { status: 'loaded'; snapshot: UserAppSnapshot }
  | { status: 'empty' }
  | { status: 'unavailable'; reason?: string };

const isSnapshot = (value: unknown): value is UserAppSnapshot => {
  if (!value || typeof value !== 'object') return false;

  const snapshot = value as Partial<UserAppSnapshot>;
  return (
    snapshot.version === 1 &&
    Boolean(snapshot.settings && typeof snapshot.settings === 'object') &&
    Array.isArray(snapshot.workers) &&
    Array.isArray(snapshot.events) &&
    Array.isArray(snapshot.evidence)
  );
};

export const loadUserAppSnapshot = async (userId: string): Promise<CloudLoadResult> => {
  if (!supabase) return { status: 'unavailable', reason: 'Supabase no configurado' };

  const { data, error } = await supabase
    .from('user_app_data')
    .select('payload')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Cloud storage is unavailable:', error.message);
    return { status: 'unavailable', reason: error.message };
  }

  if (!data) return { status: 'empty' };
  if (!isSnapshot(data.payload)) {
    return { status: 'unavailable', reason: 'Formato de datos remoto no reconocido' };
  }

  return { status: 'loaded', snapshot: data.payload };
};

export const saveUserAppSnapshot = async (
  userId: string,
  snapshot: UserAppSnapshot
): Promise<boolean> => {
  if (!supabase) return false;

  const { error } = await supabase.from('user_app_data').upsert(
    {
      user_id: userId,
      payload: snapshot,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.warn('Cloud storage could not save changes:', error.message);
    return false;
  }

  return true;
};
