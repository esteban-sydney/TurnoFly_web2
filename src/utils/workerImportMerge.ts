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

export function getWorkerIdentityKey(name: string): string {
  const tokens = normalizeWorkerName(name).split(' ').filter(Boolean);
  return tokens.length >= 2 ? tokens.slice(0, 2).join(' ') : '';
}

const choosePreferredWorkerName = (left: string, right: string): string => {
  if (normalizeWorkerName(left) === normalizeWorkerName(right)) return left.trim();

  const leftTokens = normalizeWorkerName(left).split(' ').filter(Boolean).length;
  const rightTokens = normalizeWorkerName(right).split(' ').filter(Boolean).length;

  if (leftTokens !== rightTokens) return leftTokens > rightTokens ? left : right;
  return left.length >= right.length ? left : right;
};

const getShiftPriority = (shift: DayShift): number => {
  const code = shift.rawCode?.trim().toUpperCase();
  return (
    Number(Boolean(shift.editedManually)) * 1000 +
    Number(Boolean(shift.isWorkDay)) * 100 +
    Number(Boolean(code && code !== 'L')) * 20 +
    Number(Boolean(shift.startTime || shift.endTime)) * 5 +
    Number(Boolean(shift.notes))
  );
};

export interface ConsolidatedWorkers {
  workers: WorkerProfile[];
  idAliases: Map<string, string>;
  changed: boolean;
}

export function consolidateWorkersByIdentity(workers: WorkerProfile[]): ConsolidatedWorkers {
  const consolidated: WorkerProfile[] = [];
  const indexByIdentity = new Map<string, number>();
  const idAliases = new Map<string, string>();
  let changed = false;

  workers.forEach((worker) => {
    const identityKey = getWorkerIdentityKey(worker.name);
    const existingIndex = indexByIdentity.get(identityKey);

    if (!identityKey || existingIndex === undefined) {
      indexByIdentity.set(identityKey || worker.id, consolidated.length);
      idAliases.set(worker.id, worker.id);
      consolidated.push(worker);
      return;
    }

    changed = true;
    const existing = consolidated[existingIndex];
    const mergedShifts: Record<string, DayShift> = { ...existing.shifts };

    Object.entries(worker.shifts || {}).forEach(([date, incomingShift]) => {
      const currentShift = mergedShifts[date];
      if (!currentShift || getShiftPriority(incomingShift) > getShiftPriority(currentShift)) {
        mergedShifts[date] = incomingShift;
      }
    });

    const sourceEntries = [...(existing.shiftEntries || []), ...(worker.shiftEntries || [])];
    const shiftEntries = Object.entries(mergedShifts)
      .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
      .map(([date, mergedShift]) => {
        const matchingEntry = sourceEntries.find(
          (entry) =>
            entry.shiftDate === date &&
            entry.code?.trim().toUpperCase() === mergedShift.rawCode?.trim().toUpperCase()
        );
        const fallbackEntry = sourceEntries.find((entry) => entry.shiftDate === date);

        return {
          ...(matchingEntry || fallbackEntry),
          code: mergedShift.rawCode,
          category: mergedShift.category,
          dayNumber: Number(date.slice(-2)),
          shiftDate: date,
        } satisfies ShiftEntry;
      });

    consolidated[existingIndex] = {
      ...existing,
      name: choosePreferredWorkerName(existing.name, worker.name),
      role: existing.role || worker.role,
      department: existing.department || worker.department,
      shifts: mergedShifts,
      shiftEntries,
    };
    idAliases.set(worker.id, existing.id);
  });

  return { workers: consolidated, idAliases, changed };
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
    name: choosePreferredWorkerName(existing.name, imported.name),
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
  const existingConsolidation = consolidateWorkersByIdentity(existingWorkers);
  const importedConsolidation = consolidateWorkersByIdentity(importedWorkers);
  const normalizedExistingWorkers = existingConsolidation.workers;
  const normalizedImportedWorkers = importedConsolidation.workers;
  const selectedImportedWorkerId = options.selectedImportedWorkerId
    ? importedConsolidation.idAliases.get(options.selectedImportedWorkerId) ||
      options.selectedImportedWorkerId
    : undefined;
  const targetWorkerId = options.targetWorkerId
    ? existingConsolidation.idAliases.get(options.targetWorkerId) || options.targetWorkerId
    : undefined;
  const periodPrefix = getPeriodPrefix(year, month);
  const schedules = collectKnownSchedules(normalizedExistingWorkers);
  const importedByName = new Map(
    normalizedImportedWorkers
      .map((worker) => [getWorkerIdentityKey(worker.name), worker] as const)
      .filter(([identityKey]) => Boolean(identityKey))
  );
  const selectedImportedWorker = selectedImportedWorkerId
    ? normalizedImportedWorkers.find((worker) => worker.id === selectedImportedWorkerId)
    : undefined;
  const matchedWorkerIds = new Set<string>();

  const mergedWorkers = normalizedExistingWorkers.map((existing) => {
    const workerKey = getWorkerIdentityKey(existing.name);
    const imported =
      targetWorkerId === existing.id && selectedImportedWorker
        ? selectedImportedWorker
        : importedByName.get(workerKey);
    if (!imported || matchedWorkerIds.has(imported.id)) return existing;

    matchedWorkerIds.add(imported.id);
    return mergeWorkerForPeriod(existing, imported, periodPrefix, schedules);
  });

  normalizedImportedWorkers.forEach((imported) => {
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

  const selectedKey = getWorkerIdentityKey(selectedImportedWorker.name);
  return (
    (selectedKey
      ? existingWorkers.find((worker) => getWorkerIdentityKey(worker.name) === selectedKey)?.id
      : undefined) ||
    selectedImportedWorker.id
  );
}

export function removeShiftPeriodFromWorkers(
  workers: WorkerProfile[],
  year: number,
  month: number
): WorkerProfile[] {
  const periodPrefix = getPeriodPrefix(year, month);

  return workers
    .map((worker) => {
      const shifts = Object.fromEntries(
        Object.entries(worker.shifts || {}).filter(([date]) => !date.startsWith(periodPrefix))
      );
      const shiftEntries = (worker.shiftEntries || []).filter(
        (entry) => !entry.shiftDate.startsWith(periodPrefix)
      );
      const remainingDates = Object.keys(shifts).sort();
      const latestDate = remainingDates.at(-1);
      const [referenceYear, referenceMonth] = latestDate
        ? latestDate.split('-').map(Number)
        : [undefined, undefined];

      return {
        ...worker,
        shifts,
        shiftEntries,
        referenceMonth,
        referenceYear,
      };
    })
    .filter((worker) => Object.keys(worker.shifts).length > 0);
}
