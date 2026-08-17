import assert from 'node:assert/strict';
import type { WorkerProfile } from '../src/types';
import { COMMON_SHIFT_DEFINITIONS, syncWorkersShiftTimes } from '../src/utils/excelParser';
import {
  fromTimeInputValue,
  hasCustomShiftHours,
  toTimeInputValue,
} from '../src/utils/shiftTime';

assert.equal(toTimeInputValue('24:00'), '00:00');
assert.equal(toTimeInputValue('20:00'), '20:00');
assert.equal(fromTimeInputValue('00:00', '24:00'), '24:00');
assert.equal(fromTimeInputValue('20:00', '24:00'), '20:00');

const workers: WorkerProfile[] = [
  {
    id: 'worker-custom-shift',
    name: 'Persona Prueba',
    shifts: {
      '2026-08-27': {
        date: '2026-08-27',
        rawCode: 'M',
        category: 'morning',
        startTime: '08:00',
        endTime: '20:00',
        isWorkDay: true,
        editedManually: true,
      },
      '2026-08-28': {
        date: '2026-08-28',
        rawCode: 'M',
        category: 'morning',
        startTime: '07:00',
        endTime: '15:00',
        isWorkDay: true,
      },
    },
  },
];

const syncedWorkers = syncWorkersShiftTimes(workers);
const customShift = syncedWorkers[0].shifts['2026-08-27'];
const standardShift = syncedWorkers[0].shifts['2026-08-28'];

assert.equal(customShift.startTime, '08:00');
assert.equal(customShift.endTime, '20:00');
assert.equal(standardShift.startTime, COMMON_SHIFT_DEFINITIONS.M.defaultStartTime);
assert.equal(standardShift.endTime, COMMON_SHIFT_DEFINITIONS.M.defaultEndTime);
assert.equal(hasCustomShiftHours(customShift, COMMON_SHIFT_DEFINITIONS.M), true);
assert.equal(hasCustomShiftHours(standardShift, COMMON_SHIFT_DEFINITIONS.M), false);

console.log('Edicion de turnos verificada: medianoche, horarios personalizados y recarga conservan sus valores.');
