import assert from 'node:assert/strict';
import type { PersonalEvent, WorkerProfile } from '../src/types';
import {
  assignUnassignedEventsToWorker,
  getEventsForWorker,
  reconcileEventWorkerReferences,
} from '../src/utils/personalEventOwnership';

const workerAlpha: WorkerProfile = {
  id: 'worker-alpha',
  name: 'Persona Alfa Principal',
  shifts: {},
};

const workerBeta: WorkerProfile = {
  id: 'worker-beta',
  name: 'Persona Beta Secundaria',
  shifts: {},
};

const baseEvent = {
  type: 'medical' as const,
  date: '2026-08-24',
  startTime: '10:00',
  endTime: '11:00',
  reminderMinutes: 30,
};

const eventAlpha: PersonalEvent = {
  ...baseEvent,
  id: 'event-alpha',
  workerId: workerAlpha.id,
  workerNameSnapshot: workerAlpha.name,
  title: 'Cita de Alfa',
};

const eventBeta: PersonalEvent = {
  ...baseEvent,
  id: 'event-beta',
  workerId: workerBeta.id,
  workerNameSnapshot: workerBeta.name,
  title: 'Cita de Beta',
};

const legacyEvent: PersonalEvent = {
  ...baseEvent,
  id: 'event-legacy',
  title: 'Cita anterior sin trabajador',
};

const events = [eventAlpha, eventBeta, legacyEvent];
assert.deepEqual(getEventsForWorker(events, workerAlpha.id), [eventAlpha]);
assert.deepEqual(getEventsForWorker(events, workerBeta.id), [eventBeta]);
assert.deepEqual(getEventsForWorker(events, undefined), []);

const assigned = assignUnassignedEventsToWorker(events, workerAlpha);
assert.equal(assigned.find((event) => event.id === legacyEvent.id)?.workerId, workerAlpha.id);
assert.equal(
  assigned.find((event) => event.id === legacyEvent.id)?.workerNameSnapshot,
  workerAlpha.name
);
assert.equal(getEventsForWorker(assigned, workerAlpha.id).length, 2);
assert.equal(getEventsForWorker(assigned, workerBeta.id).length, 1);

const aliasedEvent: PersonalEvent = {
  ...eventAlpha,
  workerId: 'worker-alpha-imported-row',
};
const reconciledAlias = reconcileEventWorkerReferences(
  [aliasedEvent],
  [workerAlpha, workerBeta],
  new Map([['worker-alpha-imported-row', workerAlpha.id]])
);
assert.equal(reconciledAlias[0].workerId, workerAlpha.id);

const restoredByName: PersonalEvent = {
  ...eventBeta,
  workerId: 'worker-beta-deleted-import',
};
const reconciledByName = reconcileEventWorkerReferences(
  [restoredByName],
  [workerAlpha, workerBeta]
);
assert.equal(reconciledByName[0].workerId, workerBeta.id);

console.log(
  'Agendas verificadas: creación, migración y cambio de trabajador mantienen las citas separadas.'
);
