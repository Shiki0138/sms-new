import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useCreateCustomer } from '../../hooks/useCreateCustomer';
import { useCustomers } from '../../hooks/useCustomers';

const NewCustomerPage: React.FC = () => {
  const navigate = useNavigate();
  const createCustomer = useCreateCustomer();
  const { customers } = useCustomers();
  
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    email: '',
    notes: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '顧客名は必須です';
    }
    
    if (!formData.phone_number.trim()) {
      newErrors.phone_number = '電話番号は必須です';
    } else if (!/^[0-9-]+$/.test(formData.phone_number)) {
      newErrors.phone_number = '電話番号は数字とハイフンのみ入力できます';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'メールアドレスの形式が正しくありません';
    }
    
    // 顧客数上限チェック
    if (customers && customers.length >= 100) {
      newErrors.limit = '顧客登録数が上限（100名）に達しています';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await createCustomer.mutateAsync(formData);
      toast.success('顧客を登録しました');
      navigate('/customers');
    } catch (error) {
      toast.error('顧客の登録に失敗しました');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // エラーをクリア
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <Link
            to="/customers"
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">新規顧客登録</h1>
        </div>
        {errors.limit && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {errors.limit}
          </div>
        )}
      </div>

      {/* フォーム */}
      <form onSubmit={handleSubmit}>
        <Card>
          <div className="space-y-6">
            {/* 顧客名 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                顧客名 <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                placeholder="山田花子"
              />
            </div>

            {/* 電話番号 */}
            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                電話番号 <span className="text-red-500">*</span>
              </label>
              <Input
                id="phone_number"
                name="phone_number"
                type="tel"
                value={formData.phone_number}
                onChange={handleChange}
                error={errors.phone_number}
                placeholder="090-1234-5678"
              />
            </div>

            {/* メールアドレス */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                placeholder="example@email.com"
              />
            </div>

            {/* 備考 */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                備考
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                value={formData.notes}
                onChange={handleChange}
                className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="アレルギー情報、施術の注意点など"
              />
            </div>
          </div>

          {/* ボタン */}
          <div className="mt-6 flex justify-end space-x-3">
            <Link to="/customers">
              <Button variant="secondary">
                キャンセル
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={createCustomer.isPending || !!errors.limit}
            >
              <Save className="h-4 w-4 mr-2" />
              登録する
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
};

export default NewCustomerPage;