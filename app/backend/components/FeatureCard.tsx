import React from 'react';
import { LucideIcon, TrendingUp, Users, Gift, Package, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  route: string;
  requiredPlan?: 'light' | 'standard' | 'premium';
  stats?: {
    label: string;
    value: string | number;
  };
}

const planHierarchy = {
  light: 1,
  standard: 2,
  premium: 3
};

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon: Icon,
  route,
  requiredPlan = 'light',
  stats
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentPlan = user?.subscription_plan || 'light';
  
  const hasAccess = planHierarchy[currentPlan] >= planHierarchy[requiredPlan];

  const handleClick = () => {
    if (hasAccess) {
      navigate(route);
    } else {
      navigate('/settings/subscription');
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer ${
        !hasAccess ? 'opacity-75' : ''
      }`}
    >
      {!hasAccess && (
        <div className="absolute top-2 right-2">
          <Lock className="w-5 h-5 text-gray-400" />
        </div>
      )}
      
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${
          hasAccess 
            ? 'bg-blue-100 dark:bg-blue-900' 
            : 'bg-gray-100 dark:bg-gray-700'
        }`}>
          <Icon className={`w-6 h-6 ${
            hasAccess 
              ? 'text-blue-600 dark:text-blue-400' 
              : 'text-gray-400'
          }`} />
        </div>
        {stats && hasAccess && (
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">{stats.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.value}</p>
          </div>
        )}
      </div>

      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>

      {!hasAccess && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {requiredPlan === 'standard' ? 'スタンダード' : 'プレミアム'}プラン限定
          </p>
        </div>
      )}
    </div>
  );
};

export default FeatureCard;