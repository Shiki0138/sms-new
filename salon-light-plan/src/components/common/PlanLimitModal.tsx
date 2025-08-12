import { X, AlertTriangle, Sparkles } from 'lucide-react';
import { usePlan } from '../../contexts/PlanContext';
import { formatPlanLimit } from '../../lib/planLimits';

interface PlanLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: 'customers' | 'reservations';
}

export function PlanLimitModal({ isOpen, onClose, limitType }: PlanLimitModalProps) {
  const { plan, limits, usage } = usePlan();

  if (!isOpen) return null;

  const currentUsage = limitType === 'customers'
    ? usage.customerCount
    : usage.monthlyReservationCount;

  const currentLimit = limitType === 'customers'
    ? limits.customers
    : limits.monthlyReservations;

  const featureName = limitType === 'customers' ? '顧客' : '予約';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-yellow-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              プラン制限に達しました
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-4">
            現在の{plan === 'light' ? 'ライト' : plan === 'standard' ? 'スタンダード' : 'プレミアム'}プランでは、
            {featureName}の上限は<span className="font-bold">{formatPlanLimit(currentLimit)}</span>です。
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700">
              現在の{featureName}数: <span className="font-bold">{currentUsage}</span> / {formatPlanLimit(currentLimit)}
            </p>
          </div>

          <p className="text-sm text-gray-600">
            さらに{featureName}を追加するには、プランのアップグレードが必要です。
          </p>
        </div>

        <div className="space-y-3">
          {plan === 'light' && (
            <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50">
              <div className="flex items-center mb-2">
                <Sparkles className="h-5 w-5 text-indigo-600 mr-2" />
                <h4 className="font-semibold text-indigo-900">
                  スタンダードプラン
                </h4>
              </div>
              <ul className="text-sm text-indigo-700 space-y-1">
                <li>• 顧客管理: 最大1,000件</li>
                <li>• 予約管理: 月間500件まで</li>
                <li>• スタッフアカウント: 5名まで</li>
                <li>• データ保持期間: 12ヶ月</li>
              </ul>
            </div>
          )}

          {(plan === 'light' || plan === 'standard') && (
            <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
              <div className="flex items-center mb-2">
                <Sparkles className="h-5 w-5 text-purple-600 mr-2" />
                <h4 className="font-semibold text-purple-900">
                  プレミアムプラン
                </h4>
              </div>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• 顧客管理: 無制限</li>
                <li>• 予約管理: 無制限</li>
                <li>• スタッフアカウント: 無制限</li>
                <li>• データ保持期間: 無制限</li>
              </ul>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            閉じる
          </button>
          <button
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
            onClick={() => {
              // 将来的にアップグレード画面へ遷移
              console.log('Upgrade plan');
            }}
          >
            アップグレード
          </button>
        </div>
      </div>
    </div>
  );
}