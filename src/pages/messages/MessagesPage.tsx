import React from 'react';
import { motion } from 'framer-motion';
import MessageCenter from '../../components/messages/MessageCenter';
import { animations } from '../../styles/design-system';

export default function MessagesPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={animations.spring.gentle}
      className="h-full"
    >
      <MessageCenter className="h-full" />
    </motion.div>
  );
}