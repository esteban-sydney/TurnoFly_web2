import { PersonalEvent } from '../types';

export type CalendarExportEvent = Pick<
  PersonalEvent,
  'title' | 'date' | 'startTime' | 'endTime' | 'reminderMinutes' | 'notes'
> & { id?: string };

function escapeCalendarText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function formatLocalDateTime(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}00`;
}

function formatUtcDateTime(value: Date): string {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function createEventDate(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

function getEventDateRange(event: CalendarExportEvent): { start: Date; end: Date } {
  const start = createEventDate(event.date, event.startTime);
  const end = createEventDate(event.date, event.endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('La fecha u hora de la cita no es válida.');
  }

  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
}

function getEventDescription(event: CalendarExportEvent): string {
  return event.notes?.trim()
    ? `${event.notes.trim()}\n\nCreado en TurnoFly`
    : 'Creado en TurnoFly';
}

function safeFileName(value: string): string {
  const normalized = value.trim().replace(/[<>:"/\\|?*]+/g, '-').replace(/\s+/g, '_');
  return normalized || 'cita';
}

export function buildCalendarFile(event: CalendarExportEvent): string {
  const { start, end } = getEventDateRange(event);

  const uidSource = event.id || `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const description = getEventDescription(event);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TurnoFly//Calendario Personal//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeCalendarText(uidSource)}@turnofly`,
    `DTSTAMP:${formatUtcDateTime(new Date())}`,
    `DTSTART:${formatLocalDateTime(start)}`,
    `DTEND:${formatLocalDateTime(end)}`,
    `SUMMARY:${escapeCalendarText(event.title)}`,
    `DESCRIPTION:${escapeCalendarText(description)}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    `TRIGGER:-PT${Math.max(0, event.reminderMinutes)}M`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeCalendarText(`Recordatorio: ${event.title}`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export function buildGoogleCalendarUrl(event: CalendarExportEvent): string {
  const { start, end } = getEventDateRange(event);
  const calendarUrl = new URL('https://calendar.google.com/calendar/render');

  calendarUrl.searchParams.set('action', 'TEMPLATE');
  calendarUrl.searchParams.set('text', event.title);
  calendarUrl.searchParams.set(
    'dates',
    `${formatUtcDateTime(start)}/${formatUtcDateTime(end)}`
  );
  calendarUrl.searchParams.set('details', getEventDescription(event));

  return calendarUrl.toString();
}

export async function addToDeviceCalendar(
  event: CalendarExportEvent
): Promise<'shared' | 'downloaded'> {
  const calendarContent = buildCalendarFile(event);
  const fileName = `TurnoFly_${safeFileName(event.title)}_${event.date}.ics`;
  const file = new File([calendarContent], fileName, {
    type: 'text/calendar;charset=utf-8',
  });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: `Agregar ${event.title} al calendario`,
      text: `Cita ${event.date} a las ${event.startTime}`,
      files: [file],
    });
    return 'shared';
  }

  const downloadUrl = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  return 'downloaded';
}
