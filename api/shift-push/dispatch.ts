import webPush from 'web-push';
import {
  configureWebPush,
  createAdminClient,
  isCronRequestAuthorized,
  json,
} from '../../src/server/shiftPush.js';

interface DueReminder {
  id: string;
  subscription_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  payload: Record<string, unknown>;
  attempts: number;
}

export async function POST(request: Request): Promise<Response> {
  if (!isCronRequestAuthorized(request)) return json({ error: 'No autorizado.' }, 401);

  let admin;
  let vapid;
  try {
    admin = createAdminClient();
    vapid = configureWebPush();
    webPush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'El envío push no está configurado.' }, 503);
  }

  const { data, error } = await admin.rpc('claim_due_shift_push_reminders', { p_limit: 25 });
  if (error) return json({ error: 'No se pudieron consultar los recordatorios pendientes.' }, 500);

  const due = (data || []) as DueReminder[];
  const outcomes = await Promise.all(due.map(async (reminder) => {
    let delivered = false;
    let permanentlyInvalid = false;
    try {
      await webPush.sendNotification({
        endpoint: reminder.endpoint,
        keys: { p256dh: reminder.p256dh, auth: reminder.auth_key },
      }, JSON.stringify(reminder.payload), { TTL: 3600, urgency: 'high' });
      delivered = true;
    } catch (error) {
      const statusCode = (error as { statusCode?: number })?.statusCode;
      permanentlyInvalid = statusCode === 404 || statusCode === 410;
      if (permanentlyInvalid) {
        await admin.from('shift_push_subscriptions').delete().eq('id', reminder.subscription_id);
      }
    }

    if (!permanentlyInvalid) {
      await admin.rpc('finish_shift_push_reminder', {
        p_reminder_id: reminder.id,
        p_delivered: delivered,
        p_retry: !delivered && reminder.attempts < 5,
      });
    }
    return delivered;
  }));

  return json({ processed: due.length, delivered: outcomes.filter(Boolean).length });
}
