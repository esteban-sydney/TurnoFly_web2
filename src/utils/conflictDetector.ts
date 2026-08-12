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

function getPreviousDateStr(dateStr: string): string | null {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftCrossesMidnight(shift: DayShift): boolean {
  const start = parseTimeToMinutes(shift.startTime);
  const end = parseTimeToMinutes(shift.endTime);
  return start !== null && end !== null && end <= start;
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
    const candidateShifts = [
      worker.shifts[event.date],
      (() => {
        const previousDate = getPreviousDateStr(event.date);
        const previousShift = previousDate ? worker.shifts[previousDate] : undefined;
        return previousShift && shiftCrossesMidnight(previousShift) ? previousShift : undefined;
      })(),
    ].filter(Boolean) as DayShift[];

    if (candidateShifts.length === 0) {
      return;
    }

    const eventStartMin = parseTimeToMinutes(event.startTime);
    const eventEndMin = parseTimeToMinutes(event.endTime);
    if (eventStartMin === null || eventEndMin === null) {
      return;
    }

    candidateShifts.forEach((shift) => {
      if (!shift || !shift.isWorkDay || !shift.startTime || !shift.endTime) {
        return;
      }

      let shiftStartMin = parseTimeToMinutes(shift.startTime);
      let shiftEndMin = parseTimeToMinutes(shift.endTime);

      if (shiftStartMin === null || shiftEndMin === null) {
        return;
      }

      const isPreviousDayShift = shift.date !== event.date;
      let normalizedEventStart = eventStartMin;
      let normalizedEventEnd = eventEndMin;
      let overlaps = false;

      if (shiftEndMin <= shiftStartMin) {
        shiftEndMin += 24 * 60;
      }

      if (isPreviousDayShift) {
        normalizedEventStart += 24 * 60;
        normalizedEventEnd += 24 * 60;
      } else if (eventEndMin <= eventStartMin) {
        normalizedEventEnd += 24 * 60;
      }

      if (normalizedEventStart < shiftEndMin && normalizedEventEnd > shiftStartMin) {
        overlaps = true;
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
  });

  return conflicts;
}
