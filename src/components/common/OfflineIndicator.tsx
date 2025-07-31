import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 bg-red-600 text-white px-4 py-3 z-50 shadow-lg"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-center space-x-3">
            <WifiOff className="h-5 w-5" />
            <span className="font-medium">
              インターネット接続がありません。オフラインモードで動作中です。
            </span>
          </div>
        </motion.div>
      )}

      {showReconnected && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 bg-green-600 text-white px-4 py-3 z-50 shadow-lg"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-center space-x-3">
            <Wifi className="h-5 w-5" />
            <span className="font-medium">
              インターネット接続が復旧しました。
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};