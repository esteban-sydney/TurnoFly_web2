import assert from 'node:assert/strict';
import { createUserStorage } from '../src/utils/storage';
import type { PersonalEvent, WorkerProfile } from '../src/types';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: new MemoryStorage(),
});

const worker: WorkerProfile = {
  id: 'worker-1',
  name: 'Persona Prueba',
  shifts: {
    '2026-08-17': {
      date: '2026-08-17',
      rawCode: 'T',
      category: 'afternoon',
      startTime: '16:00',
      endTime: '24:00',
      isWorkDay: true,
    },
  },
  referenceMonth: 8,
  referenceYear: 2026,
};

const event: PersonalEvent = {
  id: 'event-1',
  title: 'Control médico',
  type: 'medical',
  date: '2026-08-18',
  startTime: '10:00',
  endTime: '11:00',
  reminderMinutes: 30,
};

const sourceStorage = createUserStorage('source-user');
sourceStorage.saveWorkers([worker]);
sourceStorage.saveEvents([event]);
const backup = sourceStorage.exportBackupData();

const targetStorage = createUserStorage('target-user');
assert.equal(targetStorage.importBackupData(backup), true);
assert.deepEqual(targetStorage.getWorkers(), [worker]);
assert.deepEqual(targetStorage.getEvents(), [event]);

const workersBeforeInvalidImport = targetStorage.getWorkers();
const malformedBackup = JSON.stringify({
  workers: [{ id: 'broken', name: 'Sin turnos', shifts: [] }],
  events: [],
});
assert.equal(targetStorage.importBackupData(malformedBackup), false);
assert.deepEqual(targetStorage.getWorkers(), workersBeforeInvalidImport);

const unsafeBackup = '{"settings":{"__proto__":{"polluted":true}}}';
const originalConsoleError = console.error;
try {
  console.error = () => undefined;
  assert.equal(targetStorage.importBackupData(unsafeBackup), false);
} finally {
  console.error = originalConsoleError;
}
assert.equal((Object.prototype as { polluted?: boolean }).polluted, undefined);

assert.equal(targetStorage.importBackupData('{"unknown":true}'), false);

console.log('Respaldos verificados: importación válida, rechazo atómico y claves inseguras bloqueadas.');
