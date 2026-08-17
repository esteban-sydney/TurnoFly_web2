import { AppSettings, WorkerProfile, PersonalEvent, HorarioEvidence } from '../types';

export const defaultSettings: AppSettings = {
  theme: 'light',
  language: 'es',
  userRole: 'worker',
  activeWorkerId: undefined,
  activeView: 'home',
  hasSeenSplash: false,
  remindersEnabled: true,
  defaultRemoteMode: true,
  dismissedConflicts: [],
};

const buildUserKeys = (userId: string) => {
  const owner = encodeURIComponent(userId);
  return {
    settings: `turnofly_user_${owner}_settings_v1`,
    workers: `turnofly_user_${owner}_workers_v1`,
    events: `turnofly_user_${owner}_events_v1`,
    evidence: `turnofly_user_${owner}_evidence_v1`,
  } as const;
};

export const createUserStorage = (userId: string) => {
  if (!userId.trim()) {
    throw new Error('A user id is required to access TurnoFly storage.');
  }

  const keys = buildUserKeys(userId);

  return {
    getSettings(): AppSettings {
      try {
        const data = localStorage.getItem(keys.settings);
        return data ? { ...defaultSettings, ...JSON.parse(data) } : { ...defaultSettings };
      } catch {
        return { ...defaultSettings };
      }
    },

    saveSettings(settings: AppSettings): void {
      try {
        localStorage.setItem(keys.settings, JSON.stringify(settings));
      } catch (error) {
        console.error('Error saving settings to storage:', error);
      }
    },

    getWorkers(): WorkerProfile[] {
      try {
        const data = localStorage.getItem(keys.workers);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    },

    saveWorkers(workers: WorkerProfile[]): void {
      try {
        localStorage.setItem(keys.workers, JSON.stringify(workers));
      } catch (error) {
        console.error('Error saving workers to storage:', error);
      }
    },

    getEvents(): PersonalEvent[] {
      try {
        const data = localStorage.getItem(keys.events);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    },

    saveEvents(events: PersonalEvent[]): void {
      try {
        localStorage.setItem(keys.events, JSON.stringify(events));
      } catch (error) {
        console.error('Error saving events to storage:', error);
      }
    },

    getEvidence(): HorarioEvidence[] {
      try {
        const data = localStorage.getItem(keys.evidence);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    },

    saveEvidence(evidence: HorarioEvidence[]): void {
      try {
        localStorage.setItem(keys.evidence, JSON.stringify(evidence));
      } catch (error) {
        console.error('Error saving evidence to storage:', error);
      }
    },

    clearShiftsOnly(): void {
      try {
        localStorage.removeItem(keys.workers);
        const settings = this.getSettings();
        settings.activeWorkerId = undefined;
        this.saveSettings(settings);
      } catch (error) {
        console.error('Error clearing shifts:', error);
      }
    },

    resetFullApp(): void {
      try {
        Object.values(keys).forEach((key) => localStorage.removeItem(key));
      } catch (error) {
        console.error('Error resetting app:', error);
      }
    },

    exportBackupData(): string {
      const backup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        settings: this.getSettings(),
        workers: this.getWorkers(),
        events: this.getEvents(),
        evidence: this.getEvidence(),
      };
      return JSON.stringify(backup, null, 2);
    },

    importBackupData(jsonString: string): boolean {
      try {
        const data = JSON.parse(jsonString);
        if (data.settings) this.saveSettings(data.settings);
        if (Array.isArray(data.workers)) this.saveWorkers(data.workers);
        if (Array.isArray(data.events)) this.saveEvents(data.events);
        if (Array.isArray(data.evidence)) this.saveEvidence(data.evidence);
        return true;
      } catch (error) {
        console.error('Invalid backup JSON:', error);
        return false;
      }
    },
  };
};

export type UserStorage = ReturnType<typeof createUserStorage>;
