import React, { Suspense } from 'react';
import { PlanLimitsProvider } from '../../contexts/PlanLimitsContext';
import { PageLoading } from '../common/LoadingStates';

/**
 * PlanLimitsProviderの安全なラッパー
 * 本番環境でのエラーを防ぐため、Suspenseでラップ
 */
export const PlanLimitsProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Suspense fallback={<PageLoading page="app" />}>
      <PlanLimitsProvider>
        {children}
      </PlanLimitsProvider>
    </Suspense>
  );
};