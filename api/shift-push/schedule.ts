import { authenticateRequest, isResponse, json, parseSubscription, saveSubscription } from '../../src/server/shiftPush';

interface ReminderInput {
  id: string;
  dueAt: number;
  title: string;
  body: string;
  kind: 'entry' | 'exit';
  shiftDate: string;
}

function validateReminders(value: unknown): ReminderInput[] | undefined {
  if (!Array.isArray(value) || value.length > 2000) return undefined;
  const now = Date.now();
  const reminders: ReminderInput[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return undefined;
    const reminder = item as Partial<ReminderInput>;
    if (
      typeof reminder.id !== 'string' || reminder.id.length > 300 ||
      typeof reminder.title !== 'string' || reminder.title.length > 120 ||
      typeof reminder.body !== 'string' || reminder.body.length > 500 ||
      typeof reminder.dueAt !== 'number' || !Number.isFinite(reminder.dueAt) ||
      reminder.dueAt <= now || reminder.dueAt > now + 370 * 24 * 60 * 60 * 1000 ||
      (reminder.kind !== 'entry' && reminder.kind !== 'exit') ||
      typeof reminder.shiftDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(reminder.shiftDate)
    ) return undefined;
    reminders.push(reminder as ReminderInput);
  }
  return reminders;
}

export async function POST(request: Request): Promise<Response> {
  const context = await authenticateRequest(request);
  if (isResponse(context)) return context;

  const body = await request.json().catch(() => null) as {
    subscription?: unknown;
    workerId?: unknown;
    reminders?: unknown;
  } | null;
  const subscription = parseSubscription(body?.subscription);
  const reminders = validateReminders(body?.reminders);
  if (!subscription || !Array.isArray(body?.reminders) || !reminders || typeof body?.workerId !== 'string' || body.workerId.length > 200) {
    return json({ error: 'La programación de recordatorios tiene un formato no válido.' }, 400);
  }

  try {
    const subscriptionId = await saveSubscription(context.admin, context.user.id, subscription);
    const schedule = reminders.map((reminder) => ({
      reminder_key: reminder.id,
      due_at: new Date(reminder.dueAt).toISOString(),
      payload: {
        title: reminder.title,
        body: reminder.body,
        tag: `turnofly-${reminder.id}`.slice(0, 300),
        icon: '/icons/turnofly-192.png',
        badge: '/icons/turnofly-32.png',
        vibrate: [180, 90, 180],
      },
    }));
    const { error } = await context.admin.rpc('replace_shift_push_schedule', {
      p_user_id: context.user.id,
      p_subscription_id: subscriptionId,
      p_worker_id: body.workerId,
      p_reminders: schedule,
    });
    if (error) throw new Error('No se pudo actualizar la programación de recordatorios.');
    return json({ status: 'scheduled', count: reminders.length });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'No se pudo guardar la programación.' }, 500);
  }
}
