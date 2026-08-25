import type { PersonalEvent, WorkerProfile } from '../types';
import { getWorkerIdentityKey } from './workerImportMerge';

export type PersonalEventInput = Omit<
  PersonalEvent,
  'id' | 'workerId' | 'workerNameSnapshot'
>;

export function getEventsForWorker(
  events: PersonalEvent[],
  workerId?: string
): PersonalEvent[] {
  if (!workerId) return [];
  return events.filter((event) => event.workerId === workerId);
}

export function assignUnassignedEventsToWorker(
  events: PersonalEvent[],
  worker: WorkerProfile
): PersonalEvent[] {
  let changed = false;
  const assigned = events.map((event) => {
    if (event.workerId) return event;
    changed = true;
    return {
      ...event,
      workerId: worker.id,
      workerNameSnapshot: worker.name,
    };
  });

  return changed ? assigned : events;
}

export function reconcileEventWorkerReferences(
  events: PersonalEvent[],
  workers: WorkerProfile[],
  idAliases: ReadonlyMap<string, string> = new Map()
): PersonalEvent[] {
  const workerById = new Map(workers.map((worker) => [worker.id, worker] as const));
  const workerByIdentity = new Map(
    workers
      .map((worker) => [getWorkerIdentityKey(worker.name), worker] as const)
      .filter(([identity]) => Boolean(identity))
  );
  let changed = false;

  const reconciled = events.map((event) => {
    if (!event.workerId) return event;

    const aliasedWorkerId = idAliases.get(event.workerId) || event.workerId;
    const snapshotIdentity = event.workerNameSnapshot
      ? getWorkerIdentityKey(event.workerNameSnapshot)
      : '';
    const worker =
      workerById.get(aliasedWorkerId) ||
      (snapshotIdentity ? workerByIdentity.get(snapshotIdentity) : undefined);

    if (!worker) return event;
    if (event.workerId === worker.id && event.workerNameSnapshot === worker.name) {
      return event;
    }

    changed = true;
    return {
      ...event,
      workerId: worker.id,
      workerNameSnapshot: worker.name,
    };
  });

  return changed ? reconciled : events;
}
