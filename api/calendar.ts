import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildCalendarFile, type CalendarExportEvent } from '../src/utils/calendarExport';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

function cleanText(value: string | null, maxLength: number): string {
  return (value || '').replace(/[\r\n\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength);
}

function parseReminder(value: string | null): number {
  const parsed = Number.parseInt(value || '30', 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 43_200) : 30;
}

export default function handler(request: IncomingMessage, response: ServerResponse): void {
  if (request.method !== 'GET') {
    response.statusCode = 405;
    response.setHeader('Allow', 'GET');
    response.end('Method not allowed');
    return;
  }

  const requestUrl = new URL(request.url || '/', 'https://turnofly.invalid');
  const title = cleanText(requestUrl.searchParams.get('title'), 160);
  const date = requestUrl.searchParams.get('date') || '';
  const startTime = requestUrl.searchParams.get('start') || '';
  const endTime = requestUrl.searchParams.get('end') || '';

  if (!title || !isValidDate(date) || !TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
    response.statusCode = 400;
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.end('Datos de calendario no validos.');
    return;
  }

  const event: CalendarExportEvent = {
    id: cleanText(requestUrl.searchParams.get('id'), 120) || undefined,
    title,
    date,
    startTime,
    endTime,
    reminderMinutes: parseReminder(requestUrl.searchParams.get('reminder')),
    notes: '',
  };

  try {
    const calendarFile = buildCalendarFile(event);
    const fileName = `TurnoFly_cita_${date}.ics`;

    response.statusCode = 200;
    response.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    response.setHeader('Cache-Control', 'private, no-store, max-age=0');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.end(calendarFile);
  } catch {
    response.statusCode = 400;
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.end('No se pudo generar el calendario.');
  }
}
