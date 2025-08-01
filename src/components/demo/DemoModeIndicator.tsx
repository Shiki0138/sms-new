import React from 'react';
import { X, PlayCircle } from 'lucide-react';

interface DemoModeIndicatorProps {
  onExit: () => void;
}

export const DemoModeIndicator: React.FC<DemoModeIndicatorProps> = ({
  onExit,
}) => {
  return (
    <div className="fixed top-0 left-0 right-0 bg-purple-600 text-white p-2 text-center z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-center space-x-3">
        <PlayCircle className="h-4 w-4" />
        <span className="text-sm font-medium">デモモードで実行中です</span>
        <button
          onClick={onExit}
          className="ml-4 px-3 py-1 bg-purple-700 hover:bg-purple-800 rounded text-xs flex items-center space-x-1"
        >
          <X className="h-3 w-3" />
          <span>終了</span>
        </button>
      </div>
    </div>
  );
};
