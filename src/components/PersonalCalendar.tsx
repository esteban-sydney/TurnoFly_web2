import React, { useEffect, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  CheckCircle2,
  BellOff,
  X,
  Stethoscope,
  Dumbbell,
  Users,
  GraduationCap,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../utils/i18n';
import { PersonalEvent } from '../types';
import {
  addToDeviceCalendar,
  buildGoogleCalendarUrl,
  CalendarExportEvent,
} from '../utils/calendarExport';

interface PersonalCalendarProps {
  focusedEventId?: string | null;
  onFocusedEventHandled?: () => void;
}

export const PersonalCalendar: React.FC<PersonalCalendarProps> = ({
  focusedEventId,
  onFocusedEventHandled,
}) => {
  const {
    settings,
    events,
    addPersonalEvent,
    updatePersonalEvent,
    deletePersonalEvent,
    activeYear,
    activeMonth,
    setActiveYearMonth,
  } = useApp();

  const lang = settings.language;
  const monthNames = getTranslation(lang, 'months');
  const daysShort = getTranslation(lang, 'daysShort'); // Lun, Mar, Mié, Jue, Vie, Sáb, Dom

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PersonalEvent | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<PersonalEvent['type']>('medical');
  const [date, setDate] = useState(() => {
    const formattedMonth = activeMonth.toString().padStart(2, '0');
    return `${activeYear}-${formattedMonth}-15`;
  });
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('17:00');
  const [reminderMinutes, setReminderMinutes] = useState(30);
  const [notes, setNotes] = useState('');
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [calendarEventToExport, setCalendarEventToExport] = useState<CalendarExportEvent | null>(null);
  const [isExportingCalendar, setIsExportingCalendar] = useState(false);
  const handleOpenAdd = (defaultDateStr?: string) => {
    setEditingEvent(null);
    setTitle('');
    setType('medical');
    if (defaultDateStr) {
      setDate(defaultDateStr);
    } else {
      const formattedMonth = activeMonth.toString().padStart(2, '0');
      setDate(`${activeYear}-${formattedMonth}-15`);
    }
    setStartTime('16:00');
    setEndTime('17:00');
    setReminderMinutes(30);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (evt: PersonalEvent) => {
    setEditingEvent(evt);
    setTitle(evt.title);
    setType(evt.type);
    setDate(evt.date);
    setStartTime(evt.startTime);
    setEndTime(evt.endTime);
    setReminderMinutes(evt.reminderMinutes);
    setNotes(evt.notes || '');
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!focusedEventId) return;

    const focusedEvent = events.find((event) => event.id === focusedEventId);
    if (focusedEvent) {
      const [eventYear, eventMonth] = focusedEvent.date.split('-').map(Number);
      setActiveYearMonth(eventYear, eventMonth);
      handleOpenEdit(focusedEvent);
    }

    onFocusedEventHandled?.();
  }, [focusedEventId, events]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const sendBrowserNotification = (message: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('TurnoFly', {
        body: message,
        icon: '/favicon.ico',
      });
    }
  };

  const showSaveNotification = async (eventTitle: string) => {
    const message = `Recordatorio guardado para "${eventTitle}"`;
    setSaveToast(message);
    window.setTimeout(() => {
      setSaveToast(null);
      setCalendarEventToExport(null);
    }, 10000);

    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        await requestNotificationPermission();
      }
    }
  };

  useEffect(() => {
    if (!settings.remindersEnabled) return;

    const now = Date.now();
    const timers = events
      .map((event) => {
        const eventTime = new Date(`${event.date}T${event.startTime}:00`).getTime();
        if (Number.isNaN(eventTime)) return undefined;

        const reminderTime = eventTime - event.reminderMinutes * 60 * 1000;
        const delay = reminderTime - now;
        const maxTimeout = 2_147_483_647;

        if (delay <= 0 || delay > maxTimeout) return undefined;

        return window.setTimeout(() => {
          sendBrowserNotification(`"${event.title}" comienza a las ${event.startTime}`);
        }, delay);
      })
      .filter((timer): timer is number => typeof timer === 'number');

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [events, settings.remindersEnabled]);

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    const savedEventData = {
      title: title.trim(),
      type,
      date,
      startTime,
      endTime,
      reminderMinutes,
      notes,
    };

    if (editingEvent) {
      const updatedEvent: PersonalEvent = {
        ...editingEvent,
        ...savedEventData,
      };
      updatePersonalEvent(updatedEvent);
      setCalendarEventToExport(updatedEvent);
    } else {
      addPersonalEvent(savedEventData);
      setCalendarEventToExport({
        ...savedEventData,
        id: `calendar_${Date.now()}`,
      });
    }

    await showSaveNotification(savedEventData.title);

    setIsModalOpen(false);
  };

  const handleAddToDeviceCalendar = async () => {
    if (!calendarEventToExport || isExportingCalendar) return;

    setIsExportingCalendar(true);
    try {
      const result = await addToDeviceCalendar(calendarEventToExport);
      setCalendarEventToExport(null);
      setSaveToast(
        result === 'shared'
          ? 'Evento enviado. Confirma la aplicación de calendario en tu teléfono.'
          : 'Archivo de calendario descargado. Ábrelo para confirmar el evento.'
      );
      window.setTimeout(() => setSaveToast(null), 6000);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setSaveToast('No se pudo abrir el calendario del teléfono. Inténtalo nuevamente.');
    } finally {
      setIsExportingCalendar(false);
    }
  };

  const handleAddToGoogleCalendar = () => {
    if (!calendarEventToExport || isExportingCalendar) return;

    try {
      const googleCalendarUrl = buildGoogleCalendarUrl(calendarEventToExport);
      window.open(googleCalendarUrl, '_blank', 'noopener,noreferrer');
      setCalendarEventToExport(null);
      setSaveToast('Google Calendar abierto. Confirma el evento para guardarlo.');
      window.setTimeout(() => setSaveToast(null), 6000);
    } catch {
      setSaveToast('No se pudo abrir Google Calendar. Inténtalo nuevamente.');
    }
  };

  const getTypeIcon = (t: PersonalEvent['type']) => {
    switch (t) {
      case 'medical':
        return <Stethoscope className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
      case 'gym':
        return <Dumbbell className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'family':
        return <Users className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
      case 'study':
        return <GraduationCap className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
      case 'work':
        return <Briefcase className="w-3.5 h-3.5 text-sky-500 shrink-0" />;
      default:
        return <CalendarIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
    }
  };

  const daysInMonth = new Date(activeYear, activeMonth, 0).getDate();
  const firstDayOfWeek = (new Date(activeYear, activeMonth - 1, 1).getDay() + 6) % 7; // Monday = 0

  const handlePrevMonth = () => {
    if (activeMonth === 1) {
      setActiveYearMonth(activeYear - 1, 12);
    } else {
      setActiveYearMonth(activeYear, activeMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (activeMonth === 12) {
      setActiveYearMonth(activeYear + 1, 1);
    } else {
      setActiveYearMonth(activeYear, activeMonth + 1);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6 overflow-x-hidden w-full">
      {saveToast && (
        <div className="relative p-3.5 pr-10 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 text-xs font-black flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in" role="status" aria-live="polite">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            <span>{saveToast}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
            {calendarEventToExport && (
              <>
                <button
                  type="button"
                  onClick={handleAddToDeviceCalendar}
                  disabled={isExportingCalendar}
                  className="min-h-10 px-3 py-2 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 active:scale-[0.97] transition-all font-black text-[11px] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70"
                >
                  {isExportingCalendar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CalendarPlus className="w-4 h-4" />
                  )}
                  <span>{isExportingCalendar ? 'Abriendo...' : 'Calendario del teléfono'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddToGoogleCalendar}
                  disabled={isExportingCalendar}
                  className="min-h-10 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-[0.97] transition-all font-black text-[11px] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Google Calendar</span>
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setSaveToast(null);
              setCalendarEventToExport(null);
            }}
            className="absolute top-3 right-3 p-1 text-white/80 hover:text-white active:scale-90 transition-transform cursor-pointer"
            aria-label="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Calendar header */}
      <div className="p-4 sm:p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Agenda Personal y Citas</span>
          </h1>

          {/* Controls Cluster */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Month Selector */}
            <div className="flex items-center gap-0.5 bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-300/60 dark:border-slate-700 shadow-inner">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer active:scale-90"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {monthNames[activeMonth - 1].substring(0, 3)} {activeYear}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer active:scale-90"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Add Event Button */}
            <button
              onClick={() => handleOpenAdd()}
              id="add-personal-event-btn"
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Cita</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar Container */}
      <div className="p-3 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 w-full max-w-full overflow-x-hidden">
        <div>
          <p className="text-[10px] font-bold text-center text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            💡 Toca un día para agregar una cita personal
          </p>

          <div className="w-full">
              {/* Day Header Row starting Monday */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
                {daysShort.map((d: string) => (
                  <span key={d} className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider">
                    {d.substring(0, 2)}
                  </span>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {/* Empty Padding Cells */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div
                    key={`empty_${i}`}
                    className="h-14 sm:h-20 rounded-xl bg-slate-50/40 dark:bg-slate-800/20 border border-transparent"
                  />
                ))}

                {/* Actual Days */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const formattedMonth = activeMonth.toString().padStart(2, '0');
                  const formattedDay = dayNum.toString().padStart(2, '0');
                  const dateStr = `${activeYear}-${formattedMonth}-${formattedDay}`;

                  const dayEvents = events.filter((e) => e.date === dateStr);

                  const today = new Date();
                  const isToday = activeYear === today.getFullYear() && activeMonth === (today.getMonth() + 1) && dayNum === today.getDate();

                  return (
                    <div
                      key={dateStr}
                      onClick={() => handleOpenAdd(dateStr)}
                      className={`h-16 sm:h-20 p-1 rounded-xl border flex flex-col justify-between items-stretch transition-all cursor-pointer active:scale-95 shadow-2xs relative ${
                        isToday
                          ? 'ring-4 ring-amber-400 dark:ring-amber-400 border-amber-400 bg-amber-50 dark:bg-amber-950/50 shadow-md z-10 scale-[1.03]'
                          : dayEvents.length > 0
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
                          : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700/50 hover:border-indigo-400'
                      }`}
                    >
                      {/* Top Row: Day Number + HOY Badge */}
                      <div className="w-full flex items-center justify-between px-0.5 leading-none">
                        <span className={`text-[10px] sm:text-xs font-black ${isToday ? 'text-amber-950 dark:text-amber-300' : 'text-slate-800 dark:text-slate-200'}`}>
                          {dayNum}
                        </span>
                        {isToday && (
                          <span className="px-1 py-0.2 text-[7px] sm:text-[8px] font-black uppercase tracking-tighter bg-amber-400 text-slate-950 rounded-full shadow-xs animate-pulse">
                            HOY
                          </span>
                        )}
                      </div>

                      {/* Center: Events List / Indicator */}
                      <div className="space-y-0.5 my-auto overflow-hidden">
                        {dayEvents.slice(0, 2).map((evt) => (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(evt);
                            }}
                            className="p-0.5 rounded bg-white dark:bg-slate-800 text-[9px] font-extrabold text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 truncate flex items-center gap-0.5"
                          >
                            {getTypeIcon(evt.type)}
                            <span className="truncate">{evt.title}</span>
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 block text-center">
                            +{dayEvents.length - 2} más
                          </span>
                        )}
                      </div>

                      {/* Bottom Label */}
                      <span className="text-[8px] text-slate-400 text-center uppercase tracking-tighter">
                        {dayEvents.length > 0 ? `${dayEvents.length} cita(s)` : '+ cita'}
                      </span>
                    </div>
                  );
                })}
              </div>
          </div>
        </div>
      </div>

      {/* ADD / EDIT EVENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto glass-card">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {editingEvent ? 'Editar Cita Personal' : 'Nueva Cita Personal'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer active:scale-90 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {getTranslation(lang, 'eventTitle')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cita médica de rutina"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {getTranslation(lang, 'eventType')}
                  </label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium outline-none"
                  >
                    <option value="medical">🩺 Médico</option>
                    <option value="gym">🏋️ Gimnasio</option>
                    <option value="family">👨‍👩‍👧 Familiar</option>
                    <option value="study">🎓 Estudios</option>
                    <option value="work">💼 Trabajo</option>
                    <option value="other">📌 Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {getTranslation(lang, 'eventDate')}
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {getTranslation(lang, 'startTime')}
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                  />
                </div>

                <div className="min-w-0">
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {getTranslation(lang, 'endTime')}
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {getTranslation(lang, 'reminder')}
                </label>
                <select
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium outline-none"
                >
                  <option value={15}>15 minutos antes</option>
                  <option value={30}>30 minutos antes</option>
                  <option value={60}>1 hora antes</option>
                  <option value={120}>2 horas antes</option>
                  <option value={1440}>1 día antes</option>
                </select>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4">
                {editingEvent ? (
                  <button
                    type="button"
                    onClick={() => {
                      deletePersonalEvent(editingEvent.id);
                      setIsModalOpen(false);
                    }}
                    className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
                  >
                    {getTranslation(lang, 'cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md cursor-pointer"
                  >
                    {getTranslation(lang, 'saveChanges')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
