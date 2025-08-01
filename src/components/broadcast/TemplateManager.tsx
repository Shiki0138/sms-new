import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentDuplicateIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  TagIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { animations } from '../../styles/design-system';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface Template {
  id: string;
  name: string;
  category: 'campaign' | 'holiday' | 'emergency' | 'promotion';
  subject: string;
  content: string;
  variables: string[];
  channels: Array<'line' | 'instagram' | 'sms' | 'email'>;
  tags: string[];
  isActive: boolean;
  usageCount: number;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface TemplateManagerProps {
  tenantId: string;
  className?: string;
  onTemplateSelect?: (template: Template) => void;
}

export default function TemplateManager({
  tenantId,
  className = '',
  onTemplateSelect,
}: TemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([
    {
      id: '1',
      name: '春のキャンペーン',
      category: 'campaign',
      subject: '🌸 春の特別キャンペーンのお知らせ',
      content: '{{customer_name}}様\n\nいつもご利用いただきありがとうございます✨\n\n春の特別キャンペーンを開始いたします！\n期間限定で通常価格から20%OFF\n\nご予約お待ちしております🌸\n\n{{salon_name}}\n{{contact_info}}',
      variables: ['customer_name', 'salon_name', 'contact_info'],
      channels: ['line', 'instagram', 'email'],
      tags: ['キャンペーン', '割引', '春'],
      isActive: true,
      usageCount: 23,
      lastUsed: '2025-07-25T10:30:00Z',
      createdAt: '2025-03-15T09:00:00Z',
      updatedAt: '2025-07-20T14:30:00Z',
      createdBy: 'admin@salon.com',
    },
    {
      id: '2',
      name: '年末年始休業通知',
      category: 'holiday',
      subject: '年末年始休業のお知らせ',
      content: '{{customer_name}}様\n\n年末年始の営業についてお知らせいたします。\n\n休業期間：12月30日〜1月3日\n営業再開：1月4日(金) 10:00〜\n\nご不便をおかけしますが、よろしくお願いいたします。\n\n{{salon_name}}',
      variables: ['customer_name', 'salon_name'],
      channels: ['line', 'sms', 'email'],
      tags: ['休業', '年末年始', 'お知らせ'],
      isActive: true,
      usageCount: 156,
      lastUsed: '2024-12-25T09:00:00Z',
      createdAt: '2024-11-01T16:00:00Z',
      updatedAt: '2024-12-20T11:45:00Z',
      createdBy: 'admin@salon.com',
    },
    {
      id: '3',
      name: '緊急メンテナンス通知',
      category: 'emergency',
      subject: '【緊急】システムメンテナンスのお知らせ',
      content: '{{customer_name}}様\n\n緊急システムメンテナンスを実施いたします。\n\n日時：{{maintenance_date}}\n時間：{{maintenance_time}}\n\nご予約システムが一時利用できません。\nご不便をおかけして申し訳ございません。\n\n{{salon_name}}',
      variables: ['customer_name', 'maintenance_date', 'maintenance_time', 'salon_name'],
      channels: ['line', 'sms'],
      tags: ['緊急', 'メンテナンス', 'システム'],
      isActive: true,
      usageCount: 3,
      lastUsed: '2025-06-15T08:00:00Z',
      createdAt: '2025-01-10T12:00:00Z',
      updatedAt: '2025-06-10T15:20:00Z',
      createdBy: 'admin@salon.com',
    },
    {
      id: '4',
      name: 'VIP限定特典',
      category: 'promotion',
      subject: '✨ VIP様限定特典のご案内',
      content: '{{customer_name}}様\n\nいつもご愛顧いただきありがとうございます✨\n\nVIP様限定の特別特典をご用意いたしました！\n\n🎁 次回来店時に使える特別クーポン\n🎁 新メニューの優先体験\n🎁 特別割引価格でのご提供\n\n詳細はお気軽にお問い合わせください。\n\n{{salon_name}}\n{{contact_info}}',
      variables: ['customer_name', 'salon_name', 'contact_info'],
      channels: ['line', 'email'],
      tags: ['VIP', '特典', 'クーポン'],
      isActive: true,
      usageCount: 67,
      lastUsed: '2025-07-30T16:45:00Z',
      createdAt: '2025-02-20T10:30:00Z',
      updatedAt: '2025-07-28T09:15:00Z',
      createdBy: 'admin@salon.com',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'usage' | 'lastUsed' | 'created'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const categories = [
    { value: 'all', label: 'すべて', icon: '📋', count: templates.length },
    { value: 'campaign', label: 'キャンペーン', icon: '🎉', count: templates.filter(t => t.category === 'campaign').length },
    { value: 'holiday', label: '休業通知', icon: '🗓️', count: templates.filter(t => t.category === 'holiday').length },
    { value: 'emergency', label: '緊急通知', icon: '🚨', count: templates.filter(t => t.category === 'emergency').length },
    { value: 'promotion', label: 'お得情報', icon: '💰', count: templates.filter(t => t.category === 'promotion').length },
  ];

  const channels = [
    { value: 'all', label: 'すべて', icon: ChatBubbleLeftRightIcon, color: 'text-gray-500' },
    { value: 'line', label: 'LINE', icon: ChatBubbleLeftRightIcon, color: 'text-green-500' },
    { value: 'instagram', label: 'Instagram', icon: DevicePhoneMobileIcon, color: 'text-pink-500' },
    { value: 'sms', label: 'SMS', icon: DevicePhoneMobileIcon, color: 'text-blue-500' },
    { value: 'email', label: 'メール', icon: EnvelopeIcon, color: 'text-gray-500' },
  ];

  // フィルタリングとソート
  const filteredAndSortedTemplates = templates
    .filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           template.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
      const matchesChannel = selectedChannel === 'all' || template.channels.includes(selectedChannel as any);
      
      return matchesSearch && matchesCategory && matchesChannel;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'usage':
          comparison = a.usageCount - b.usageCount;
          break;
        case 'lastUsed':
          const aDate = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
          const bDate = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
          comparison = aDate - bDate;
          break;
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleTemplateEdit = (template: Template) => {
    setEditingTemplate({ ...template });
    setShowEditor(true);
  };

  const handleTemplateSave = () => {
    if (!editingTemplate) return;
    
    setTemplates(prev =>
      prev.map(t => 
        t.id === editingTemplate.id 
          ? { ...editingTemplate, updatedAt: new Date().toISOString() }
          : t
      )
    );
    
    setShowEditor(false);
    setEditingTemplate(null);
  };

  const handleTemplateDelete = (templateId: string) => {
    if (confirm('このテンプレートを削除しますか？')) {
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    }
  };

  const handleTemplateDuplicate = (template: Template) => {
    const newTemplate: Template = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (コピー)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      lastUsed: undefined,
    };
    
    setTemplates(prev => [newTemplate, ...prev]);
  };

  const getCategoryInfo = (category: string) => {
    const info = categories.find(c => c.value === category);
    return info || { icon: '📋', label: category };
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'line': return { icon: ChatBubbleLeftRightIcon, color: 'text-green-500', label: 'LINE' };
      case 'instagram': return { icon: DevicePhoneMobileIcon, color: 'text-pink-500', label: 'Instagram' };
      case 'sms': return { icon: DevicePhoneMobileIcon, color: 'text-blue-500', label: 'SMS' };
      case 'email': return { icon: EnvelopeIcon, color: 'text-gray-500', label: 'メール' };
      default: return { icon: ChatBubbleLeftRightIcon, color: 'text-gray-500', label: channel };
    }
  };

  const renderPreview = (template: Template) => {
    const processedContent = template.content
      .replace(/\{\{customer_name\}\}/g, '田中様')
      .replace(/\{\{salon_name\}\}/g, 'サロン名')
      .replace(/\{\{contact_info\}\}/g, 'TEL: 03-1234-5678');

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={() => setShowPreview(null)}
      >
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">プレビュー</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(null)}>
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-2">件名</div>
                <div className="text-sm text-gray-900">{template.subject}</div>
              </div>
              
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-2">本文</div>
                <div className="text-sm text-gray-900 whitespace-pre-wrap">{processedContent}</div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">対応チャンネル:</span>
                {template.channels.map(channel => {
                  const channelInfo = getChannelIcon(channel);
                  return (
                    <div
                      key={channel}
                      className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-full text-xs"
                    >
                      <channelInfo.icon className={`h-3 w-3 ${channelInfo.color}`} />
                      <span>{channelInfo.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const renderEditor = () => {
    if (!editingTemplate) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {editingTemplate.id === 'new' ? 'テンプレート作成' : 'テンプレート編集'}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowEditor(false)}>
                ✕
              </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 編集フォーム */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    テンプレート名 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
                    placeholder="テンプレート名を入力"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">カテゴリー</label>
                  <select
                    value={editingTemplate.category}
                    onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, category: e.target.value as any } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {categories.slice(1).map(category => (
                      <option key={category.value} value={category.value}>
                        {category.icon} {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">件名</label>
                  <Input
                    value={editingTemplate.subject}
                    onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, subject: e.target.value } : null)}
                    placeholder="メールやプッシュ通知の件名"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メッセージ内容 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={editingTemplate.content}
                    onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, content: e.target.value } : null)}
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="{{customer_name}}様

こんにちは！"
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    利用可能な変数: {{'{'}customer_name{'}'}} {{'{'}salon_name{'}'}} {{'{'}contact_info{'}'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">対応チャンネル</label>
                  <div className="grid grid-cols-2 gap-2">
                    {channels.slice(1).map(channel => (
                      <label
                        key={channel.value}
                        className="flex items-center space-x-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={editingTemplate.channels.includes(channel.value as any)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditingTemplate(prev => prev ? {
                                ...prev,
                                channels: [...prev.channels, channel.value as any]
                              } : null);
                            } else {
                              setEditingTemplate(prev => prev ? {
                                ...prev,
                                channels: prev.channels.filter(c => c !== channel.value)
                              } : null);
                            }
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <channel.icon className={`h-4 w-4 ${channel.color}`} />
                        <span className="text-sm">{channel.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">タグ</label>
                  <Input
                    value={editingTemplate.tags.join(', ')}
                    onChange={(e) => setEditingTemplate(prev => prev ? {
                      ...prev,
                      tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                    } : null)}
                    placeholder="キャンペーン, 割引, 春"
                  />
                  <div className="mt-1 text-xs text-gray-500">カンマ区切りで入力</div>
                </div>
              </div>

              {/* プレビュー */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">プレビュー</h4>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-xs font-medium text-gray-600 mb-2">件名</div>
                    <div className="text-sm text-gray-900">{editingTemplate.subject || '件名なし'}</div>
                  </div>
                  
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="text-xs font-medium text-gray-600 mb-2">本文</div>
                    <div className="text-sm text-gray-900 whitespace-pre-wrap">
                      {editingTemplate.content
                        .replace(/\{\{customer_name\}\}/g, '田中様')
                        .replace(/\{\{salon_name\}\}/g, 'サロン名')
                        .replace(/\{\{contact_info\}\}/g, 'TEL: 03-1234-5678')
                        || 'メッセージ内容を入力してください'}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {editingTemplate.channels.map(channel => {
                      const channelInfo = getChannelIcon(channel);
                      return (
                        <div
                          key={channel}
                          className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-full text-xs"
                        >
                          <channelInfo.icon className={`h-3 w-3 ${channelInfo.color}`} />
                          <span>{channelInfo.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
              <Button variant="secondary" onClick={() => setShowEditor(false)}>
                キャンセル
              </Button>
              <Button onClick={handleTemplateSave}>
                {editingTemplate.id === 'new' ? '作成' : '保存'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">テンプレート管理</h1>
          <p className="text-gray-600">メッセージテンプレートの作成・編集・管理</p>
        </div>
        <Button
          onClick={() => {
            setEditingTemplate({
              id: 'new',
              name: '',
              category: 'campaign',
              subject: '',
              content: '',
              variables: [],
              channels: ['line'],
              tags: [],
              isActive: true,
              usageCount: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: 'current-user',
            });
            setShowEditor(true);
          }}
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          新規テンプレート
        </Button>
      </div>

      {/* フィルター・検索バー */}
      <Card>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 検索 */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="テンプレートを検索..."
                className="pl-9"
              />
            </div>

            {/* カテゴリーフィルター */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.icon} {category.label} ({category.count})
                </option>
              ))}
            </select>

            {/* チャンネルフィルター */}
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {channels.map(channel => (
                <option key={channel.value} value={channel.value}>
                  {channel.label}
                </option>
              ))}
            </select>

            {/* ソート */}
            <div className="flex space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="name">名前順</option>
                <option value="usage">使用回数順</option>
                <option value="lastUsed">最終使用日順</option>
                <option value="created">作成日順</option>
              </select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* テンプレート一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredAndSortedTemplates.map((template, index) => {
            const categoryInfo = getCategoryInfo(template.category);
            
            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
              >
                <Card className="h-full">
                  <div className="p-6">
                    {/* ヘッダー */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg">{categoryInfo.icon}</span>
                          <h3 className="font-medium text-gray-900 truncate">{template.name}</h3>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{categoryInfo.label}</span>
                          <span>•</span>
                          <span>使用 {template.usageCount}回</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPreview(template.id)}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTemplateEdit(template)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTemplateDuplicate(template)}
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTemplateDelete(template.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* 内容プレビュー */}
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 line-clamp-3">
                        {template.content.slice(0, 100)}...
                      </div>
                    </div>

                    {/* チャンネル */}
                    <div className="flex items-center space-x-2 mb-4">
                      {template.channels.map(channel => {
                        const channelInfo = getChannelIcon(channel);
                        return (
                          <div
                            key={channel}
                            className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-full text-xs"
                          >
                            <channelInfo.icon className={`h-3 w-3 ${channelInfo.color}`} />
                            <span>{channelInfo.label}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* タグ */}
                    {template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {template.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {template.tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            +{template.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* フッター */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="h-3 w-3" />
                        <span>
                          {template.lastUsed 
                            ? `最終使用: ${new Date(template.lastUsed).toLocaleDateString('ja-JP')}`
                            : '未使用'
                          }
                        </span>
                      </div>
                      
                      {template.isActive ? (
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircleIcon className="h-3 w-3" />
                          <span>有効</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-gray-400">
                          <ExclamationTriangleIcon className="h-3 w-3" />
                          <span>無効</span>
                        </div>
                      )}
                    </div>

                    {/* アクション */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full"
                        onClick={() => onTemplateSelect?.(template)}
                      >
                        このテンプレートを使用
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* プレビューモーダル */}
      <AnimatePresence>
        {showPreview && (
          renderPreview(templates.find(t => t.id === showPreview)!)
        )}
      </AnimatePresence>

      {/* エディターモーダル */}
      <AnimatePresence>
        {showEditor && renderEditor()}
      </AnimatePresence>
    </div>
  );
}