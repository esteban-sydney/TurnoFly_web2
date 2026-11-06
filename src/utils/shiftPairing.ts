import type { ShiftCodeDefinition, WorkerProfile } from '../types';
import { categorizeCode } from './excelParser';
import { normalizeWorkerName } from './workerImportMerge';

const PAIRING_PROFESSIONALS = new Set([
  'Felipe Villalobos',
  'Santiago Armijo',
  'Jesus Rodriguez',
  'Osvaldo Diaz',
  'Sergio Palma',
  'Felipe Muñoz',
  'Fabian Cordova',
  'Esteban Varas',
  'Fabian Menares',
  'Victor Baez',
].map(normalizeWorkerName));

const COMPATIBLE_SHIFT_CODES: Record<string, string[]> = {
  M: ['M', 'M2'],
  M2: ['M', 'M2'],
  T: ['T', 'T2'],
  T2: ['T', 'T2'],
};

export interface ShiftCoworkerPreview {
  id: string;
  name: string;
  code: string;
}

export interface UpcomingShiftPreview {
  date: string;
  code: string;
  compatibleCodes: string[];
  excludedFromPairing: boolean;
  coworkers: ShiftCoworkerPreview[];
}

export function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isWorkingShift(
  code: string,
  isWorkDay: boolean,
  definitions: Record<string, ShiftCodeDefinition>
): boolean {
  if (!code || !isWorkDay) return false;
  return (definitions[code] || categorizeCode(code, definitions)).isWorkDay;
}

function isPairingProfessional(name: string): boolean {
  const normalizedTokens = normalizeWorkerName(name).split(' ').filter(Boolean);
  return [...PAIRING_PROFESSIONALS].some((professional) =>
    professional.split(' ').every((token) => normalizedTokens.includes(token))
  );
}

export function buildUpcomingShiftPreviews(
  activeWorker: WorkerProfile | undefined,
  workers: WorkerProfile[],
  definitions: Record<string, ShiftCodeDefinition>,
  todayKey: string,
  limit = 1
): UpcomingShiftPreview[] {
  if (!activeWorker || !isPairingProfessional(activeWorker.name)) return [];

  const upcoming = Object.entries(activeWorker.shifts || {})
    .filter(([date, shift]) => date > todayKey && Boolean(shift?.rawCode?.trim()))
    .map(([date, shift]) => {
      const code = shift.rawCode.trim().toUpperCase();
      const definition = definitions[code] || categorizeCode(code, definitions);
      return {
        date,
        shift,
        code,
        definition,
        isWorkDay: isWorkingShift(code, shift.isWorkDay, definitions),
      };
    })
    .filter(({ isWorkDay }) => isWorkDay)
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(0, limit);

  return upcoming.map(({ date, code }) => {
    const compatibleCodes = new Set(COMPATIBLE_SHIFT_CODES[code] || []);
    const coworkers = workers
      .filter((worker) => worker.id !== activeWorker.id && isPairingProfessional(worker.name))
      .flatMap((worker) => {
        const coworkerShift = worker.shifts?.[date];
        const coworkerCode = coworkerShift?.rawCode?.trim().toUpperCase();
        if (
          !coworkerShift ||
          !coworkerCode ||
          !compatibleCodes.has(coworkerCode) ||
          !isWorkingShift(coworkerCode, coworkerShift.isWorkDay, definitions)
        ) return [];

        return [{ id: worker.id, name: worker.name, code: coworkerCode }];
      })
      .sort((left, right) => left.name.localeCompare(right.name));

    return {
      date,
      code,
      compatibleCodes: [...compatibleCodes],
      excludedFromPairing: code === 'D' || code === 'D1',
      coworkers,
    };
  });
}
