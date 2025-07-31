import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Calendar, Users, MessageCircle, ArrowRight, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../hooks/useDemo';
import { useOnboarding } from '../../hooks/useOnboarding';

export const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { initializeDemo } = useDemo();
  const { startOnboarding } = useOnboarding();

  const features = [
    {
      icon: Calendar,
      title: '予約管理',
      description: 'カレンダーで直感的に予約を管理',
      color: 'from-purple-400 to-purple-600',
    },
    {
      icon: Users,
      title: '顧客管理',
      description: 'お客様情報と施術履歴を一元管理',
      color: 'from-blue-400 to-blue-600',
    },
    {
      icon: MessageCircle,
      title: 'メッセージ',
      description: 'LINE・Instagram・メールを統合',
      color: 'from-green-400 to-green-600',
    },
  ];

  const handleStartDemo = () => {
    initializeDemo();
    navigate('/dashboard');
  };

  const handleStartTour = () => {
    startOnboarding();
    navigate('/dashboard');
  };

  const handleSkip = () => {
    localStorage.setItem('salon_onboarding_completed', 'true');
    navigate('/dashboard');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex flex-col"
    >
      {/* ヘッダー */}
      <div className="flex justify-end p-4">
        <button
          onClick={handleSkip}
          className="text-gray-500 hover:text-gray-700 text-sm font-medium"
        >
          スキップ
        </button>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="mb-8"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl">
            <Sparkles className="h-12 w-12 text-white" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-3xl lg:text-4xl font-bold text-center bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4"
        >
          サロン管理システムへようこそ
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-gray-600 text-center max-w-md mb-12"
        >
          美容室・サロンの業務を効率化する
          オールインワン管理システムです
        </motion.p>

        {/* 機能紹介 */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl w-full"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4`}>
                <feature.icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* アクションボタン */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="space-y-4 w-full max-w-sm"
        >
          <button
            onClick={handleStartDemo}
            className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:shadow-lg transform transition-all hover:scale-[1.02] font-medium"
          >
            <PlayCircle className="h-5 w-5" />
            <span>デモを体験する</span>
          </button>

          <button
            onClick={handleStartTour}
            className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-white text-purple-600 rounded-xl border-2 border-purple-200 hover:bg-purple-50 transition-colors font-medium"
          >
            <ArrowRight className="h-5 w-5" />
            <span>使い方ガイドを見る</span>
          </button>
        </motion.div>

        {/* サブテキスト */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-xs text-gray-500 text-center mt-8"
        >
          実際のデータは使用されません。安心してお試しください。
        </motion.p>
      </div>
    </motion.div>
  );
};