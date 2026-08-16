export const buttonMotion = {
  whileHover: { scale: 1.04, y: -1 },
  whileTap: { scale: 0.96, y: 0 },
  transition: { type: 'spring' as const, stiffness: 260, damping: 24 },
};

export const cardMotion = {
  whileHover: { translateY: -2, scale: 1.01 },
  whileTap: { scale: 0.995 },
  transition: { type: 'spring' as const, stiffness: 220, damping: 20 },
};

export const resetMotion = {
  animate: { rotate: [0, 10, -10, 0], scale: [1, 1.04, 0.98, 1] },
  transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
};

export const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: 'ease-out' },
};
