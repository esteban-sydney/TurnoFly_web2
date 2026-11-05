import type { Language, ShiftCodeDefinition, WorkerProfile } from '../types';
import { supabase } from '../lib/supabase';
import { buildShiftReminders } from './shiftReminders';

const PUSH_PATH = import.meta.env.DEV ? '/__local-push' : '/api/shift-push';

interface PushConfig {
  publicKey: string;
}

function decodeApplicationServerKey(value: string): Uint8Array {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function usesApplicationServerKey(subscription: PushSubscription, expected: Uint8Array): boolean {
  const currentKey = subscription.options.applicationServerKey;
  if (!currentKey) return false;
  const current = new Uint8Array(currentKey);
  return current.length === expected.length && current.every((value, index) => value === expected[index]);
}

async function requestJson<T>(path: string, body?: unknown): Promise<T> {
  const headers: HeadersInit = body === undefined ? {} : { 'Content-Type': 'application/json' };
  if (!import.meta.env.DEV) {
    if (!supabase) throw new Error('La conexión de TurnoFly no está configurada.');
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) throw new Error('Inicia sesión nuevamente para configurar los avisos.');
    (headers as Record<string, string>).Authorization = `Bearer ${data.session.access_token}`;
  }

  const response = await fetch(`${PUSH_PATH}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(result.error || 'No se pudo contactar el servicio de notificaciones.');
  return result;
}

async function loadPushConfig(): Promise<PushConfig> {
  const config = await requestJson<PushConfig>('/config');
  if (!config.publicKey) throw new Error('No están configuradas las claves de notificaciones.');
  return config;
}

async function getReadyRegistration(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Este navegador no admite notificaciones push.');
  }
  return navigator.serviceWorker.ready;
}

export async function enableShiftPush(userId: string): Promise<void> {
  if (!('Notification' in window)) throw new Error('Este navegador no admite notificaciones push.');
  if (Notification.permission !== 'granted') {
    throw new Error('Debes permitir las notificaciones del sistema para activar los avisos.');
  }

  const [registration, config] = await Promise.all([getReadyRegistration(), loadPushConfig()]);
  const applicationServerKey = decodeApplicationServerKey(config.publicKey);
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && !usesApplicationServerKey(subscription, applicationServerKey)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription = subscription || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });

  await requestJson('/subscribe', {
    userId,
    subscription: subscription.toJSON(),
  });
}

export async function syncShiftPushSchedule(
  userId: string,
  worker: WorkerProfile | undefined,
  definitions: Record<string, ShiftCodeDefinition>,
  language: Language,
  enabled: boolean
): Promise<void> {
  scheduleSyncQueue = scheduleSyncQueue
    .catch(() => undefined)
    .then(() => performShiftScheduleSync(userId, worker, definitions, language, enabled));
  return scheduleSyncQueue;
}

let scheduleSyncQueue: Promise<void> = Promise.resolve();

async function performShiftScheduleSync(
  userId: string,
  worker: WorkerProfile | undefined,
  definitions: Record<string, ShiftCodeDefinition>,
  language: Language,
  enabled: boolean
): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registration = await getReadyRegistration();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const activeWorker = enabled ? worker : undefined;
  const reminders = activeWorker ? buildShiftReminders(activeWorker, definitions, language) : [];
  const subscriptionJson = subscription.toJSON();

  await requestJson('/subscribe', { userId, subscription: subscriptionJson });
  await requestJson('/schedule', {
    userId,
    workerId: activeWorker?.id || '',
    subscription: subscriptionJson,
    reminders,
  });
}

export async function sendShiftPushTest(userId: string): Promise<void> {
  const registration = await getReadyRegistration();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) throw new Error('Activa primero los recordatorios en este dispositivo.');

  await requestJson('/test', {
    userId,
    subscription: subscription.toJSON(),
  });
}
