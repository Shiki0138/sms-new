import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleOvalLeftIcon,
  CameraIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  PencilIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { animations } from '../../styles/design-system';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { toast } from 'sonner';

export interface ContactMethod {
  id?: string;
  type: 'phone' | 'email' | 'line' | 'instagram';
  value: string;
  isVerified: boolean;
  isPrimary: boolean;
  displayName?: string;
}

interface ContactMethodsCardProps {
  customerId: string;
  contactMethods: ContactMethod[];
  onUpdate: (methods: ContactMethod[]) => Promise<void>;
  className?: string;
}

const contactTypeInfo = {
  phone: {
    icon: PhoneIcon,
    label: '電話番号',
    placeholder: '090-1234-5678',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  email: {
    icon: EnvelopeIcon,
    label: 'メールアドレス',
    placeholder: 'customer@example.com',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  line: {
    icon: ChatBubbleOvalLeftIcon,
    label: 'LINE ID',
    placeholder: '@salon_friend',
    color: 'text-green-500',
    bgColor: 'bg-green-50',
  },
  instagram: {
    icon: CameraIcon,
    label: 'Instagram ID',
    placeholder: '@username',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
  },
};

export default function ContactMethodsCard({
  customerId,
  contactMethods,
  onUpdate,
  className = '',
}: ContactMethodsCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingMethods, setEditingMethods] = useState<ContactMethod[]>(contactMethods);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddMethod = (type: ContactMethod['type']) => {
    const newMethod: ContactMethod = {
      type,
      value: '',
      isVerified: false,
      isPrimary: editingMethods.length === 0,
    };
    setEditingMethods([...editingMethods, newMethod]);
  };

  const handleUpdateMethod = (index: number, updates: Partial<ContactMethod>) => {
    const updated = [...editingMethods];
    updated[index] = { ...updated[index], ...updates };

    // 主要連絡先の変更
    if (updates.isPrimary) {
      updated.forEach((method, i) => {
        if (i !== index) {
          method.isPrimary = false;
        }
      });
    }

    setEditingMethods(updated);
  };

  const handleRemoveMethod = (index: number) => {
    const updated = editingMethods.filter((_, i) => i !== index);
    
    // 主要連絡先が削除された場合、最初の連絡先を主要に設定
    if (editingMethods[index].isPrimary && updated.length > 0) {
      updated[0].isPrimary = true;
    }
    
    setEditingMethods(updated);
  };

  const handleSave = async () => {
    // バリデーション
    const hasEmptyValues = editingMethods.some(method => !method.value.trim());
    if (hasEmptyValues) {
      toast.error('すべての連絡先を入力してください');
      return;
    }

    const hasPrimary = editingMethods.some(method => method.isPrimary);
    if (editingMethods.length > 0 && !hasPrimary) {
      toast.error('主要な連絡先を1つ選択してください');
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate(editingMethods);
      setIsEditing(false);
      toast.success('連絡先を更新しました');
    } catch (error) {
      toast.error('連絡先の更新に失敗しました');
      console.error('Contact methods update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingMethods(contactMethods);
    setIsEditing(false);
  };

  const availableTypes = Object.keys(contactTypeInfo).filter(
    type => !editingMethods.some(method => method.type === type)
  ) as ContactMethod['type'][];

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">連絡先情報</h3>
        {!isEditing && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <PencilIcon className="h-4 w-4 mr-1" />
            編集
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          {editingMethods.map((method, index) => {
            const info = contactTypeInfo[method.type];
            const Icon = info.icon;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center space-x-3"
              >
                <div className={`p-2 rounded-lg ${info.bgColor}`}>
                  <Icon className={`h-5 w-5 ${info.color}`} />
                </div>
                
                <div className="flex-1">
                  <Input
                    value={method.value}
                    onChange={(e) => handleUpdateMethod(index, { value: e.target.value })}
                    placeholder={info.placeholder}
                    className="w-full"
                  />
                </div>

                <button
                  onClick={() => handleUpdateMethod(index, { isPrimary: true })}
                  className={`p-2 rounded-lg transition-colors ${
                    method.isPrimary
                      ? 'bg-yellow-100 text-yellow-600'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                  title="主要連絡先に設定"
                >
                  <StarIcon className={`h-5 w-5 ${method.isPrimary ? 'fill-current' : ''}`} />
                </button>

                <button
                  onClick={() => handleRemoveMethod(index)}
                  className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </motion.div>
            );
          })}

          {availableTypes.length > 0 && (
            <div className="pt-2">
              <p className="text-sm text-gray-600 mb-2">連絡先を追加:</p>
              <div className="flex flex-wrap gap-2">
                {availableTypes.map(type => {
                  const info = contactTypeInfo[type];
                  const Icon = info.icon;

                  return (
                    <button
                      key={type}
                      onClick={() => handleAddMethod(type)}
                      className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-300 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                    >
                      <Icon className="h-4 w-4 text-gray-600" />
                      <span className="text-sm text-gray-700">{info.label}</span>
                      <PlusIcon className="h-4 w-4 text-gray-500" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={handleCancel}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || editingMethods.length === 0}
            >
              {isLoading ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {contactMethods.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              連絡先が登録されていません
            </p>
          ) : (
            contactMethods.map((method, index) => {
              const info = contactTypeInfo[method.type];
              const Icon = info.icon;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50"
                >
                  <div className={`p-2 rounded-lg ${info.bgColor}`}>
                    <Icon className={`h-5 w-5 ${info.color}`} />
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {method.value}
                      {method.displayName && (
                        <span className="text-gray-500 ml-2">({method.displayName})</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{info.label}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {method.isPrimary && (
                      <div className="bg-yellow-100 text-yellow-600 p-1.5 rounded">
                        <StarIcon className="h-4 w-4 fill-current" />
                      </div>
                    )}
                    
                    {method.isVerified ? (
                      <div className="bg-green-100 text-green-600 p-1.5 rounded">
                        <CheckCircleIcon className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="bg-gray-200 text-gray-400 p-1.5 rounded">
                        <XCircleIcon className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* 将来のAPI連携準備 */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            🔗 外部サービス連携（近日公開）
          </h4>
          <p className="text-xs text-blue-700">
            LINE公式アカウントやInstagramビジネスアカウントと連携することで、
            メッセージの自動送受信が可能になります。
          </p>
        </div>
      </div>
    </Card>
  );
}