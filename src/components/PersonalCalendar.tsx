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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../utils/i18n';
import { PersonalEvent } from '../types';
import {
  buildDeviceCalendarUrl,
  buildGoogleCalendarUrl,
  CalendarExportEvent,
  getSuggestedEventEndTime,
} from '../utils/calendarExport';
import { getPersonalEventStatus } from '../utils/personalEventStatus';

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
    activeWorker,
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
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [eventPendingDeletion, setEventPendingDeletion] = useState<PersonalEvent | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const handleOpenAdd = (defaultDateStr?: string) => {
    if (!activeWorker) return;
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
    setEventPendingDeletion(null);
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
    setEventPendingDeletion(null);
    setIsModalOpen(true);
  };

  const handleStartTimeChange = (nextStartTime: string) => {
    setStartTime(nextStartTime);
    if (nextStartTime) {
      setEndTime(getSuggestedEventEndTime(nextStartTime));
    }
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

  useEffect(() => {
    if (!editingEvent || editingEvent.workerId === activeWorker?.id) return;
    setEditingEvent(null);
    setEventPendingDeletion(null);
    setIsModalOpen(false);
  }, [activeWorker?.id, editingEvent]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const sendBrowserNotification = (message: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('TurnoFly', {
        body: message,
        icon: '/icons/turnofly-192.png',
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

  const handleDeviceCalendarOpened = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!deviceCalendarUrl) {
      event.preventDefault();
      setSaveToast('No se pudo preparar el calendario del teléfono. Revisa la fecha y las horas.');
      return;
    }

    setSaveToast('Calendario abierto. Confirma Agregar para guardar la cita y su recordatorio.');
    window.setTimeout(() => setCalendarEventToExport(null), 1000);
    window.setTimeout(() => setSaveToast(null), 6000);
  };

  const handleGoogleCalendarOpened = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!googleCalendarUrl) {
      event.preventDefault();
      setSaveToast('No se pudo preparar Google Calendar. Revisa la fecha y las horas.');
      return;
    }

    setSaveToast('Google Calendar abierto. Confirma el evento para guardarlo.');
    window.setTimeout(() => setCalendarEventToExport(null), 1000);
    window.setTimeout(() => setSaveToast(null), 6000);
  };

  let googleCalendarUrl: string | undefined;
  let deviceCalendarUrl: string | undefined;
  try {
    googleCalendarUrl = calendarEventToExport
      ? buildGoogleCalendarUrl(calendarEventToExport)
      : undefined;
    deviceCalendarUrl = calendarEventToExport
      ? buildDeviceCalendarUrl(calendarEventToExport)
      : undefined;
  } catch {
    googleCalendarUrl = undefined;
    deviceCalendarUrl = undefined;
  }

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

  const editingEventStatus = editingEvent
    ? getPersonalEventStatus(editingEvent, currentTime)
    : null;

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
                <a
                  href={deviceCalendarUrl}
                  referrerPolicy="no-referrer"
                  onClick={handleDeviceCalendarOpened}
                  className="min-h-10 px-3 py-2 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 active:scale-[0.97] transition-all font-black text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>Calendario del teléfono</span>
                </a>
                <a
                  href={googleCalendarUrl}
                  target="_blank"
                  rel="noopener noreferrer external"
                  referrerPolicy="no-referrer"
                  onClick={handleGoogleCalendarOpened}
                  className="min-h-10 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-[0.97] transition-all font-black text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Google Calendar</span>
                </a>
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
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Agenda Personal y Citas</span>
            </h1>
            {activeWorker && (
              <p className="mt-1 truncate pl-7 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Citas de {activeWorker.name}
              </p>
            )}
          </div>

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
              disabled={!activeWorker}
              id="add-personal-event-btn"
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>+ Cita</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar Container */}
      <div className="app-surface p-3 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 w-full max-w-full overflow-x-hidden">
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
                  const dayEventStatuses = dayEvents.map((event) =>
                    getPersonalEventStatus(event, currentTime)
                  );
                  const hasOngoingEvent = dayEventStatuses.includes('ongoing');
                  const hasUpcomingEvent = dayEventStatuses.includes('upcoming');
                  const hasOnlyCompletedEvents =
                    dayEvents.length > 0 &&
                    dayEventStatuses.every((status) => status === 'completed');

                  const today = new Date(currentTime);
                  const isToday = activeYear === today.getFullYear() && activeMonth === (today.getMonth() + 1) && dayNum === today.getDate();

                  return (
                    <div
                      key={dateStr}
                      onClick={() => handleOpenAdd(dateStr)}
                      className={`h-16 sm:h-20 p-1 rounded-xl border flex flex-col justify-between items-stretch transition-all cursor-pointer active:scale-95 shadow-2xs relative ${
                        isToday
                          ? 'ring-4 ring-amber-400 dark:ring-amber-400 border-amber-400 bg-amber-50 dark:bg-amber-950/50 shadow-md z-10 scale-[1.03]'
                          : hasOngoingEvent
                          ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                          : hasUpcomingEvent
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800'
                          : hasOnlyCompletedEvents
                          ? 'bg-slate-100/80 dark:bg-slate-800/70 border-slate-300 dark:border-slate-700'
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
                        {dayEvents.slice(0, 2).map((evt) => {
                          const status = getPersonalEventStatus(evt, currentTime);

                          return (
                            <div
                              key={evt.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(evt);
                              }}
                              className={`p-0.5 rounded text-[9px] font-extrabold border truncate flex items-center gap-0.5 ${
                                status === 'completed'
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 opacity-80'
                                  : status === 'ongoing'
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                                  : 'bg-white dark:bg-slate-800 text-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800'
                              }`}
                            >
                              {status === 'completed' ? (
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              ) : (
                                getTypeIcon(evt.type)
                              )}
                              <span className={`truncate ${status === 'completed' ? 'line-through' : ''}`}>
                                {evt.title}
                              </span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 block text-center">
                            +{dayEvents.length - 2} más
                          </span>
                        )}
                      </div>

                      {/* Bottom Label */}
                      <span className="text-[8px] text-slate-400 text-center uppercase tracking-tighter">
                        {hasOnlyCompletedEvents
                          ? dayEvents.length === 1
                            ? 'Finalizada'
                            : 'Finalizadas'
                          : dayEvents.length > 0
                          ? `${dayEvents.length} cita(s)`
                          : '+ cita'}
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
          <div className="relative w-full max-w-lg my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-x-hidden overflow-y-auto glass-card">
            
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
              {activeWorker && (
                <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
                  <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate font-semibold">
                    Cita para <strong>{activeWorker.name}</strong>
                  </span>
                </div>
              )}
              {editingEventStatus === 'completed' && (
                <div className="rounded-2xl border border-slate-200 bg-slate-100 px-3 py-3 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                    <div>
                      <p className="font-black">Cita finalizada</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                        Puedes conservarla como historial o eliminarla de TurnoFly.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {editingEventStatus === 'ongoing' && (
                <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 font-black text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  <CalendarIcon className="h-4 w-4 shrink-0" />
                  Esta cita está en curso.
                </div>
              )}
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

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div className="min-w-0">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {getTranslation(lang, 'eventType')}
                  </label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="block w-full min-w-0 max-w-full h-11 px-3 py-0 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium outline-none"
                  >
                    <option value="medical">🩺 Médico</option>
                    <option value="gym">🏋️ Gimnasio</option>
                    <option value="family">👨‍👩‍👧 Familiar</option>
                    <option value="study">🎓 Estudios</option>
                    <option value="work">💼 Trabajo</option>
                    <option value="other">📌 Otro</option>
                  </select>
                </div>

                <div className="min-w-0">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {getTranslation(lang, 'eventDate')}
                  </label>
                  <div className="date-input-frame rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow">
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="date-input-control h-11 px-3 py-0 bg-transparent border-0 text-center text-slate-900 dark:text-white font-medium cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {getTranslation(lang, 'startTime')}
                  </label>
                  <div className="time-input-frame rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow">
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      className="time-input-control h-11 px-3 py-0 bg-transparent border-0 text-center text-slate-900 dark:text-white font-bold text-sm cursor-pointer"
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {getTranslation(lang, 'endTime')}
                  </label>
                  <div className="time-input-frame rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow">
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="time-input-control h-11 px-3 py-0 bg-transparent border-0 text-center text-slate-900 dark:text-white font-bold text-sm cursor-pointer"
                    />
                  </div>
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
                    onClick={() => setEventPendingDeletion(editingEvent)}
                    className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-bold flex items-center gap-1 cursor-pointer border border-rose-200 dark:border-rose-900"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar cita</span>
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

      {eventPendingDeletion && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-event-title"
            className="w-full max-w-sm rounded-3xl border border-rose-200 bg-white p-5 shadow-2xl dark:border-rose-900 dark:bg-slate-900"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300">
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 id="delete-event-title" className="text-base font-black text-slate-950 dark:text-white">
                  Eliminar cita
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  ¿Deseas eliminar “{eventPendingDeletion.title}” de TurnoFly? Esta acción no la
                  eliminará de Google Calendar ni del calendario del teléfono.
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEventPendingDeletion(null)}
                className="min-h-11 rounded-xl px-3 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Conservar
              </button>
              <button
                type="button"
                onClick={() => {
                  deletePersonalEvent(eventPendingDeletion.id);
                  setEventPendingDeletion(null);
                  setIsModalOpen(false);
                }}
                className="min-h-11 rounded-xl bg-rose-600 px-3 text-xs font-black text-white shadow-md hover:bg-rose-500 active:scale-[0.98]"
              >
                Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
