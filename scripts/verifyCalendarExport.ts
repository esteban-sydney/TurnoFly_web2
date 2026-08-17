import assert from 'node:assert/strict';
import { buildCalendarFile, buildGoogleCalendarUrl } from '../src/utils/calendarExport';

const event = {
  id: 'appointment-reminder-test',
  title: 'Control medico',
  date: '2026-08-31',
  startTime: '10:00',
  endTime: '11:00',
  reminderMinutes: 30,
  notes: 'Llegar con anticipacion',
};

const calendarFile = buildCalendarFile(event);
const googleUrl = new URL(buildGoogleCalendarUrl(event));

assert.match(calendarFile, /BEGIN:VALARM/);
assert.match(calendarFile, /TRIGGER:-PT30M/);
assert.match(calendarFile, /ACTION:DISPLAY/);
assert.match(calendarFile, /SUMMARY:Control medico/);
assert.equal(googleUrl.hostname, 'calendar.google.com');
assert.equal(googleUrl.searchParams.get('text'), event.title);

console.log('Calendario verificado: el archivo ICS incluye la cita y su recordatorio previo.');
