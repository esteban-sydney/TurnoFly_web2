import assert from 'node:assert/strict';
import type { DayShift, WorkerProfile } from '../src/types';
import {
  findSimilarWorkerNames,
  groupWorkersForSupervisorDate,
} from '../src/utils/supervisorShiftGrouping';

const date = '2026-08-18';

const shift = (
  rawCode: string,
  category: DayShift['category'],
  isWorkDay: boolean
): DayShift => ({
  date,
  rawCode,
  category,
  isWorkDay,
});

const workers: WorkerProfile[] = [
  {
    id: 'felipe-completo',
    name: 'Felipe Muñoz Aguirre',
    shifts: { [date]: shift('M', 'morning', true) },
  },
  {
    id: 'felipe-abreviado',
    name: 'Felipe Muñoz',
    shifts: {},
  },
  {
    id: 'persona-libre',
    name: 'Camila Soto',
    shifts: { [date]: shift('L', 'off', false) },
  },
  {
    id: 'dato-inconsistente',
    name: 'Daniel Pérez',
    shifts: { [date]: shift('M', 'morning', false) },
  },
];

const groups = groupWorkersForSupervisorDate(workers, date);
assert.deepEqual(groups.morning.map((item) => item.workerId), ['felipe-completo']);
assert.deepEqual(groups.off.map((item) => item.workerId), ['persona-libre']);
assert.deepEqual(
  groups.unknown.map((item) => item.workerId).sort(),
  ['dato-inconsistente', 'felipe-abreviado']
);

const allGroupedIds = Object.values(groups).flat().map((item) => item.workerId);
assert.equal(new Set(allGroupedIds).size, workers.length);
assert.equal(allGroupedIds.length, workers.length);

const similarNames = findSimilarWorkerNames(workers);
assert.equal(similarNames.length, 1);
assert.equal(similarNames[0].first.id, 'felipe-completo');
assert.equal(similarNames[0].second.id, 'felipe-abreviado');

console.log('Jefatura verificada: libre, trabajando, sin información y nombres similares no se mezclan.');
