import { DayShift, PersonalEvent, ConflictAlert, WorkerProfile } from '../types';
import { categorizeCode } from './excelParser';

function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

export function detectScheduleConflicts(
  events: PersonalEvent[],
  worker?: WorkerProfile,
  dismissedConflictIds: string[] = []
): ConflictAlert[] {
  if (!worker || !worker.shifts || events.length === 0) {
    return [];
  }

  const conflicts: ConflictAlert[] = [];

  events.forEach((event) => {
    const shift = worker.shifts[event.date];
    if (!shift || !shift.isWorkDay || !shift.startTime || !shift.endTime) {
      return;
    }

    const eventStartMin = parseTimeToMinutes(event.startTime);
    const eventEndMin = parseTimeToMinutes(event.endTime);
    let shiftStartMin = parseTimeToMinutes(shift.startTime);
    let shiftEndMin = parseTimeToMinutes(shift.endTime);

    if (eventStartMin === null || eventEndMin === null || shiftStartMin === null || shiftEndMin === null) {
      return;
    }

    // Handle overnight shift (e.g., 23:00 to 07:00 next day)
    let isNightOvernight = false;
    if (shiftEndMin <= shiftStartMin) {
      shiftEndMin += 24 * 60; // add 24 hours to end time
      isNightOvernight = true;
    }

    // Check overlap
    let overlaps = false;
    // Standard same-day check
    if (eventStartMin < shiftEndMin && eventEndMin > shiftStartMin) {
      overlaps = true;
    }

    // Also check overnight wrap if event is early morning and shift started night before
    if (isNightOvernight && !overlaps) {
      const adjustedEventStart = eventStartMin + 24 * 60;
      const adjustedEventEnd = eventEndMin + 24 * 60;
      if (adjustedEventStart < shiftEndMin && adjustedEventEnd > shiftStartMin) {
        overlaps = true;
      }
    }

    if (overlaps) {
      const conflictId = `conflict_${event.id}_${shift.date}`;
      const isSuspended = event.suspendedConflict || dismissedConflictIds.includes(conflictId);

      conflicts.push({
        id: conflictId,
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: `${event.startTime} - ${event.endTime}`,
        shiftCode: shift.rawCode,
        shiftName: categorizeCode(shift.rawCode).name,
        shiftTime: `${shift.startTime} - ${shift.endTime}`,
        workerName: worker.name,
        message: `La cita "${event.title}" (${event.startTime} - ${event.endTime}) coincide con tu turno ${shift.rawCode} (${shift.startTime} - ${shift.endTime}).`,
        isSuspended,
      });
    }
  });

  return conflicts;
}
