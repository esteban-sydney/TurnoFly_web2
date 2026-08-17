import type { DayShift, ShiftCodeDefinition, WorkerProfile } from '../types';
import { categorizeCode, isRealPersonName } from './excelParser';
import { normalizeWorkerName } from './workerImportMerge';

export interface SupervisorWorkerShift {
  workerName: string;
  workerId: string;
  shift?: DayShift;
  def?: ShiftCodeDefinition;
}

export interface SupervisorShiftGroups {
  morning: SupervisorWorkerShift[];
  afternoon: SupervisorWorkerShift[];
  night: SupervisorWorkerShift[];
  off: SupervisorWorkerShift[];
  other: SupervisorWorkerShift[];
  unknown: SupervisorWorkerShift[];
}

export interface SimilarWorkerNames {
  first: Pick<WorkerProfile, 'id' | 'name'>;
  second: Pick<WorkerProfile, 'id' | 'name'>;
}

const sortByName = (left: SupervisorWorkerShift, right: SupervisorWorkerShift) =>
  left.workerName.localeCompare(right.workerName);

export const groupWorkersForSupervisorDate = (
  workers: WorkerProfile[],
  date: string
): SupervisorShiftGroups => {
  const groups: SupervisorShiftGroups = {
    morning: [],
    afternoon: [],
    night: [],
    off: [],
    other: [],
    unknown: [],
  };

  workers.filter((worker) => isRealPersonName(worker.name)).forEach((worker) => {
    const shift = worker.shifts?.[date];
    const baseItem = {
      workerName: worker.name,
      workerId: worker.id,
      shift,
    };

    if (!shift?.rawCode?.trim()) {
      groups.unknown.push(baseItem);
      return;
    }

    const rawCode = shift.rawCode.trim().toUpperCase();
    const def = categorizeCode(rawCode);
    const item = { ...baseItem, def };

    if (
      rawCode === 'L' ||
      shift.category === 'off' ||
      shift.category === 'vacation' ||
      def.category === 'off' ||
      def.category === 'vacation'
    ) {
      groups.off.push(item);
    } else if (!shift.isWorkDay) {
      groups.unknown.push(item);
    } else if (def.category === 'morning' || def.category === 'administrative') {
      groups.morning.push(item);
    } else if (def.category === 'afternoon') {
      groups.afternoon.push(item);
    } else if (def.category === 'night') {
      groups.night.push(item);
    } else {
      groups.other.push(item);
    }
  });

  Object.values(groups).forEach((group) => group.sort(sortByName));
  return groups;
};

const isTokenSubset = (shorter: string[], longer: string[]) =>
  shorter.length >= 2 && shorter.every((token) => longer.includes(token));

export const findSimilarWorkerNames = (workers: WorkerProfile[]): SimilarWorkerNames[] => {
  const people = workers.filter((worker) => isRealPersonName(worker.name));
  const matches: SimilarWorkerNames[] = [];

  for (let leftIndex = 0; leftIndex < people.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < people.length; rightIndex += 1) {
      const left = people[leftIndex];
      const right = people[rightIndex];
      const leftName = normalizeWorkerName(left.name);
      const rightName = normalizeWorkerName(right.name);
      const leftTokens = leftName.split(' ').filter(Boolean);
      const rightTokens = rightName.split(' ').filter(Boolean);
      const sameName = leftName === rightName;
      const possibleAlias =
        isTokenSubset(leftTokens, rightTokens) || isTokenSubset(rightTokens, leftTokens);

      if (sameName || possibleAlias) {
        matches.push({
          first: { id: left.id, name: left.name },
          second: { id: right.id, name: right.name },
        });
      }
    }
  }

  return matches;
};
