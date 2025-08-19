import React from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface PlanRestrictionWrapperProps {
  feature: string;
  requiredPlan: 'standard' | 'premium';
  children: React.ReactNode;
  showUpgradePrompt?: boolean;
}

const planHierarchy = {
  light: 1,
  standard: 2,
  premium: 3
};

const PlanRestrictionWrapper: React.FC<PlanRestrictionWrapperProps> = ({
  feature,
  requiredPlan,
  children,
  showUpgradePrompt = true
}) => {
  const { user } = useAuth();
  const currentPlan = user?.subscription_plan || 'light';
  
  const hasAccess = planHierarchy[currentPlan] >= planHierarchy[requiredPlan];

  if (hasAccess) {
    return <>{children}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-gray-900/90 rounded-lg">
        <div className="text-center p-6">
          <Lock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">
            {requiredPlan === 'standard' ? 'スタンダードプラン' : 'プレミアムプラン'}限定機能
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            この機能を利用するには{requiredPlan === 'standard' ? 'スタンダード' : 'プレミアム'}プランへのアップグレードが必要です
          </p>
          <button
            onClick={() => window.location.href = '/settings/subscription'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            プランをアップグレード
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanRestrictionWrapper;