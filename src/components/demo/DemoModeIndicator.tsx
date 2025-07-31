import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

interface DemoModeIndicatorProps {
  onExit: () => void;
}

export const DemoModeIndicator: React.FC<DemoModeIndicatorProps> = ({ onExit }) => {
  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
    >
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center space-x-3">
        <Sparkles className="h-5 w-5" />
        <span className="font-medium">デモモードで体験中</span>
        <button
          onClick={onExit}
          className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
};