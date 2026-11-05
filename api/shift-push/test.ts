import webPush from 'web-push';
import {
  authenticateRequest,
  configureWebPush,
  isResponse,
  json,
  parseSubscription,
} from '../../src/server/shiftPush';

export async function POST(request: Request): Promise<Response> {
  const context = await authenticateRequest(request);
  if (isResponse(context)) return context;

  const body = await request.json().catch(() => null) as { subscription?: unknown } | null;
  const subscription = parseSubscription(body?.subscription);
  if (!subscription) return json({ error: 'La suscripción del dispositivo no tiene un formato válido.' }, 400);

  const { data, error } = await context.admin
    .from('shift_push_subscriptions')
    .select('id')
    .eq('user_id', context.user.id)
    .eq('endpoint', subscription.endpoint)
    .maybeSingle();
  if (error || !data) return json({ error: 'Activa primero los recordatorios en este dispositivo.' }, 404);

  try {
    const vapid = configureWebPush();
    webPush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
    await webPush.sendNotification(subscription, JSON.stringify({
      title: 'TurnoFly · Prueba',
      body: 'Las notificaciones del sistema están funcionando en este dispositivo.',
      tag: 'turnofly-push-test',
      icon: '/icons/turnofly-192.png',
      badge: '/icons/turnofly-32.png',
      vibrate: [180, 90, 180],
    }), { TTL: 300, urgency: 'normal' });
    return json({ status: 'sent' });
  } catch (error) {
    if ((error as { statusCode?: number })?.statusCode === 404 || (error as { statusCode?: number })?.statusCode === 410) {
      await context.admin.from('shift_push_subscriptions').delete().eq('id', data.id);
    }
    return json({ error: 'No se pudo entregar la notificación de prueba. Revisa el permiso del dispositivo.' }, 502);
  }
}
