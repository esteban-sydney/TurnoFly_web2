import assert from 'node:assert/strict';
import type { WorkerProfile } from '../src/types';
import { removeShiftPeriodFromWorkers } from '../src/utils/workerImportMerge';

const workers: WorkerProfile[] = [
  {
    id: 'worker-multi-month',
    name: 'Persona Multimes',
    shifts: {
      '2026-08-10': {
        date: '2026-08-10',
        rawCode: 'M',
        category: 'morning',
        startTime: '08:00',
        endTime: '16:00',
        isWorkDay: true,
      },
      '2026-09-10': {
        date: '2026-09-10',
        rawCode: 'T',
        category: 'afternoon',
        startTime: '16:00',
        endTime: '24:00',
        isWorkDay: true,
      },
    },
    shiftEntries: [
      { code: 'M', category: 'morning', dayNumber: 10, shiftDate: '2026-08-10' },
      { code: 'T', category: 'afternoon', dayNumber: 10, shiftDate: '2026-09-10' },
    ],
    referenceMonth: 9,
    referenceYear: 2026,
  },
  {
    id: 'worker-only-august',
    name: 'Persona Solo Agosto',
    shifts: {
      '2026-08-11': {
        date: '2026-08-11',
        rawCode: 'L',
        category: 'off',
        isWorkDay: false,
      },
    },
    referenceMonth: 8,
    referenceYear: 2026,
  },
];

const remainingWorkers = removeShiftPeriodFromWorkers(workers, 2026, 8);

assert.equal(remainingWorkers.length, 1);
assert.equal(remainingWorkers[0].id, 'worker-multi-month');
assert.deepEqual(Object.keys(remainingWorkers[0].shifts), ['2026-09-10']);
assert.deepEqual(
  remainingWorkers[0].shiftEntries?.map((entry) => entry.shiftDate),
  ['2026-09-10']
);
assert.equal(remainingWorkers[0].referenceMonth, 9);
assert.equal(remainingWorkers[0].referenceYear, 2026);

console.log('Eliminacion selectiva verificada: se quita un mes sin alterar los periodos restantes.');
