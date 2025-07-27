import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useCustomer } from '../../hooks/useCustomer';
import { useUpdateCustomer } from '../../hooks/useUpdateCustomer';

const CustomerEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(id!);
  const updateCustomer = useUpdateCustomer();
  
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    email: '',
    notes: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        phone_number: customer.phone_number || '',
        email: customer.email || '',
        notes: customer.notes || '',
      });
    }
  }, [customer]);

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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !id) {
      return;
    }
    
    try {
      await updateCustomer.mutateAsync({ id, data: formData });
      toast.success('顧客情報を更新しました');
      navigate(`/customers/${id}`);
    } catch (error) {
      toast.error('顧客情報の更新に失敗しました');
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

  if (isLoading) {
    return (
      <div className="p-6">
        <Card>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="space-y-3">
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500">顧客が見つかりません</p>
            <Link to="/customers" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
              顧客一覧に戻る
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <Link
            to={`/customers/${id}`}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">顧客情報編集</h1>
        </div>
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
            <Link to={`/customers/${id}`}>
              <Button variant="secondary">
                キャンセル
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={updateCustomer.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              更新する
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
};

export default CustomerEditPage;