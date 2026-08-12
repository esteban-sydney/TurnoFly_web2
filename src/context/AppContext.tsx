import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  AppSettings,
  WorkerProfile,
  PersonalEvent,
  HorarioEvidence,
  ConflictAlert,
  Language,
  ThemeMode,
  UserRole,
  DayShift,
} from '../types';
import { StorageService, defaultSettings } from '../utils/storage';
import { detectScheduleConflicts } from '../utils/conflictDetector';
import { generateSampleDemoWorkers, COMMON_SHIFT_DEFINITIONS, isRealPersonName, syncWorkersShiftTimes } from '../utils/excelParser';

interface AppContextType {
  settings: AppSettings;
  workers: WorkerProfile[];
  events: PersonalEvent[];
  evidence: HorarioEvidence[];
  activeWorker: WorkerProfile | undefined;
  conflicts: ConflictAlert[];
  activeYear: number;
  activeMonth: number;
  
  // Actions
  setLanguage: (lang: Language) => void;
  setTheme: (theme: ThemeMode) => void;
  setUserRole: (role: UserRole) => void;
  setActiveWorkerId: (id: string | undefined) => void;
  setActiveYearMonth: (year: number, month: number) => void;
  setLastActiveView: (view: 'home' | 'shifts' | 'personal' | 'supervisor') => void;
  markSplashSeen: () => void;
  
  // Data mutations
  loadImportedWorkers: (
    newWorkers: WorkerProfile[],
    selectedWorkerId?: string,
    referenceYear?: number,
    referenceMonth?: number
  ) => void;
  updateDayShift: (workerId: string, dateStr: string, updatedShift: Partial<DayShift>) => void;
  updateShiftDefinition: (
    code: string,
    newStartTime: string,
    newEndTime: string,
    isWorkDay: boolean,
    name?: string
  ) => void;
  
  // Events
  addPersonalEvent: (event: Omit<PersonalEvent, 'id'>) => void;
  updatePersonalEvent: (event: PersonalEvent) => void;
  deletePersonalEvent: (eventId: string) => void;
  
  // Evidence
  addEvidence: (item: HorarioEvidence) => void;
  deleteEvidence: (id: string) => void;
  
  // Resets
  clearShiftsOnly: () => void;
  resetFullApp: () => void;
  exportBackup: () => string;
  importBackup: (jsonStr: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => StorageService.getSettings());
  const [workers, setWorkers] = useState<WorkerProfile[]>(() => {
    const saved = StorageService.getWorkers();
    if (saved && saved.length > 0) {
      const sanitized = saved.filter((w) => isRealPersonName(w.name));
      if (sanitized.length > 0) {
        const synced = syncWorkersShiftTimes(sanitized);
        StorageService.saveWorkers(synced);
        return synced;
      }
    }
    return [];
  });
  const [events, setEvents] = useState<PersonalEvent[]>(() => StorageService.getEvents());
  const [evidence, setEvidence] = useState<HorarioEvidence[]>(() => StorageService.getEvidence());

  const [activeYear, setActiveYear] = useState<number>(() => {
    return settings.referenceYear || workers[0]?.referenceYear || new Date().getFullYear();
  });
  const [activeMonth, setActiveMonth] = useState<number>(() => {
    return settings.referenceMonth || workers[0]?.referenceMonth || new Date().getMonth() + 1;
  });

  // Sync dark/light theme class to document Element
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    let isDark = false;

    if (settings.theme === 'dark') {
      isDark = true;
    } else if (settings.theme === 'light') {
      isDark = false;
    } else {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    if (isDark) {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
    }

    StorageService.saveSettings(settings);
  }, [settings]);

  // Sync state changes to storage
  useEffect(() => {
    StorageService.saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    StorageService.saveWorkers(workers);
  }, [workers]);

  useEffect(() => {
    StorageService.saveEvents(events);
  }, [events]);

  useEffect(() => {
    StorageService.saveEvidence(evidence);
  }, [evidence]);

  const activeWorker = useMemo(() => {
    const realWorkers = workers.filter((w) => isRealPersonName(w.name));
    if (realWorkers.length === 0) {
      return workers[0];
    }
    if (!settings.activeWorkerId) {
      return realWorkers[0];
    }
    return realWorkers.find((w) => w.id === settings.activeWorkerId) || realWorkers[0];
  }, [workers, settings.activeWorkerId]);

  const conflicts = useMemo(() => {
    return detectScheduleConflicts(events, activeWorker, settings.dismissedConflicts);
  }, [events, activeWorker, settings.dismissedConflicts]);

  const setLanguage = (lang: Language) => {
    setSettings((prev) => ({ ...prev, language: lang }));
  };

  const setTheme = (theme: ThemeMode) => {
    setSettings((prev) => ({ ...prev, theme }));
  };

  const setUserRole = (role: UserRole) => {
    setSettings((prev) => ({ ...prev, userRole: role }));
  };

  const setActiveWorkerId = (id: string | undefined) => {
    setSettings((prev) => ({ ...prev, activeWorkerId: id }));
  };

  const setActiveYearMonth = (year: number, month: number) => {
    setActiveYear(year);
    setActiveMonth(month);
    setSettings((prev) => ({
      ...prev,
      referenceYear: year,
      referenceMonth: month,
    }));
  };

  const setLastActiveView = (view: 'home' | 'shifts' | 'personal' | 'supervisor') => {
    setSettings((prev) => ({
      ...prev,
      activeView: view,
    }));
  };

  const markSplashSeen = () => {
    setSettings((prev) => ({
      ...prev,
      hasSeenSplash: true,
    }));
  };

  const loadImportedWorkers = (
    newWorkers: WorkerProfile[],
    selectedWorkerId?: string,
    referenceYear?: number,
    referenceMonth?: number
  ) => {
    const validNewWorkers = newWorkers.filter((nw) => isRealPersonName(nw.name));
    if (validNewWorkers.length === 0) return;

    // Preserve manual overrides / notes from existing workers if reimporting
    setWorkers((existingWorkers) => {
      const existingMap = new Map<string, WorkerProfile>(
        existingWorkers.map((w) => [w.name.toLowerCase().trim(), w])
      );

      return validNewWorkers.map((nw) => {
        const existing = existingMap.get(nw.name.toLowerCase().trim());
        if (!existing) return nw;

        // Merge shifts: if existing shift on date was edited manually or has custom notes, preserve it
        const mergedShifts = { ...nw.shifts };
        Object.entries(existing.shifts).forEach(([dateStr, existingShift]) => {
          if (existingShift.editedManually || existingShift.notes) {
            mergedShifts[dateStr] = {
              ...mergedShifts[dateStr],
              ...existingShift,
            };
          }
        });

        return {
          ...nw,
          shifts: mergedShifts,
        };
      });
    });

    const chosenId = selectedWorkerId || (validNewWorkers.length > 0 ? validNewWorkers[0].id : undefined);

    if (referenceYear && referenceMonth) {
      setActiveYear(referenceYear);
      setActiveMonth(referenceMonth);
    } else if (newWorkers[0]?.referenceYear && newWorkers[0]?.referenceMonth) {
      setActiveYear(newWorkers[0].referenceYear);
      setActiveMonth(newWorkers[0].referenceMonth);
    }

    setSettings((prev) => ({
      ...prev,
      activeWorkerId: chosenId,
      referenceYear: referenceYear || newWorkers[0]?.referenceYear || prev.referenceYear,
      referenceMonth: referenceMonth || newWorkers[0]?.referenceMonth || prev.referenceMonth,
    }));
  };

  const updateDayShift = (workerId: string, dateStr: string, updatedShift: Partial<DayShift>) => {
    setWorkers((prevWorkers) =>
      prevWorkers.map((w) => {
        if (w.id !== workerId) return w;
        const currentShift = w.shifts[dateStr] || {
          date: dateStr,
          rawCode: 'L',
          category: 'off',
          isWorkDay: false,
        };
        const newShift: DayShift = {
          ...currentShift,
          ...updatedShift,
          editedManually: true,
        };
        return {
          ...w,
          shifts: {
            ...w.shifts,
            [dateStr]: newShift,
          },
        };
      })
    );
  };

  const updateShiftDefinition = (
    code: string,
    newStartTime: string,
    newEndTime: string,
    isWorkDay: boolean,
    name?: string
  ) => {
    const upperCode = code.toUpperCase().trim();
    if (COMMON_SHIFT_DEFINITIONS[upperCode]) {
      COMMON_SHIFT_DEFINITIONS[upperCode].defaultStartTime = newStartTime;
      COMMON_SHIFT_DEFINITIONS[upperCode].defaultEndTime = newEndTime;
      COMMON_SHIFT_DEFINITIONS[upperCode].isWorkDay = isWorkDay;
      if (name) COMMON_SHIFT_DEFINITIONS[upperCode].name = name;
    }

    // Replicate new start/end times across ALL workers' shifts that share this rawCode
    setWorkers((prevWorkers) =>
      prevWorkers.map((worker) => {
        let changed = false;
        const updatedShifts = { ...worker.shifts };

        Object.entries(updatedShifts).forEach(([dateStr, shiftVal]) => {
          const shift = shiftVal as DayShift;
          if (shift && shift.rawCode && shift.rawCode.toUpperCase() === upperCode) {
            updatedShifts[dateStr] = {
              ...shift,
              startTime: isWorkDay ? newStartTime : '',
              endTime: isWorkDay ? newEndTime : '',
              isWorkDay: isWorkDay,
            };
            changed = true;
          }
        });

        if (!changed) return worker;

        return {
          ...worker,
          shifts: updatedShifts,
        };
      })
    );
  };

  const addPersonalEvent = (eventData: Omit<PersonalEvent, 'id'>) => {
    const newEvent: PersonalEvent = {
      ...eventData,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    setEvents((prev) => [...prev, newEvent]);
  };

  const updatePersonalEvent = (updatedEvent: PersonalEvent) => {
    setEvents((prev) => prev.map((evt) => (evt.id === updatedEvent.id ? updatedEvent : evt)));
  };

  const deletePersonalEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((evt) => evt.id !== eventId));
  };

  const addEvidence = (item: HorarioEvidence) => {
    setEvidence((prev) => [item, ...prev]);
  };

  const deleteEvidence = (id: string) => {
    setEvidence((prev) => prev.filter((ev) => ev.id !== id));
  };

  const clearShiftsOnly = () => {
    StorageService.clearShiftsOnly();
    setWorkers([]);
    setSettings((prev) => ({ ...prev, activeWorkerId: undefined }));
  };

  const resetFullApp = () => {
    StorageService.resetFullApp();
    setSettings(defaultSettings);
    setWorkers([]);
    setEvents([]);
    setEvidence([]);
  };

  const exportBackup = () => {
    return StorageService.exportBackupData();
  };

  const importBackup = (jsonStr: string) => {
    const success = StorageService.importBackupData(jsonStr);
    if (success) {
      setSettings(StorageService.getSettings());
      setWorkers(StorageService.getWorkers());
      setEvents(StorageService.getEvents());
      setEvidence(StorageService.getEvidence());
    }
    return success;
  };

  return (
    <AppContext.Provider
      value={{
        settings,
        workers,
        events,
        evidence,
        activeWorker,
        conflicts,
        activeYear,
        activeMonth,
        setLanguage,
        setTheme,
        setUserRole,
        setActiveWorkerId,
        setActiveYearMonth,
        setLastActiveView,
        markSplashSeen,
        loadImportedWorkers,
        updateDayShift,
        updateShiftDefinition,
        addPersonalEvent,
        updatePersonalEvent,
        deletePersonalEvent,
        addEvidence,
        deleteEvidence,
        clearShiftsOnly,
        resetFullApp,
        exportBackup,
        importBackup,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
