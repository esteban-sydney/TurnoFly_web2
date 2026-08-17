const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function cleanText(value: string | null, maxLength: number): string {
  return (value || '').replace(/[\r\n\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength);
}

function escapeCalendarText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function parseReminder(value: string | null): number {
  const parsed = Number.parseInt(value || '30', 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 43_200) : 30;
}

function formatCalendarDateTime(date: string, time: string): string {
  return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
}

function getNextDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
  return [
    nextDate.getUTCFullYear(),
    String(nextDate.getUTCMonth() + 1).padStart(2, '0'),
    String(nextDate.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function formatUtcDateTime(value: Date): string {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function GET(request: Request): Response {
  const requestUrl = new URL(request.url);
  const title = cleanText(requestUrl.searchParams.get('title'), 160);
  const date = requestUrl.searchParams.get('date') || '';
  const startTime = requestUrl.searchParams.get('start') || '';
  const endTime = requestUrl.searchParams.get('end') || '';

  if (!title || !isValidDate(date) || !TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
    return new Response('Datos de calendario no validos.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const reminderMinutes = parseReminder(requestUrl.searchParams.get('reminder'));
  const eventId =
    cleanText(requestUrl.searchParams.get('id'), 120) ||
    `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const endDate = endTime <= startTime ? getNextDate(date) : date;
  const calendarFile = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TurnoFly//Calendario Personal//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeCalendarText(eventId)}@turnofly`,
    `DTSTAMP:${formatUtcDateTime(new Date())}`,
    `DTSTART:${formatCalendarDateTime(date, startTime)}`,
    `DTEND:${formatCalendarDateTime(endDate, endTime)}`,
    `SUMMARY:${escapeCalendarText(title)}`,
    'DESCRIPTION:Creado en TurnoFly',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    `TRIGGER:-PT${reminderMinutes}M`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeCalendarText(`Recordatorio: ${title}`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
  const fileName = `TurnoFly_cita_${date}.ics`;

  return new Response(calendarFile, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
