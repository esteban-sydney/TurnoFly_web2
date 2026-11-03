import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, Save, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ShiftCodeDefinition } from '../types';

interface ShiftDefinitionsModalProps {
  onClose: () => void;
}

export const ShiftDefinitionsModal: React.FC<ShiftDefinitionsModalProps> = ({ onClose }) => {
  const { shiftDefinitions, saveShiftDefinition } = useApp();
  const codes = useMemo(() => Object.keys(shiftDefinitions).sort(), [shiftDefinitions]);
  const [selectedCode, setSelectedCode] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  const [isWorkDay, setIsWorkDay] = useState(true);
  const [message, setMessage] = useState('');

  const loadDefinition = (nextCode: string) => {
    const definition = shiftDefinitions[nextCode];
    if (!definition) return;
    setSelectedCode(nextCode);
    setStartTime(definition.defaultStartTime || '08:00');
    setEndTime(definition.defaultEndTime || '16:00');
    setIsWorkDay(definition.isWorkDay);
    setMessage('');
  };

  useEffect(() => {
    if (selectedCode || codes.length === 0) return;
    const nextCode = codes[0];
    const definition = shiftDefinitions[nextCode];
    setSelectedCode(nextCode);
    setStartTime(definition.defaultStartTime || '08:00');
    setEndTime(definition.defaultEndTime || '16:00');
    setIsWorkDay(definition.isWorkDay);
  }, [codes, selectedCode, shiftDefinitions]);

  const handleSave = () => {
    const currentDefinition = shiftDefinitions[selectedCode];
    if (!currentDefinition) {
      setMessage('Selecciona un acrónimo para modificar.');
      return;
    }
    const definition: ShiftCodeDefinition = {
      ...currentDefinition,
      defaultStartTime: isWorkDay ? startTime : '',
      defaultEndTime: isWorkDay ? endTime : '',
      isWorkDay,
    };
    saveShiftDefinition(definition);
    setMessage(`Turno ${selectedCode} guardado. Se actualizaron todos los días con ese acrónimo, incluidos los horarios editados manualmente.`);
  };

  const inputClass = 'min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="shift-definitions-title" className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <Clock3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 id="shift-definitions-title" className="text-base font-black text-slate-900 dark:text-white">Catálogo de turnos</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tus acrónimos y horarios quedan guardados en tu cuenta.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-xl p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"><X className="h-5 w-5" /></button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 md:p-5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Acrónimo a modificar
              <select value={selectedCode} onChange={(event) => loadDefinition(event.target.value)} className={`${inputClass} mt-1`}>
                {codes.map((item) => <option key={item} value={item}>{item} — {shiftDefinitions[item].name}</option>)}
              </select>
          </label>

          <div className="space-y-3">
            <label className="flex min-h-11 items-center justify-between rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300">Cuenta como día trabajado
              <input type="checkbox" checked={isWorkDay} onChange={(event) => setIsWorkDay(event.target.checked)} className="h-5 w-5 accent-indigo-600" />
            </label>
            {isWorkDay && <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Inicio<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className={`${inputClass} mt-1`} /></label>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Término<input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className={`${inputClass} mt-1`} /></label>
            </div>}
            <p className="text-[11px] leading-relaxed text-slate-500">Al guardar, este horario se aplicará a todos los días de todos tus trabajadores con este acrónimo, incluidos los horarios editados manualmente.</p>
            {message && <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">{message}</p>}
            <button type="button" onClick={handleSave} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-black text-white hover:bg-indigo-500"><Save className="h-4 w-4" /> Guardar definición</button>
          </div>
        </div>
        <footer className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/50"><button type="button" onClick={onClose} className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-800 dark:bg-slate-700 dark:text-white">Listo</button></footer>
      </section>
    </div>
  );
};
