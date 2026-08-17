import assert from 'node:assert/strict';
import { GET as getCalendarFile } from '../api/calendar.ics';
import {
  buildCalendarFile,
  buildDeviceCalendarUrl,
  buildGoogleCalendarUrl,
  getSuggestedEventEndTime,
} from '../src/utils/calendarExport';

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
const deviceUrl = new URL(buildDeviceCalendarUrl(event, 'https://turnofly.vercel.app'));

assert.match(calendarFile, /BEGIN:VALARM/);
assert.match(calendarFile, /TRIGGER:-PT30M/);
assert.match(calendarFile, /ACTION:DISPLAY/);
assert.match(calendarFile, /SUMMARY:Control medico/);
assert.equal(googleUrl.hostname, 'calendar.google.com');
assert.equal(googleUrl.searchParams.get('text'), event.title);
assert.equal(deviceUrl.origin, 'https://turnofly.vercel.app');
assert.equal(deviceUrl.pathname, '/api/calendar.ics');
assert.equal(deviceUrl.searchParams.get('date'), event.date);
assert.equal(deviceUrl.searchParams.get('reminder'), '30');
assert.equal(deviceUrl.searchParams.has('notes'), false);
assert.equal(getSuggestedEventEndTime('19:00'), '20:00');
assert.equal(getSuggestedEventEndTime('23:30'), '00:30');
assert.equal(getSuggestedEventEndTime('08:15'), '09:15');

const response = getCalendarFile(new Request(deviceUrl));
const responseBody = await response.text();

assert.equal(response.status, 200);
assert.match(response.headers.get('content-type') || '', /^text\/calendar/);
assert.match(response.headers.get('content-disposition') || '', /^inline;.*\.ics"$/);
assert.match(responseBody, /^BEGIN:VCALENDAR/);
assert.match(responseBody, /SUMMARY:Control medico/);

console.log('Calendario verificado: Google y la ruta HTTPS ICS incluyen la cita y su recordatorio.');
