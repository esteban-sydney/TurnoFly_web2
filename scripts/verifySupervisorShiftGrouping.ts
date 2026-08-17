import assert from 'node:assert/strict';
import type { DayShift, WorkerProfile } from '../src/types';
import {
  findSimilarWorkerNames,
  groupWorkersForSupervisorDate,
} from '../src/utils/supervisorShiftGrouping';
import { consolidateWorkersByIdentity, getWorkerIdentityKey } from '../src/utils/workerImportMerge';

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
    shifts: { [date]: shift('L', 'off', false) },
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
  {
    id: 'nombre-ambiguo',
    name: 'Felipe Andrés Muñoz',
    shifts: {},
  },
];

assert.equal(getWorkerIdentityKey('Felipe Muñoz Aguirre'), 'felipe munoz');
assert.equal(getWorkerIdentityKey('  FÉLIPE   MUÑOZ  '), 'felipe munoz');

const consolidated = consolidateWorkersByIdentity(workers);
assert.equal(consolidated.workers.length, 4);
assert.equal(consolidated.idAliases.get('felipe-abreviado'), 'felipe-completo');
assert.equal(consolidated.workers[0].name, 'Felipe Muñoz Aguirre');
assert.equal(consolidated.workers[0].shifts[date].rawCode, 'M');

const incompleteNames = consolidateWorkersByIdentity([
  { id: 'sol-1', name: 'Sol', shifts: {} },
  { id: 'sol-2', name: 'Sol', shifts: {} },
]);
assert.equal(incompleteNames.workers.length, 2);

const groups = groupWorkersForSupervisorDate(workers, date);
assert.deepEqual(groups.morning.map((item) => item.workerId), ['felipe-completo']);
assert.deepEqual(groups.off.map((item) => item.workerId), ['persona-libre']);
assert.deepEqual(
  groups.unknown.map((item) => item.workerId).sort(),
  ['dato-inconsistente', 'nombre-ambiguo']
);

const allGroupedIds = Object.values(groups).flat().map((item) => item.workerId);
assert.equal(new Set(allGroupedIds).size, consolidated.workers.length);
assert.equal(allGroupedIds.length, consolidated.workers.length);
assert.equal(allGroupedIds.includes('felipe-abreviado'), false);

const similarNames = findSimilarWorkerNames(workers);
assert.equal(similarNames.length, 1);
assert.equal(similarNames[0].first.id, 'felipe-abreviado');
assert.equal(similarNames[0].second.id, 'nombre-ambiguo');

console.log('Jefatura verificada: identidad, turnos superpuestos y nombres ambiguos se resuelven sin duplicar personas.');
