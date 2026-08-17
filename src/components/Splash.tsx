import React, { useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CalendarDays, Clock } from 'lucide-react';
import { getTranslation } from '../utils/i18n';
import type { Language } from '../types';

interface SplashProps {
  onFinish: () => void;
}

const shiftTiles = [
  { day: 'Lun', code: 'M', tone: 'bg-indigo-600 text-white border-indigo-500', origin: { x: 160, y: 250, rotate: 150 } },
  { day: 'Mar', code: 'T', tone: 'bg-amber-400 text-amber-950 border-amber-300', origin: { x: -120, y: 180, rotate: -120 } },
  { day: 'Mié', code: 'N', tone: 'bg-slate-800 text-white border-slate-700', origin: { x: 0, y: 280, rotate: 180 } },
  { day: 'Jue', code: 'L', tone: 'bg-emerald-500 text-white border-emerald-400', origin: { x: 130, y: -100, rotate: 110 } },
  { day: 'Vie', code: 'A', tone: 'bg-sky-500 text-white border-sky-400', origin: { x: -170, y: -80, rotate: -150 } },
];

const brandOrigins = [
  { x: -90, y: 0, rotate: -18 },
  { x: 0, y: -80, rotate: 14 },
  { x: 85, y: 0, rotate: 18 },
  { x: 0, y: 80, rotate: -14 },
];

export const Splash: React.FC<SplashProps> = ({ onFinish }) => {
  const reduceMotion = useReducedMotion();
  const browserLanguage = typeof navigator === 'undefined' ? 'es' : navigator.language.slice(0, 2);
  const lang: Language = browserLanguage === 'en' || browserLanguage === 'pt' ? browserLanguage : 'es';

  useEffect(() => {
    const timer = window.setTimeout(onFinish, reduceMotion ? 900 : 5000);
    return () => window.clearTimeout(timer);
  }, [onFinish, reduceMotion]);

  return (
    <div
      className="relative min-h-[100svh] w-full overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-white select-none"
      role="status"
      aria-live="polite"
      aria-label="Cargando TurnoFly"
    >
      <div className="absolute inset-x-0 top-[8vh] px-4 sm:px-8">
        <div className="mx-auto max-w-xl">
          <motion.p
            className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.35 }}
          >
            Organizando tus turnos
          </motion.p>

          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {shiftTiles.map((shift, index) => {
              return (
                <motion.div
                  key={shift.day}
                  className="flex min-w-0 flex-col items-center gap-1.5"
                  initial={
                    reduceMotion
                      ? false
                      : {
                          opacity: 0,
                          x: shift.origin.x,
                          y: shift.origin.y,
                          rotate: shift.origin.rotate,
                          scale: 0.12,
                        }
                  }
                  animate={
                    reduceMotion
                      ? { opacity: 1 }
                      : {
                          opacity: [0, 1, 1],
                          x: [shift.origin.x, shift.origin.x * 0.16, 0],
                          y: [shift.origin.y, -12, 0],
                          rotate: [shift.origin.rotate, -8, 0],
                          scale: [0.12, 1.16, 1],
                        }
                  }
                  transition={{
                    delay: 0.12 + index * 0.1,
                    duration: 1.15,
                    times: [0, 0.78, 1],
                    ease: 'easeOut',
                  }}
                >
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {shift.day}
                  </span>
                  <div
                    className={`flex aspect-square w-full max-w-14 items-center justify-center rounded-xl sm:rounded-2xl border text-sm sm:text-base font-black shadow-md ${shift.tone}`}
                  >
                    {shift.code}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            className="relative mt-4 h-6"
            initial={reduceMotion ? false : { opacity: 0, scaleX: 0.2 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: reduceMotion ? 0 : 1.1, duration: 0.45 }}
          >
            <div className="absolute inset-x-2 top-1/2 h-px bg-slate-300 dark:bg-slate-700" />
            <motion.div
              className="absolute top-0 flex h-6 w-6 items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
              initial={{ left: '0%' }}
              animate={{ left: 'calc(100% - 1.5rem)' }}
              transition={{ delay: reduceMotion ? 0 : 1.35, duration: reduceMotion ? 0.4 : 1.55, ease: 'easeInOut' }}
            >
              <Clock className="h-3.5 w-3.5" />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {!reduceMotion && (
        <motion.div
          className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-400/60"
          initial={{ opacity: 0, scale: 0.1 }}
          animate={{ opacity: [0, 0.9, 0], scale: [0.1, 1.2, 4.4] }}
          transition={{ duration: 1.25, ease: 'easeOut' }}
        />
      )}

      <div className="absolute inset-0 flex items-center justify-center px-5 pt-20">
        <div className="flex flex-col items-center text-center">
          <motion.div
            className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-200 dark:shadow-indigo-950/40"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.15, rotate: -160 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.82, type: 'spring', stiffness: 180, damping: 14 }}
          >
            <motion.div
              animate={reduceMotion ? undefined : { rotate: [0, -9, 9, 0], scale: [1, 0.92, 1.08, 1] }}
              transition={{ delay: 1.25, duration: 0.8, ease: 'easeInOut' }}
            >
              <CalendarDays className="h-9 w-9" />
            </motion.div>
          </motion.div>

          <h1 className="flex flex-wrap justify-center text-4xl sm:text-5xl font-black text-slate-950 dark:text-white">
            {getTranslation(lang, 'appName')
              .split('')
              .map((letter, index) => {
                const origin = brandOrigins[index % brandOrigins.length];

                return (
                  <motion.span
                    key={`${letter}-${index}`}
                    initial={reduceMotion ? false : { opacity: 0, x: origin.x, y: origin.y, rotate: origin.rotate, scale: 0.4 }}
                    animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
                    transition={{
                      delay: reduceMotion ? 0 : 1.25 + index * 0.08,
                      type: 'spring',
                      stiffness: 220,
                      damping: 15,
                    }}
                  >
                    {letter}
                  </motion.span>
                );
              })}
          </h1>

          <motion.p
            className="mt-3 max-w-sm text-sm sm:text-base font-medium text-slate-500 dark:text-slate-300"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 2.15, duration: 0.45 }}
          >
            {getTranslation(lang, 'tagline')}
          </motion.p>

          <div className="mt-8 h-1 w-44 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <motion.div
              className="h-full origin-left rounded-full bg-indigo-600"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: reduceMotion ? 0 : 0.25, duration: reduceMotion ? 0.6 : 4.25, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
