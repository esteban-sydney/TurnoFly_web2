import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { detectScheduleConflicts } from '../src/utils/conflictDetector';
import {
  COMMON_SHIFT_DEFINITIONS,
  hydrateShiftDefinitionsFromWorkers,
  parseExcelBuffer,
  syncWorkersShiftTimes,
} from '../src/utils/excelParser';
import {
  assignWorkersToReferencePeriod,
  mergeImportedWorkersForPeriod,
  normalizeWorkerName,
  resolveImportedWorkerId,
} from '../src/utils/workerImportMerge';
import { DayShift, ShiftCategory, WorkerProfile } from '../src/types';

function shift(
  date: string,
  rawCode: string,
  category: ShiftCategory,
  startTime: string,
  endTime: string,
  isWorkDay = true
): DayShift {
  return { date, rawCode, category, startTime, endTime, isWorkDay, isRemote: true };
}

const augustWorkers: WorkerProfile[] = [
  {
    id: 'worker_esteban_stable',
    name: 'Esteban Varas Varela',
    shifts: {
      '2026-08-11': shift('2026-08-11', 'M', 'morning', '07:30', '15:30'),
      '2026-08-12': shift('2026-08-12', 'T', 'afternoon', '15:30', '23:30'),
      '2026-08-31': shift('2026-08-31', 'N', 'night', '22:00', '06:00'),
    },
  },
  {
    id: 'worker_elena_stable',
    name: 'Elena Aguilera',
    shifts: {
      '2026-08-11': shift('2026-08-11', 'M', 'morning', '07:30', '15:30'),
    },
  },
];

const septemberWorkers: WorkerProfile[] = [
  {
    id: 'row_20_esteban',
    name: '  ESTEBAN   VARAS VARELA (Operador / Tecnico) ',
    shifts: {
      '2026-09-01': shift('2026-09-01', 'M', 'morning', '08:00', '16:00'),
      '2026-09-02': shift('2026-09-02', 'T', 'afternoon', '16:00', '24:00'),
      '2026-09-03': shift('2026-09-03', 'N', 'night', '00:00', '08:00'),
    },
  },
  {
    id: 'row_4_carlos',
    name: 'Carlos Silva',
    shifts: {
      '2026-09-01': shift('2026-09-01', 'M', 'morning', '08:00', '16:00'),
    },
  },
];

const merged = mergeImportedWorkersForPeriod(
  augustWorkers,
  septemberWorkers,
  2026,
  9
);

const simplifiedNameMerge = mergeImportedWorkersForPeriod(
  [
    {
      id: 'felipe_stable',
      name: 'Felipe Muñoz Aguirre',
      shifts: {
        '2026-08-11': shift('2026-08-11', 'M', 'morning', '07:30', '15:30'),
      },
    },
  ],
  [
    {
      id: 'felipe_simplified',
      name: 'Felipe Muñoz',
      shifts: {
        '2026-09-01': shift('2026-09-01', 'T', 'afternoon', '16:00', '24:00'),
      },
    },
  ],
  2026,
  9
);

assert.equal(simplifiedNameMerge.length, 1);
assert.equal(simplifiedNameMerge[0].id, 'felipe_stable');
assert.equal(simplifiedNameMerge[0].name, 'Felipe Muñoz Aguirre');
assert.equal(simplifiedNameMerge[0].shifts['2026-08-11'].rawCode, 'M');
assert.equal(simplifiedNameMerge[0].shifts['2026-09-01'].rawCode, 'T');

const stagedAugust = mergeImportedWorkersForPeriod([], augustWorkers, 2026, 8);
const stagedAugustAndSeptember = mergeImportedWorkersForPeriod(
  stagedAugust,
  septemberWorkers,
  2026,
  9
);
const stagedEsteban = stagedAugustAndSeptember.find(
  (worker) => worker.name === 'Esteban Varas Varela'
);

assert.ok(stagedEsteban, 'La finalización conjunta debe conservar al trabajador seleccionado.');
assert.equal(
  stagedEsteban.shifts['2026-08-11'].rawCode,
  'M',
  'Guardar septiembre no debe reemplazar agosto.'
);
assert.equal(
  stagedEsteban.shifts['2026-09-02'].rawCode,
  'T',
  'La finalización debe incluir las letras del segundo mes guardado.'
);
assert.equal(
  stagedEsteban.shifts['2026-09-02'].startTime,
  '15:30',
  'El segundo mes debe heredar el horario definido por el primero.'
);

const septemberSelectedWithDifferentName: WorkerProfile[] = [
  {
    id: 'selected_worker_september',
    name: 'E. Varas',
    shifts: {
      '2026-09-01': shift('2026-09-01', 'T', 'afternoon', '16:00', '24:00'),
    },
  },
];
const explicitlyLinkedSelection = mergeImportedWorkersForPeriod(
  augustWorkers,
  septemberSelectedWithDifferentName,
  2026,
  9,
  {
    selectedImportedWorkerId: 'selected_worker_september',
    targetWorkerId: 'worker_esteban_stable',
  }
);
const explicitlyLinkedEsteban = explicitlyLinkedSelection.find(
  (worker) => worker.id === 'worker_esteban_stable'
);

assert.equal(
  explicitlyLinkedEsteban?.shifts['2026-09-01'].rawCode,
  'T',
  'La seleccion del trabajador debe vincular sus turnos aunque cambie el nombre.'
);
assert.equal(
  explicitlyLinkedSelection.some((worker) => worker.id === 'selected_worker_september'),
  false,
  'El trabajador seleccionado no debe separarse en un perfil para el segundo mes.'
);

const remappedReferenceWorkers = assignWorkersToReferencePeriod(
  [
    {
      id: 'reference_worker',
      name: 'Trabajador Referencia',
      shifts: {
        '2025-01-08': shift('2025-01-08', 'M', 'morning', '07:30', '15:30'),
      },
    },
  ],
  2026,
  9
);
assert.equal(
  remappedReferenceWorkers[0].shifts['2026-09-08'].rawCode,
  'M',
  'La referencia debe definir la fecha aunque el archivo use otro mes.'
);

const esteban = merged.find((worker) => worker.id === 'worker_esteban_stable');
const elena = merged.find((worker) => worker.id === 'worker_elena_stable');
const carlos = merged.find((worker) => worker.name === 'Carlos Silva');

assert.equal(merged.length, 3, 'Debe conservar trabajadores ausentes y agregar trabajadores nuevos.');
assert.ok(esteban, 'Debe relacionar al trabajador aunque cambien fila, mayúsculas o espacios.');
assert.ok(elena, 'Debe conservar a Elena aunque no aparezca en septiembre.');
assert.ok(carlos, 'Debe agregar a Carlos desde septiembre.');
assert.equal(
  normalizeWorkerName(septemberWorkers[0].name),
  normalizeWorkerName(augustWorkers[0].name),
  'Los datos de cargo agregados al nombre no deben separar al mismo trabajador.'
);
assert.equal(esteban.shifts['2026-08-11'].rawCode, 'M', 'Agosto debe conservarse.');
assert.equal(esteban.shifts['2026-09-02'].rawCode, 'T', 'Debe usar la letra asignada en septiembre.');
assert.equal(esteban.shifts['2026-09-01'].startTime, '07:30', 'M debe reutilizar el horario de agosto.');
assert.equal(esteban.shifts['2026-09-02'].startTime, '15:30', 'T debe reutilizar el horario de agosto.');
assert.equal(carlos.shifts['2026-09-01'].endTime, '15:30', 'Un trabajador nuevo debe usar el horario regularizado.');
assert.equal(
  resolveImportedWorkerId(augustWorkers, septemberWorkers, 'row_20_esteban'),
  'worker_esteban_stable',
  'El trabajador seleccionado debe conservar su identidad.'
);

const workersWithManualOutlier: WorkerProfile[] = [
  {
    id: 'worker_schedule_priority',
    name: 'Trabajador Horario Base',
    shifts: {
      '2026-08-01': {
        ...shift('2026-08-01', 'M', 'morning', '12:00', '20:00'),
        editedManually: true,
      },
      '2026-08-02': shift('2026-08-02', 'M', 'morning', '07:30', '15:30'),
    },
  },
];
const schedulePriorityMerge = mergeImportedWorkersForPeriod(
  workersWithManualOutlier,
  [
    {
      id: 'worker_schedule_priority_new_row',
      name: 'Trabajador Horario Base',
      shifts: {
        '2026-09-01': shift('2026-09-01', 'M', 'morning', '08:00', '16:00'),
      },
    },
  ],
  2026,
  9
);
assert.equal(
  schedulePriorityMerge[0].shifts['2026-09-01'].startTime,
  '07:30',
  'Una edición excepcional no debe convertirse en el horario global de la letra.'
);

esteban.shifts['2026-09-02'] = {
  ...esteban.shifts['2026-09-02'],
  notes: 'Cambio coordinado',
};
esteban.shifts['2026-09-03'] = {
  ...esteban.shifts['2026-09-03'],
  rawCode: 'L',
  category: 'off',
  startTime: '',
  endTime: '',
  isWorkDay: false,
  editedManually: true,
};

const septemberReimport: WorkerProfile[] = [
  {
    ...septemberWorkers[0],
    id: 'another_row_esteban',
    shifts: {
      '2026-09-01': shift('2026-09-01', 'T', 'afternoon', '16:00', '24:00'),
      '2026-09-02': shift('2026-09-02', 'M', 'morning', '08:00', '16:00'),
      '2026-09-03': shift('2026-09-03', 'M', 'morning', '08:00', '16:00'),
    },
  },
];
const reimported = mergeImportedWorkersForPeriod(merged, septemberReimport, 2026, 9);
const reimportedEsteban = reimported.find((worker) => worker.id === 'worker_esteban_stable');

assert.ok(reimportedEsteban);
assert.equal(reimportedEsteban.shifts['2026-08-11'].rawCode, 'M');
assert.equal(reimportedEsteban.shifts['2026-09-01'].rawCode, 'T');
assert.equal(reimportedEsteban.shifts['2026-09-02'].rawCode, 'M');
assert.equal(reimportedEsteban.shifts['2026-09-02'].notes, 'Cambio coordinado');
assert.equal(reimportedEsteban.shifts['2026-09-03'].rawCode, 'L');

const conflicts = detectScheduleConflicts(
  [
    {
      id: 'event_sep_morning',
      title: 'Control septiembre',
      type: 'medical',
      date: '2026-09-01',
      startTime: '08:00',
      endTime: '09:00',
      reminderMinutes: 30,
    },
    {
      id: 'event_cross_month',
      title: 'Cita madrugada',
      type: 'medical',
      date: '2026-09-01',
      startTime: '05:00',
      endTime: '05:30',
      reminderMinutes: 30,
    },
  ],
  esteban
);

assert.ok(conflicts.some((conflict) => conflict.eventId === 'event_sep_morning'));
assert.ok(conflicts.some((conflict) => conflict.eventId === 'event_cross_month'));

hydrateShiftDefinitionsFromWorkers(augustWorkers);
const syncedAfterReload = syncWorkersShiftTimes(septemberWorkers);
assert.equal(COMMON_SHIFT_DEFINITIONS.M.defaultStartTime, '07:30');
assert.equal(syncedAfterReload[0].shifts['2026-09-01'].startTime, '07:30');

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet([
  ['PROGRAMACIÓN DE TURNOS - SEPTIEMBRE 2026'],
  [],
  ['Trabajador', 1, 2, 3, 4, 5],
  ['Carlos Silva', 'M', 'L', 'T', 'N', 'M'],
  ['Esteban Varas Varela', 'T', 'M', 'L', 'N', 'T'],
]);
XLSX.utils.book_append_sheet(workbook, worksheet, 'Turnos Septiembre');
const excelOutput = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as
  | ArrayBuffer
  | Uint8Array;
const excelBuffer =
  excelOutput instanceof ArrayBuffer
    ? excelOutput
    : (excelOutput.buffer.slice(
        excelOutput.byteOffset,
        excelOutput.byteOffset + excelOutput.byteLength
      ) as ArrayBuffer);
const parsedSeptember = await parseExcelBuffer(excelBuffer, 2026, 9, 'ignore');
const parsedEsteban = parsedSeptember.workers.find(
  (worker) => worker.name === 'Esteban Varas Varela'
);
const parsedCarlos = parsedSeptember.workers.find((worker) => worker.name === 'Carlos Silva');

assert.ok(parsedEsteban, 'El parser debe detectar a Esteban aunque cambie de fila.');
assert.ok(parsedCarlos, 'El parser debe detectar a Carlos como trabajador nuevo.');
assert.equal(parsedEsteban.shifts['2026-09-01'].rawCode, 'T');
assert.equal(parsedEsteban.shifts['2026-09-02'].rawCode, 'M');
assert.equal(parsedCarlos.shifts['2026-09-02'].rawCode, 'L');

const parsedMerge = mergeImportedWorkersForPeriod(
  augustWorkers,
  syncWorkersShiftTimes(parsedSeptember.workers),
  2026,
  9
);
const parsedMergedEsteban = parsedMerge.find((worker) => worker.id === 'worker_esteban_stable');

assert.ok(parsedMergedEsteban);
assert.equal(parsedMergedEsteban.shifts['2026-08-11'].rawCode, 'M');
assert.equal(parsedMergedEsteban.shifts['2026-09-01'].rawCode, 'T');
assert.equal(parsedMergedEsteban.shifts['2026-09-01'].startTime, '15:30');

const workbookWithoutMonth = XLSX.utils.book_new();
const worksheetWithoutMonth = XLSX.utils.aoa_to_sheet([
  ['PROGRAMACION DE TURNOS'],
  [],
  ['Trabajador', 1, 2, 3, 4, 5],
  ['Esteban Varas Varela', 'M', 'T', 'L', 'N', 'M'],
]);
XLSX.utils.book_append_sheet(workbookWithoutMonth, worksheetWithoutMonth, 'Turnos');
const outputWithoutMonth = XLSX.write(workbookWithoutMonth, {
  type: 'array',
  bookType: 'xlsx',
}) as ArrayBuffer | Uint8Array;
const bufferWithoutMonth =
  outputWithoutMonth instanceof ArrayBuffer
    ? outputWithoutMonth
    : (outputWithoutMonth.buffer.slice(
        outputWithoutMonth.byteOffset,
        outputWithoutMonth.byteOffset + outputWithoutMonth.byteLength
      ) as ArrayBuffer);
const parsedWithoutMonth = await parseExcelBuffer(bufferWithoutMonth, 2026, 9, 'ignore');

assert.equal(parsedWithoutMonth.month, 9);
assert.equal(
  parsedWithoutMonth.workers[0].shifts['2026-09-01'].rawCode,
  'M',
  'Un Excel sin nombre de mes debe obedecer la referencia seleccionada.'
);

console.log('Importación acumulativa verificada: meses, trabajadores, horarios y conflictos OK.');
