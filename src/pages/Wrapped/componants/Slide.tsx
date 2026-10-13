import { ReactNode } from 'react';
import { motion } from 'motion/react';
import './Slide.scss';

interface SlideProps {
  children: ReactNode;
}

const Slide = ({ children }: SlideProps) => {
  return (
    <motion.div
      className='Slide'
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.8 }}
    >
      {children}
    </motion.div>
  );
};

export default Slide;
