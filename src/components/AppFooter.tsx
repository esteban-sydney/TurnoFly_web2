import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';

export const AppFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <motion.footer
      className="border-t border-slate-200/80 bg-white/55 dark:border-slate-800 dark:bg-slate-950/55"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="grid h-1 grid-cols-5" aria-hidden="true">
        <span className="bg-indigo-500" />
        <span className="bg-amber-400" />
        <span className="bg-slate-700 dark:bg-slate-500" />
        <span className="bg-emerald-500" />
        <span className="bg-sky-500" />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-sm font-black text-white shadow-sm shadow-indigo-600/20">
            T
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-slate-950 dark:text-white">
                Turno<span className="text-indigo-600 dark:text-indigo-400">Fly</span>
              </p>
              <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Turnos y citas personales en un solo lugar.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 sm:items-end">
          <p className="flex items-center gap-1.5 font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            Datos separados y protegidos por cuenta
          </p>
          <p>© {currentYear} TurnoFly</p>
        </div>
      </div>
    </motion.footer>
  );
};
