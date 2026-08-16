import { DayShift, ShiftEntry, WorkerProfile } from '../types';

type ShiftSchedule = Pick<DayShift, 'category' | 'startTime' | 'endTime' | 'isWorkDay'>;

interface MergeImportedWorkersOptions {
  selectedImportedWorkerId?: string;
  targetWorkerId?: string;
}

export function normalizeWorkerName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function getPeriodPrefix(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-`;
}

export function assignWorkersToReferencePeriod(
  workers: WorkerProfile[],
  year: number,
  month: number
): WorkerProfile[] {
  const maxDay = new Date(year, month, 0).getDate();
  const monthValue = String(month).padStart(2, '0');

  return workers.map((worker) => {
    const entriesByDay = new Map(
      (worker.shiftEntries || []).map((entry) => [entry.dayNumber, entry])
    );
    const shifts = Object.values(worker.shifts || {}).reduce<Record<string, DayShift>>(
      (mapped, shift) => {
        const day = Number(shift.date.slice(-2));
        if (!Number.isInteger(day) || day < 1 || day > maxDay) return mapped;

        const date = `${year}-${monthValue}-${String(day).padStart(2, '0')}`;
        mapped[date] = { ...shift, date };
        return mapped;
      },
      {}
    );
    const shiftEntries = Object.entries(shifts)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, shift]) => {
        const dayNumber = Number(date.slice(-2));
        return {
          ...entriesByDay.get(dayNumber),
          code: shift.rawCode,
          category: shift.category,
          dayNumber,
          shiftDate: date,
        } satisfies ShiftEntry;
      });

    return {
      ...worker,
      shifts,
      shiftEntries,
      referenceMonth: month,
      referenceYear: year,
    };
  });
}

function collectKnownSchedules(workers: WorkerProfile[]): Map<string, ShiftSchedule> {
  const schedules = new Map<string, ShiftSchedule>();
  const datedShifts = workers
    .flatMap((worker) => Object.entries(worker.shifts))
    .sort(([leftDate, leftShift], [rightDate, rightShift]) => {
      const manualOrder = Number(Boolean(leftShift.editedManually)) - Number(Boolean(rightShift.editedManually));
      return manualOrder || leftDate.localeCompare(rightDate);
    });

  datedShifts.forEach(([, shift]) => {
    const code = shift.rawCode?.trim().toUpperCase();
    if (!code || schedules.has(code)) return;

    schedules.set(code, {
      category: shift.category,
      startTime: shift.startTime,
      endTime: shift.endTime,
      isWorkDay: shift.isWorkDay,
    });
  });

  return schedules;
}

function applyKnownSchedule(
  shift: DayShift,
  schedules: Map<string, ShiftSchedule>
): DayShift {
  const schedule = schedules.get(shift.rawCode.trim().toUpperCase());
  return schedule ? { ...shift, ...schedule } : shift;
}

function mergeShiftEntries(
  existing: WorkerProfile,
  imported: WorkerProfile,
  mergedShifts: Record<string, DayShift>,
  periodPrefix: string
): ShiftEntry[] {
  const entriesOutsidePeriod = (existing.shiftEntries || []).filter(
    (entry) => !entry.shiftDate.startsWith(periodPrefix)
  );
  const sourceEntries = new Map<string, ShiftEntry>();

  [...(existing.shiftEntries || []), ...(imported.shiftEntries || [])].forEach((entry) => {
    if (entry.shiftDate.startsWith(periodPrefix)) {
      sourceEntries.set(entry.shiftDate, entry);
    }
  });

  const entriesForPeriod = Object.values(mergedShifts)
    .filter((shift) => shift.date.startsWith(periodPrefix))
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((shift) => {
      const source = sourceEntries.get(shift.date);
      return {
        ...source,
        code: shift.rawCode,
        category: shift.category,
        dayNumber: Number(shift.date.slice(-2)),
        shiftDate: shift.date,
      } satisfies ShiftEntry;
    });

  return [...entriesOutsidePeriod, ...entriesForPeriod];
}

function mergeWorkerForPeriod(
  existing: WorkerProfile,
  imported: WorkerProfile,
  periodPrefix: string,
  schedules: Map<string, ShiftSchedule>
): WorkerProfile {
  const shiftsOutsidePeriod = Object.fromEntries(
    Object.entries(existing.shifts).filter(([date]) => !date.startsWith(periodPrefix))
  );
  const importedShifts = Object.fromEntries(
    Object.entries(imported.shifts)
      .filter(([date]) => date.startsWith(periodPrefix))
      .map(([date, shift]) => [date, applyKnownSchedule(shift, schedules)])
  );
  const mergedShifts: Record<string, DayShift> = {
    ...shiftsOutsidePeriod,
    ...importedShifts,
  };

  Object.entries(existing.shifts).forEach(([date, existingShift]) => {
    if (!date.startsWith(periodPrefix)) return;

    if (existingShift.editedManually) {
      mergedShifts[date] = existingShift;
    } else if (existingShift.notes) {
      mergedShifts[date] = mergedShifts[date]
        ? { ...mergedShifts[date], notes: existingShift.notes }
        : existingShift;
    }
  });

  return {
    ...imported,
    id: existing.id,
    name: existing.name,
    role: existing.role || imported.role,
    department: existing.department || imported.department,
    shifts: mergedShifts,
    shiftEntries: mergeShiftEntries(existing, imported, mergedShifts, periodPrefix),
  };
}

export function mergeImportedWorkersForPeriod(
  existingWorkers: WorkerProfile[],
  importedWorkers: WorkerProfile[],
  year: number,
  month: number,
  options: MergeImportedWorkersOptions = {}
): WorkerProfile[] {
  const periodPrefix = getPeriodPrefix(year, month);
  const schedules = collectKnownSchedules(existingWorkers);
  const importedByName = new Map(
    importedWorkers.map((worker) => [normalizeWorkerName(worker.name), worker])
  );
  const selectedImportedWorker = options.selectedImportedWorkerId
    ? importedWorkers.find((worker) => worker.id === options.selectedImportedWorkerId)
    : undefined;
  const matchedWorkerIds = new Set<string>();

  const mergedWorkers = existingWorkers.map((existing) => {
    const workerKey = normalizeWorkerName(existing.name);
    const imported =
      options.targetWorkerId === existing.id && selectedImportedWorker
        ? selectedImportedWorker
        : importedByName.get(workerKey);
    if (!imported || matchedWorkerIds.has(imported.id)) return existing;

    matchedWorkerIds.add(imported.id);
    return mergeWorkerForPeriod(existing, imported, periodPrefix, schedules);
  });

  importedWorkers.forEach((imported) => {
    if (matchedWorkerIds.has(imported.id)) return;

    const importedShifts = Object.fromEntries(
      Object.entries(imported.shifts).map(([date, shift]) => [
        date,
        applyKnownSchedule(shift, schedules),
      ])
    );

    mergedWorkers.push({
      ...imported,
      shifts: importedShifts,
      shiftEntries: (imported.shiftEntries || []).map((entry) => ({
        ...entry,
        category: importedShifts[entry.shiftDate]?.category || entry.category,
      })),
    });
    matchedWorkerIds.add(imported.id);
  });

  return mergedWorkers;
}

export function resolveImportedWorkerId(
  existingWorkers: WorkerProfile[],
  importedWorkers: WorkerProfile[],
  selectedImportedWorkerId?: string
): string | undefined {
  const selectedImportedWorker =
    importedWorkers.find((worker) => worker.id === selectedImportedWorkerId) || importedWorkers[0];
  if (!selectedImportedWorker) return undefined;

  const selectedKey = normalizeWorkerName(selectedImportedWorker.name);
  return (
    existingWorkers.find((worker) => normalizeWorkerName(worker.name) === selectedKey)?.id ||
    selectedImportedWorker.id
  );
}
