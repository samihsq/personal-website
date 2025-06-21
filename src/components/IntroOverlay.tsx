import { motion } from "framer-motion";
import { useEffect } from "react";
import "./IntroOverlay.css";

interface Props {
  onComplete: () => void;
}

const IntroOverlay = ({ onComplete }: Props) => {
  // after 3s, complete
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="intro-overlay"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6 } }}
    >
      <motion.div
        className="intro-text"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.h1 layoutId="mainTitle">
          Hi, I'm <span className="highlight">Samih.</span>
        </motion.h1>
        <p>CS, Stanford '27</p>
      </motion.div>
    </motion.div>
  );
};

export default IntroOverlay;
