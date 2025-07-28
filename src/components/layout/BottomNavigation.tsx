import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  MessageCircle,
  Settings 
} from 'lucide-react';
import { animations } from '../../styles/design-system';

const navigation = [
  { name: 'ホーム', href: '/dashboard', icon: LayoutDashboard },
  { name: '顧客', href: '/customers', icon: Users },
  { name: '予約', href: '/reservations', icon: Calendar },
  { name: 'メッセージ', href: '/messages', icon: MessageCircle },
  { name: '設定', href: '/settings', icon: Settings },
];

export default function BottomNavigation() {
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 lg:hidden">
      <div className="bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg safe-bottom">
        <nav className="flex justify-around items-center h-bottom-nav px-2">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className="flex flex-col items-center justify-center flex-1 min-h-touch relative"
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-all ${
                    isActive 
                      ? 'text-primary-600' 
                      : 'text-gray-500 active:text-primary-500'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="bottomNavActiveTab"
                      className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
                    />
                  )}
                  
                  <div className={`p-1.5 rounded-lg transition-colors ${
                    isActive ? 'bg-primary-100' : 'hover:bg-gray-100'
                  }`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  
                  <span className={`text-xs font-medium ${
                    isActive ? 'text-primary-700' : 'text-gray-600'
                  }`}>
                    {item.name}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}