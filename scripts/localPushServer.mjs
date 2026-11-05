import dotenv from 'dotenv';
import express from 'express';
import webPush from 'web-push';

dotenv.config({ path: '.env.local' });

const publicKey = process.env.TURNOFLY_VAPID_PUBLIC_KEY;
const privateKey = process.env.TURNOFLY_VAPID_PRIVATE_KEY;
const port = Number(process.env.TURNOFLY_LOCAL_PUSH_PORT || 3101);

if (!publicKey || !privateKey) {
  process.stderr.write('Faltan claves VAPID. Ejecuta npm run setup:push-local y reinicia este servidor.\n');
  process.exit(1);
}

webPush.setVapidDetails('mailto:notifications@turnofly.local', publicKey, privateKey);

const app = express();
const subscriptions = new Map();
const scheduledReminders = new Map();

app.use(express.json({ limit: '1mb' }));

const isValidSubscription = (value) => {
  if (!value || typeof value !== 'object') return false;
  if (typeof value.endpoint !== 'string' || value.endpoint.length > 4096) return false;
  if (!value.endpoint.startsWith('https://')) return false;
  return typeof value.keys?.p256dh === 'string' && typeof value.keys?.auth === 'string';
};

const getSubscriptionId = (subscription) => subscription.endpoint;

app.get('/__local-push/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.get('/__local-push/config', (_request, response) => {
  response.json({ publicKey });
});

app.post('/__local-push/subscribe', (request, response) => {
  const { userId, subscription } = request.body || {};
  if (typeof userId !== 'string' || userId.length > 200 || !isValidSubscription(subscription)) {
    response.status(400).json({ error: 'La suscripción local no tiene un formato válido.' });
    return;
  }

  subscriptions.set(getSubscriptionId(subscription), { userId, subscription });
  response.json({ status: 'subscribed' });
});

app.post('/__local-push/schedule', (request, response) => {
  const { userId, workerId, subscription, reminders } = request.body || {};
  if (
    typeof userId !== 'string' ||
    typeof workerId !== 'string' ||
    !isValidSubscription(subscription) ||
    !Array.isArray(reminders) ||
    reminders.length > 5000
  ) {
    response.status(400).json({ error: 'La programación local no tiene un formato válido.' });
    return;
  }

  const endpoint = getSubscriptionId(subscription);
  const registered = subscriptions.get(endpoint);
  if (!registered || registered.userId !== userId) {
    response.status(403).json({ error: 'La suscripción no pertenece a esta sesión local.' });
    return;
  }

  for (const [key, scheduled] of scheduledReminders) {
    if (scheduled.endpoint === endpoint) scheduledReminders.delete(key);
  }

  const now = Date.now();
  reminders.forEach((reminder) => {
    if (
      !reminder ||
      typeof reminder.id !== 'string' ||
      reminder.id.length > 300 ||
      typeof reminder.title !== 'string' ||
      typeof reminder.body !== 'string' ||
      !Number.isFinite(reminder.dueAt) ||
      reminder.dueAt <= now
    ) return;

    const key = `${endpoint}:${reminder.id}`;
    scheduledReminders.set(key, {
      endpoint,
      dueAt: reminder.dueAt,
      payload: {
        title: reminder.title.slice(0, 120),
        body: reminder.body.slice(0, 500),
        tag: `turnofly-${reminder.id}`.slice(0, 300),
        icon: '/icons/turnofly-192.png',
        badge: '/icons/turnofly-32.png',
        vibrate: [180, 90, 180],
      },
    });
  });

  response.json({ status: 'scheduled', count: reminders.length });
});

app.post('/__local-push/test', async (request, response) => {
  const { userId, subscription } = request.body || {};
  if (typeof userId !== 'string' || !isValidSubscription(subscription)) {
    response.status(400).json({ error: 'La solicitud de prueba no tiene un formato válido.' });
    return;
  }

  const registered = subscriptions.get(getSubscriptionId(subscription));
  if (!registered || registered.userId !== userId) {
    response.status(403).json({ error: 'La suscripción no pertenece a esta sesión local.' });
    return;
  }

  try {
    await webPush.sendNotification(
      subscription,
      JSON.stringify({
        title: 'TurnoFly · Prueba',
        body: 'Las notificaciones del sistema están funcionando en este dispositivo.',
        tag: 'turnofly-push-test',
        icon: '/icons/turnofly-192.png',
        badge: '/icons/turnofly-32.png',
        vibrate: [180, 90, 180],
      }),
      { TTL: 300, urgency: 'normal' }
    );
    response.json({ status: 'sent' });
  } catch (error) {
    const statusCode = error?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      subscriptions.delete(getSubscriptionId(subscription));
    }
    process.stderr.write(`No se pudo enviar la notificación local (HTTP ${statusCode || 'error'}).\n`);
    response.status(502).json({ error: 'El servicio push no pudo entregar la notificación de prueba.' });
  }
});

const deliverDueReminders = async () => {
  const now = Date.now();
  const due = [...scheduledReminders.entries()].filter(([, item]) => item.dueAt <= now);

  for (const [key, item] of due) {
    scheduledReminders.delete(key);
    const registered = subscriptions.get(item.endpoint);
    if (!registered) continue;

    try {
      await webPush.sendNotification(
        registered.subscription,
        JSON.stringify(item.payload),
        { TTL: 300, urgency: 'normal' }
      );
    } catch (error) {
      const statusCode = error?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        subscriptions.delete(item.endpoint);
        for (const [scheduledKey, scheduled] of scheduledReminders) {
          if (scheduled.endpoint === item.endpoint) scheduledReminders.delete(scheduledKey);
        }
      }
      process.stderr.write(`No se pudo entregar un recordatorio local (HTTP ${statusCode || 'error'}).\n`);
    }
  }
};

setInterval(() => void deliverDueReminders(), 5000);

app.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Servidor local de notificaciones activo en http://127.0.0.1:${port}.\n`);
});
