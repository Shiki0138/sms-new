import { useState, useEffect } from 'react';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  action?: {
    label: string;
    onClick: () => void;
  };
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'サロン管理システムへようこそ！',
    description: 'このガイドでは、基本的な使い方を簡単にご紹介します。',
  },
  {
    id: 'dashboard',
    title: 'ダッシュボード',
    description: '本日の予約状況や顧客数、売上などを一目で確認できます。',
    target: '.dashboard-stats',
    placement: 'bottom',
  },
  {
    id: 'quick-actions',
    title: 'クイックアクション',
    description: 'よく使う機能にすぐアクセスできます。新規予約や顧客登録はここから。',
    target: '.quick-actions',
    placement: 'left',
  },
  {
    id: 'navigation',
    title: 'ナビゲーション',
    description: '左側のメニューから各機能にアクセスできます。モバイルでは下部に表示されます。',
    target: '.main-navigation',
    placement: 'right',
  },
  {
    id: 'reservations',
    title: '予約管理',
    description: 'カレンダー形式で予約を管理。ドラッグ&ドロップで簡単に予約時間を変更できます。',
    target: '[href="/reservations"]',
    placement: 'right',
  },
  {
    id: 'customers',
    title: '顧客管理',
    description: 'お客様の情報や来店履歴を管理。施術記録も残せます。',
    target: '[href="/customers"]',
    placement: 'right',
  },
  {
    id: 'messages',
    title: 'メッセージ',
    description: 'LINE、Instagram、メールを一元管理。AIによる返信提案も利用できます。',
    target: '[href="/messages"]',
    placement: 'right',
  },
];

export function useOnboarding() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('salon_onboarding_completed');
    setHasSeenOnboarding(!!seen);
    
    // 初回ユーザーの場合、自動的にオンボーディングを開始
    if (!seen) {
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const startOnboarding = () => {
    setIsActive(true);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  const completeOnboarding = () => {
    setIsActive(false);
    setCurrentStep(0);
    localStorage.setItem('salon_onboarding_completed', 'true');
    setHasSeenOnboarding(true);
  };

  const getCurrentStep = () => {
    return isActive ? ONBOARDING_STEPS[currentStep] : null;
  };

  return {
    isActive,
    currentStep,
    totalSteps: ONBOARDING_STEPS.length,
    hasSeenOnboarding,
    startOnboarding,
    nextStep,
    previousStep,
    skipOnboarding,
    completeOnboarding,
    getCurrentStep,
  };
}