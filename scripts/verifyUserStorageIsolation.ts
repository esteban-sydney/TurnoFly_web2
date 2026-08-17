import assert from 'node:assert/strict';
import { createUserStorage } from '../src/utils/storage';
import { clearPendingAuthEmail, getPendingAuthEmail, savePendingAuthEmail } from '../src/utils/pendingAuth';
import type { HorarioEvidence, PersonalEvent, WorkerProfile } from '../src/types';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
});

const legacyEvent: PersonalEvent = {
  id: 'event-owner-a',
  title: 'Cita privada A',
  type: 'medical',
  date: '2026-08-20',
  startTime: '10:00',
  endTime: '11:00',
  reminderMinutes: 30,
};

const userBEvent: PersonalEvent = {
  id: 'event-owner-b',
  title: 'Cita privada B',
  type: 'family',
  date: '2026-08-21',
  startTime: '12:00',
  endTime: '13:00',
  reminderMinutes: 15,
};

const legacyWorkers: WorkerProfile[] = [
  {
    id: 'worker-owner-a',
    name: 'Trabajador A',
    shifts: {},
  },
];

const legacyEvidence: HorarioEvidence[] = [
  {
    id: 'evidence-owner-a',
    fileName: 'evidencia-a.pdf',
    fileSizeMb: 1,
    fileType: 'pdf',
    uploadDate: '17 ago 2026',
    storageKey: 'evidence-owner-a',
  },
];

localStorage.setItem('turnofly_events_v1', JSON.stringify([legacyEvent]));
localStorage.setItem('turnofly_workers_v1', JSON.stringify(legacyWorkers));
localStorage.setItem('turnofly_evidence_v1', JSON.stringify(legacyEvidence));

const userA = createUserStorage('user-a');
assert.deepEqual(userA.getEvents(), []);
assert.deepEqual(userA.getWorkers(), []);
assert.deepEqual(userA.getEvidence(), []);
assert.deepEqual(JSON.parse(localStorage.getItem('turnofly_events_v1') || '[]'), [legacyEvent]);
assert.deepEqual(JSON.parse(localStorage.getItem('turnofly_workers_v1') || '[]'), legacyWorkers);
assert.deepEqual(JSON.parse(localStorage.getItem('turnofly_evidence_v1') || '[]'), legacyEvidence);

userA.saveEvents([legacyEvent]);
userA.saveWorkers(legacyWorkers);
userA.saveEvidence(legacyEvidence);

const userB = createUserStorage('user-b');
assert.deepEqual(userB.getEvents(), []);
assert.deepEqual(userB.getWorkers(), []);
assert.deepEqual(userB.getEvidence(), []);

userB.saveEvents([userBEvent]);
assert.deepEqual(userA.getEvents(), [legacyEvent]);
assert.deepEqual(userB.getEvents(), [userBEvent]);

userA.resetFullApp();
assert.deepEqual(userA.getEvents(), []);
assert.deepEqual(userB.getEvents(), [userBEvent]);

savePendingAuthEmail(' Usuario@Correo.cl ');
assert.equal(getPendingAuthEmail(), 'usuario@correo.cl');
clearPendingAuthEmail();
assert.equal(getPendingAuthEmail(), null);

console.log('Aislamiento local y continuidad OTP verificados por usuario OK.');
