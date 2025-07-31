import React, { createContext, useContext, useState, useEffect } from 'react';

export type DashboardVariant = 
  | 'simple'     // 現在のメイン版（軽量・高速）
  | 'full'       // フル機能版（アニメーション付き）
  | 'debug'      // デバッグ版（開発者向け）
  | 'safe'       // セーフ版（固定データ）
  | 'emergency'  // 緊急版（最小限機能）
  | 'minimal'    // ミニマル版（基本機能のみ）
  | 'fixed'      // 修正版（バグ修正特化）
  | 'with-debug'; // デバッグ付き版

interface DashboardVariantContextType {
  variant: DashboardVariant;
  setVariant: (variant: DashboardVariant) => void;
  availableVariants: Array<{
    key: DashboardVariant;
    name: string;
    description: string;
    recommended?: boolean;
  }>;
}

const DashboardVariantContext = createContext<DashboardVariantContextType | undefined>(undefined);

export const useDashboardVariant = () => {
  const context = useContext(DashboardVariantContext);
  if (!context) {
    throw new Error('useDashboardVariant must be used within a DashboardVariantProvider');
  }
  return context;
};

export const DashboardVariantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [variant, setVariantState] = useState<DashboardVariant>(() => {
    // localStorage から保存された設定を読み込み（デフォルトは simple）
    const saved = localStorage.getItem('dashboard-variant');
    return (saved as DashboardVariant) || 'simple';
  });

  const setVariant = (newVariant: DashboardVariant) => {
    setVariantState(newVariant);
    localStorage.setItem('dashboard-variant', newVariant);
  };

  const availableVariants = [
    {
      key: 'simple' as DashboardVariant,
      name: 'シンプル版',
      description: '軽量で高速なダッシュボード（推奨）',
      recommended: true,
    },
    {
      key: 'full' as DashboardVariant,
      name: 'フル機能版',
      description: 'アニメーションと全機能を含む完全版',
    },
    {
      key: 'safe' as DashboardVariant,
      name: 'セーフ版',
      description: '安定性重視、固定データ使用',
    },
    {
      key: 'debug' as DashboardVariant,
      name: 'デバッグ版',
      description: '開発者向け、詳細情報表示',
    },
    {
      key: 'emergency' as DashboardVariant,
      name: '緊急版',
      description: '緊急時用、最小限機能のみ',
    },
    {
      key: 'minimal' as DashboardVariant,
      name: 'ミニマル版',
      description: '基本機能のみのシンプル表示',
    },
    {
      key: 'fixed' as DashboardVariant,
      name: '修正版',
      description: 'バグ修正に特化した安定版',
    },
    {
      key: 'with-debug' as DashboardVariant,
      name: 'デバッグ付き版',
      description: 'デバッグ情報付きの開発版',
    },
  ];

  return (
    <DashboardVariantContext.Provider
      value={{
        variant,
        setVariant,
        availableVariants,
      }}
    >
      {children}
    </DashboardVariantContext.Provider>
  );
};