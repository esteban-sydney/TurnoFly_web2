import { PersonalEvent } from '../types';

export type PersonalEventStatus = 'upcoming' | 'ongoing' | 'completed';

export interface PersonalEventDateRange {
  start: Date;
  end: Date;
}

const parseClockTime = (value: string): { hours: number; minutes: number } | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 24 || minutes < 0 || minutes > 59) return null;
  if (hours === 24 && minutes !== 0) return null;

  return { hours, minutes };
};

export function getPersonalEventDateRange(
  event: Pick<PersonalEvent, 'date' | 'startTime' | 'endTime'>
): PersonalEventDateRange | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(event.date);
  const startTime = parseClockTime(event.startTime);
  const endTime = parseClockTime(event.endTime);
  if (!dateMatch || !startTime || !endTime) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const start = new Date(year, month - 1, day, startTime.hours, startTime.minutes, 0, 0);
  const end = new Date(year, month - 1, day, endTime.hours, endTime.minutes, 0, 0);

  if (
    start.getFullYear() !== year ||
    start.getMonth() !== month - 1 ||
    start.getDate() !== day
  ) {
    return null;
  }

  if (end.getTime() <= start.getTime()) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
}

export function getPersonalEventStatus(
  event: Pick<PersonalEvent, 'date' | 'startTime' | 'endTime'>,
  now: Date | number = Date.now()
): PersonalEventStatus {
  const range = getPersonalEventDateRange(event);
  if (!range) return 'upcoming';

  const currentTime = typeof now === 'number' ? now : now.getTime();
  if (currentTime < range.start.getTime()) return 'upcoming';
  if (currentTime < range.end.getTime()) return 'ongoing';
  return 'completed';
}
