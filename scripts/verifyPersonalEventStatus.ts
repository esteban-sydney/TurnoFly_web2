import assert from 'node:assert/strict';
import {
  getPersonalEventDateRange,
  getPersonalEventStatus,
} from '../src/utils/personalEventStatus';

const event = {
  date: '2026-08-24',
  startTime: '20:00',
  endTime: '21:00',
};

assert.equal(getPersonalEventStatus(event, new Date(2026, 7, 24, 19, 59)), 'upcoming');
assert.equal(getPersonalEventStatus(event, new Date(2026, 7, 24, 20, 30)), 'ongoing');
assert.equal(getPersonalEventStatus(event, new Date(2026, 7, 24, 21, 0)), 'completed');
assert.equal(getPersonalEventStatus(event, new Date(2026, 7, 25, 8, 0)), 'completed');

const overnightEvent = {
  date: '2026-08-24',
  startTime: '23:30',
  endTime: '01:00',
};
const overnightRange = getPersonalEventDateRange(overnightEvent);

assert.ok(overnightRange);
assert.equal(overnightRange.end.getDate(), 25);
assert.equal(
  getPersonalEventStatus(overnightEvent, new Date(2026, 7, 25, 0, 30)),
  'ongoing'
);
assert.equal(
  getPersonalEventStatus(overnightEvent, new Date(2026, 7, 25, 1, 0)),
  'completed'
);

assert.equal(
  getPersonalEventStatus(
    { date: 'fecha-invalida', startTime: '20:00', endTime: '21:00' },
    Date.now()
  ),
  'upcoming',
  'Los datos antiguos inválidos no deben desaparecer de Inicio automáticamente.'
);

console.log('Estados de citas verificados: próximas, en curso, finalizadas y nocturnas OK.');
