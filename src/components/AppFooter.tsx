import React from 'react';
import { motion } from 'motion/react';

export const AppFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <motion.footer
      className="border-t border-slate-200/80 bg-white/55 dark:border-slate-800 dark:bg-slate-950/55"
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="grid h-0.5 grid-cols-5" aria-hidden="true">
        <span className="bg-indigo-500" />
        <span className="bg-amber-400" />
        <span className="bg-slate-700 dark:bg-slate-500" />
        <span className="bg-emerald-500" />
        <span className="bg-sky-500" />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-1 px-4 py-3 text-center text-[10px] text-slate-500 dark:text-slate-400 sm:flex-row sm:gap-2">
        <p>
          Diseñado por{' '}
          <span className="font-black text-slate-700 dark:text-slate-200">Esteban Varas</span>
          <span className="mx-1.5 text-indigo-500" aria-hidden="true">·</span>
          Ingeniero Informático
        </p>
        <span className="hidden text-slate-300 dark:text-slate-700 sm:inline" aria-hidden="true">|</span>
        <p>© {currentYear} TurnoFly</p>
      </div>
    </motion.footer>
  );
};
