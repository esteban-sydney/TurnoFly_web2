export type Language = 'es' | 'en' | 'pt';
export type ThemeMode = 'light' | 'dark' | 'system';
export type UserRole = 'worker' | 'supervisor';

export type ShiftCategory = 'morning' | 'afternoon' | 'night' | 'off' | 'administrative' | 'vacation' | 'other';

export interface ShiftCodeDefinition {
  code: string;
  name: string;
  category: ShiftCategory;
  defaultStartTime: string; // "HH:mm" e.g., "07:00"
  defaultEndTime: string;   // "HH:mm" e.g., "15:00"
  isWorkDay: boolean;
  color: string; // hex or tailwind class
}

export interface DayShift {
  date: string; // YYYY-MM-DD
  rawCode: string;
  category: ShiftCategory;
  startTime?: string;
  endTime?: string;
  isWorkDay: boolean;
  isRemote?: boolean;
  notes?: string;
  editedManually?: boolean;
}

export interface ShiftEntry {
  code: string;
  category: ShiftCategory;
  dayNumber: number;
  weekdayLabel?: string;
  columnIndex?: number;
  rowIndex?: number;
  sourceSheet?: string;
  shiftDate: string; // YYYY-MM-DD
}

export interface WorkerProfile {
  id: string;
  name: string;
  role?: string;
  department?: string;
  shifts: Record<string, DayShift>; // date "YYYY-MM-DD" -> DayShift
  shiftEntries?: ShiftEntry[];
  referenceMonth?: number; // 1-12
  referenceYear?: number;
  importMetadata?: {
    sourceFileName?: string;
    sheetName?: string;
    detectedLayout?: 'matrix' | 'simple';
    importedAt?: string;
  };
}

export interface PersonalEvent {
  id: string;
  title: string;
  type: 'medical' | 'gym' | 'family' | 'study' | 'work' | 'other';
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  reminderMinutes: number; // e.g., 15, 30, 60, 1440
  notes?: string;
  suspendedConflict?: boolean;
}

export interface ConflictAlert {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string; // "16:00 - 17:00"
  shiftCode: string;
  shiftName: string;
  shiftTime: string; // "15:00 - 23:00"
  workerName: string;
  message: string;
  isSuspended: boolean;
}

export interface HorarioEvidence {
  id: string;
  fileName: string;
  fileSizeMb: number;
  fileType: 'image' | 'pdf';
  uploadDate: string;
  previewUrl?: string;
  storageKey?: string;
  extractedNotes?: string;
}

export interface AppSettings {
  theme: ThemeMode;
  language: Language;
  userRole: UserRole;
  activeWorkerId?: string;
  activeView?: 'home' | 'shifts' | 'personal' | 'supervisor';
  hasSeenSplash?: boolean;
  remindersEnabled: boolean;
  defaultRemoteMode: boolean;
  dismissedConflicts: string[]; // event IDs
  referenceMonth?: number;
  referenceYear?: number;
}
