import { authenticateRequest, isResponse, json, parseSubscription, saveSubscription } from '../../src/server/shiftPush.js';

export async function POST(request: Request): Promise<Response> {
  const context = await authenticateRequest(request);
  if (isResponse(context)) return context;

  const body = await request.json().catch(() => null) as { subscription?: unknown } | null;
  const subscription = parseSubscription(body?.subscription);
  if (!subscription) return json({ error: 'La suscripción del dispositivo no tiene un formato válido.' }, 400);

  try {
    const subscriptionId = await saveSubscription(context.admin, context.user.id, subscription);
    return json({ status: 'subscribed', subscriptionId });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'No se pudo guardar la suscripción.' }, 500);
  }
}
