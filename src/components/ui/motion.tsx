import { motion, type HTMLMotionProps } from 'motion/react';

// Motion transition variants
export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { duration: 0.35, ease: 'easeOut' as const } 
  },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const slideUpVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1.0] as const } 
  },
  exit: { opacity: 0, y: 8, transition: { duration: 0.2 } },
};

export const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

export const cardItemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
};

// Reusable page wrapper with smooth entrance
export function MotionPage({
  children,
  className = '',
  ...props
}: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Reusable interactive motion card
export function MotionCard({
  children,
  className = '',
  whileHover = { y: -2, transition: { duration: 0.2 } },
  ...props
}: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      variants={cardItemVariants}
      whileHover={whileHover}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Reusable micro-interactive button
export function MotionButton({
  children,
  className = '',
  whileHover = { scale: 1.02 },
  whileTap = { scale: 0.98 },
  ...props
}: HTMLMotionProps<'button'>) {
  return (
    <motion.button
      whileHover={whileHover}
      whileTap={whileTap}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
}
