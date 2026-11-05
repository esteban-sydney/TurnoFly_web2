import type { Language, ShiftCodeDefinition, WorkerProfile } from '../types';
import { getTranslation } from './i18n';

export interface ScheduledShiftReminder {
  id: string;
  dueAt: number;
  title: string;
  body: string;
  kind: 'entry' | 'exit';
  shiftDate: string;
}

const REMINDER_OFFSET_MS = 10 * 60 * 1000;

function localDateTime(date: string, time: string): Date | undefined {
  const dateParts = date.split('-').map(Number);
  const timeParts = time.match(/^(\d{1,2}):([0-5]\d)$/);
  if (dateParts.length !== 3 || !timeParts) return undefined;

  const [year, month, day] = dateParts;
  const hour = Number(timeParts[1]);
  const minute = Number(timeParts[2]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31 || hour > 24) return undefined;
  if (hour === 24 && minute !== 0) return undefined;

  return hour === 24
    ? new Date(year, month - 1, day + 1, 0, 0, 0, 0)
    : new Date(year, month - 1, day, hour, minute, 0, 0);
}

function fillTemplate(template: string, code: string, time: string): string {
  return template.replace('{code}', code).replace('{time}', time);
}

export function buildShiftReminders(
  worker: WorkerProfile | undefined,
  definitions: Record<string, ShiftCodeDefinition>,
  language: Language,
  now = Date.now()
): ScheduledShiftReminder[] {
  if (!worker) return [];

  const title = getTranslation(language, 'shiftNotificationTitle') as string;
  const reminders: ScheduledShiftReminder[] = [];

  Object.entries(worker.shifts || {}).forEach(([date, shift]) => {
    const code = shift.rawCode?.trim().toUpperCase();
    if (!code || !shift.isWorkDay) return;

    const definition = definitions[code];
    if (!definition && (!shift.startTime || !shift.endTime)) return;

    const startTime = shift.startTime || definition?.defaultStartTime || '';
    const endTime = shift.endTime || definition?.defaultEndTime || '';
    if (!startTime || !endTime) return;

    const start = localDateTime(date, startTime);
    const end = localDateTime(date, endTime);
    if (!start || !end) return;

    if (end.getTime() <= start.getTime()) {
      end.setDate(end.getDate() + 1);
    }

    const entryDueAt = start.getTime() - REMINDER_OFFSET_MS;
    if (entryDueAt > now) {
      reminders.push({
        id: `${worker.id}:${date}:entry`,
        dueAt: entryDueAt,
        title,
        body: fillTemplate(
          getTranslation(language, 'shiftReminderEntryBody') as string,
          code,
          startTime
        ),
        kind: 'entry',
        shiftDate: date,
      });
    }

    const exitDueAt = end.getTime() + REMINDER_OFFSET_MS;
    if (exitDueAt > now) {
      reminders.push({
        id: `${worker.id}:${date}:exit`,
        dueAt: exitDueAt,
        title,
        body: fillTemplate(
          getTranslation(language, 'shiftReminderExitBody') as string,
          code,
          endTime
        ),
        kind: 'exit',
        shiftDate: date,
      });
    }
  });

  return reminders.sort((left, right) => left.dueAt - right.dueAt);
}
