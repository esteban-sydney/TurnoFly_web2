import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
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
  LayoutGrid,
  ListFilter,
  Edit3,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../utils/i18n';
import { PersonalEvent } from '../types';

export const PersonalCalendar: React.FC = () => {
  const {
    settings,
    events,
    conflicts,
    addPersonalEvent,
    updatePersonalEvent,
    deletePersonalEvent,
    suspendConflict,
    activeYear,
    activeMonth,
    setActiveYearMonth,
  } = useApp();

  const lang = settings.language;
  const monthNames = getTranslation(lang, 'months');
  const daysShort = getTranslation(lang, 'daysShort'); // Lun, Mar, Mié, Jue, Vie, Sáb, Dom

  const [calendarViewMode, setCalendarViewMode] = useState<'cellular' | 'agenda'>('cellular');
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

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    if (editingEvent) {
      updatePersonalEvent({
        ...editingEvent,
        title,
        type,
        date,
        startTime,
        endTime,
        reminderMinutes,
        notes,
      });
    } else {
      addPersonalEvent({
        title,
        type,
        date,
        startTime,
        endTime,
        reminderMinutes,
        notes,
      });
    }

    setIsModalOpen(false);
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

  const activeConflicts = conflicts.filter((c) => !c.isSuspended);

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6 overflow-x-hidden w-full">
      
      {/* Header Bar - Mobile Clean & Spacious (Identical to Mis Turnos) */}
      <div className="p-4 sm:p-6 rounded-3xl glass-card border border-slate-200/80 dark:border-slate-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>{getTranslation(lang, 'personalCalendarTitle')}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300/60 dark:border-indigo-800">
                <Clock className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                <span>{monthNames[activeMonth - 1]} {activeYear}</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Agenda Personal & Citas
            </h1>
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

            {/* View Switcher: Celular vs Lista */}
            <div className="flex bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-300/60 dark:border-slate-700 shadow-inner">
              <button
                onClick={() => setCalendarViewMode('cellular')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
                  calendarViewMode === 'cellular'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
                title="Vista Cuadrícula Celular"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Celular</span>
              </button>
              <button
                onClick={() => setCalendarViewMode('agenda')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
                  calendarViewMode === 'agenda'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
                title="Vista Lista Citas"
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Lista</span>
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

      {/* Conflict Warnings Banner */}
      {activeConflicts.length > 0 ? (
        <div className="p-4 rounded-3xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-bounce" />
              <span className="font-extrabold text-amber-950 dark:text-amber-200 uppercase tracking-wider">
                Cruces de Horarios ({activeConflicts.length})
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {activeConflicts.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    Cita <strong className="text-amber-900 dark:text-amber-300">"{c.eventTitle}"</strong> ({c.eventTime}) coincide con Turno <span className="font-extrabold text-indigo-600 dark:text-indigo-400">[{c.shiftCode}]</span> el <span className="font-semibold">{c.eventDate}</span>.
                  </p>
                </div>
                <button
                  onClick={() => suspendConflict(c.id)}
                  className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-colors shrink-0 self-end sm:self-auto cursor-pointer"
                >
                  Ignorar
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-2.5 text-xs font-bold text-emerald-950 dark:text-emerald-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>No hay choques de horario con tus turnos de trabajo.</span>
        </div>
      )}

      {/* Main Calendar Container */}
      <div className="p-3 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 w-full max-w-full overflow-x-hidden">
        {calendarViewMode === 'cellular' ? (
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
        ) : (
          /* List / Agenda View */
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Lista Completa de Citas Personales - {monthNames[activeMonth - 1]} {activeYear}
              </span>
              <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400">
                {events.length} Cita(s) Registrada(s)
              </span>
            </div>

            {events.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => handleOpenEdit(evt)}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 hover:border-indigo-500 transition-all cursor-pointer flex items-start justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shrink-0">
                        {getTypeIcon(evt.type)}
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
                          {evt.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          📅 {evt.date} ({evt.startTime} - {evt.endTime})
                        </p>
                        {evt.notes && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 line-clamp-1 italic">
                            "{evt.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <button className="p-1 rounded-lg text-slate-400 hover:text-indigo-600">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center space-y-2 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  No tienes citas personales programadas en este período.
                </p>
                <button
                  onClick={() => handleOpenAdd()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Primera Cita</span>
                </button>
              </div>
            )}
          </div>
        )}
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
