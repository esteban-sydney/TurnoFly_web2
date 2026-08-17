import { DayShift, ShiftCodeDefinition } from '../types';

export function toTimeInputValue(value?: string): string {
  return value === '24:00' ? '00:00' : value || '';
}

export function fromTimeInputValue(value: string, standardValue?: string): string {
  return value === '00:00' && standardValue === '24:00' ? '24:00' : value;
}

export function hasCustomShiftHours(
  shift: DayShift | undefined,
  definition: ShiftCodeDefinition
): boolean {
  if (!shift?.editedManually || !shift.isWorkDay || !definition.isWorkDay) return false;

  return (
    (shift.startTime || '') !== definition.defaultStartTime ||
    (shift.endTime || '') !== definition.defaultEndTime
  );
}
