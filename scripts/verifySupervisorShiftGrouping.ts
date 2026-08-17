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
    id: 'persona-alfa-completa',
    name: 'Persona Alfa Principal',
    shifts: { [date]: shift('M', 'morning', true) },
  },
  {
    id: 'persona-alfa-abreviada',
    name: 'Persona Alfa',
    shifts: { [date]: shift('L', 'off', false) },
  },
  {
    id: 'persona-libre',
    name: 'Persona Beta',
    shifts: { [date]: shift('L', 'off', false) },
  },
  {
    id: 'dato-inconsistente',
    name: 'Persona Gamma',
    shifts: { [date]: shift('M', 'morning', false) },
  },
  {
    id: 'nombre-ambiguo',
    name: 'Persona Distinta Alfa',
    shifts: {},
  },
];

assert.equal(getWorkerIdentityKey('Persona Alfa Principal'), 'persona alfa');
assert.equal(getWorkerIdentityKey('  PERSONA   ÁLFA  '), 'persona alfa');

const consolidated = consolidateWorkersByIdentity(workers);
assert.equal(consolidated.workers.length, 4);
assert.equal(consolidated.idAliases.get('persona-alfa-abreviada'), 'persona-alfa-completa');
assert.equal(consolidated.workers[0].name, 'Persona Alfa Principal');
assert.equal(consolidated.workers[0].shifts[date].rawCode, 'M');

const incompleteNames = consolidateWorkersByIdentity([
  { id: 'sol-1', name: 'Sol', shifts: {} },
  { id: 'sol-2', name: 'Sol', shifts: {} },
]);
assert.equal(incompleteNames.workers.length, 2);

const groups = groupWorkersForSupervisorDate(workers, date);
assert.deepEqual(groups.morning.map((item) => item.workerId), ['persona-alfa-completa']);
assert.deepEqual(groups.off.map((item) => item.workerId), ['persona-libre']);
assert.deepEqual(
  groups.unknown.map((item) => item.workerId).sort(),
  ['dato-inconsistente', 'nombre-ambiguo']
);

const allGroupedIds = Object.values(groups).flat().map((item) => item.workerId);
assert.equal(new Set(allGroupedIds).size, consolidated.workers.length);
assert.equal(allGroupedIds.length, consolidated.workers.length);
assert.equal(allGroupedIds.includes('persona-alfa-abreviada'), false);

const similarNames = findSimilarWorkerNames(workers);
assert.equal(similarNames.length, 1);
assert.equal(similarNames[0].first.id, 'persona-alfa-abreviada');
assert.equal(similarNames[0].second.id, 'nombre-ambiguo');

console.log('Jefatura verificada: identidad, turnos superpuestos y nombres ambiguos se resuelven sin duplicar personas.');
