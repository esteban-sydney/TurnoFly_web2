import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface ShiftPushContext {
  admin: SupabaseClient;
  user: User;
}

function env(name: string, fallback?: string): string {
  const value = process.env[name] || (fallback ? process.env[fallback] : '');
  if (!value) throw new Error(`Falta configurar la variable ${name}.`);
  return value;
}

export function createAdminClient(): SupabaseClient {
  return createClient(
    env('SUPABASE_URL', 'VITE_SUPABASE_URL'),
    env('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function authenticateRequest(request: Request): Promise<ShiftPushContext | Response> {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: 'Debes iniciar sesión para usar recordatorios.' }, 401);

  try {
    const url = env('SUPABASE_URL', 'VITE_SUPABASE_URL');
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || env('VITE_SUPABASE_PUBLISHABLE_KEY');
    const authClient = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) return json({ error: 'La sesión ya no es válida. Vuelve a iniciar sesión.' }, 401);
    return { admin: createAdminClient(), user: data.user };
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'No se pudo validar la sesión.' }, 500);
  }
}

export function isResponse(value: ShiftPushContext | Response): value is Response {
  return value instanceof Response;
}

export function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

export function parseSubscription(value: unknown): PushSubscriptionInput | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<PushSubscriptionInput>;
  if (
    typeof candidate.endpoint !== 'string' ||
    candidate.endpoint.length > 4096 ||
    !candidate.endpoint.startsWith('https://') ||
    typeof candidate.keys?.p256dh !== 'string' ||
    typeof candidate.keys.auth !== 'string' ||
    candidate.keys.p256dh.length > 512 ||
    candidate.keys.auth.length > 512
  ) return undefined;
  return candidate as PushSubscriptionInput;
}

export async function saveSubscription(
  admin: SupabaseClient,
  userId: string,
  subscription: PushSubscriptionInput
): Promise<string> {
  const { data, error } = await admin
    .from('shift_push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })
    .select('id')
    .single();
  if (error || !data?.id) throw new Error('No se pudo guardar la suscripción del dispositivo.');
  return data.id as string;
}

export function configureWebPush(): { publicKey: string; privateKey: string; subject: string } {
  return {
    publicKey: env('TURNOFLY_VAPID_PUBLIC_KEY'),
    privateKey: env('TURNOFLY_VAPID_PRIVATE_KEY'),
    subject: process.env.TURNOFLY_VAPID_SUBJECT || 'mailto:notifications@turnofly.app',
  };
}

export function isCronRequestAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get('x-cron-secret') || '';
  if (!expected || !provided || expected.length !== provided.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ provided.charCodeAt(index);
  }
  return mismatch === 0;
}
