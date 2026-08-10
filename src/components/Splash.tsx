import React from 'react';
import { motion } from 'motion/react';
import { Calendar, Plane, Sparkles, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../utils/i18n';

interface SplashProps {
  onFinish: () => void;
}

export const Splash: React.FC<SplashProps> = ({ onFinish }) => {
  const { settings } = useApp();
  const lang = settings.language;

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white overflow-hidden select-none">
      {/* Background Animated Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293715_1px,transparent_1px),linear-gradient(to_bottom,#1f293715_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Glow Orbs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none animate-pulse delay-1000" />

      {/* Content Container */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center text-center p-8 max-w-lg mx-auto"
      >
        {/* Animated Brand Icon */}
        <motion.div
          animate={{
            y: [0, -8, 0],
            rotate: [0, 2, -2, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative mb-8"
        >
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-sky-400 p-0.5 shadow-2xl shadow-indigo-500/30 flex items-center justify-center">
            <div className="w-full h-full bg-slate-900/90 rounded-[22px] flex items-center justify-center backdrop-blur-xl relative overflow-hidden">
              <Calendar className="w-12 h-12 text-sky-400" />
              <Plane className="w-8 h-8 text-indigo-300 absolute top-3 right-3 transform rotate-12" />
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 p-2 rounded-full shadow-lg">
            <Sparkles className="w-4 h-4 text-slate-950" />
          </div>
        </motion.div>

        {/* Brand Name */}
        <h1 className="text-5xl font-black tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white via-sky-100 to-indigo-200">
          {getTranslation(lang, 'appName')}
        </h1>

        {/* Tagline */}
        <p className="text-xl font-medium text-sky-200/90 mb-4">
          {getTranslation(lang, 'tagline')}
        </p>

        {/* Subtitle */}
        <p className="text-sm text-slate-400 max-w-sm mb-10 leading-relaxed">
          {getTranslation(lang, 'splashSubtitle')}
        </p>

        {/* Features Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10 text-xs font-medium text-slate-300">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 backdrop-blur-md">
            <Clock className="w-3.5 h-3.5 text-sky-400" /> Importador Excel
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Hive Local Seguro
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Detección Conflictos
          </span>
        </div>

        {/* Enter Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={onFinish}
          id="splash-enter-btn"
          className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-blue-600 text-white font-bold text-lg shadow-xl shadow-indigo-500/25 flex items-center gap-3 hover:shadow-indigo-500/40 transition-all cursor-pointer"
        >
          <span>{getTranslation(lang, 'enterApp')}</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </motion.div>
    </div>
  );
};
