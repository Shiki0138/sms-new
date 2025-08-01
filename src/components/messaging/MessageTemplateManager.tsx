import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentDuplicateIcon as DuplicateIcon,
  TagIcon,
  HashtagIcon as VariableIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { BulkMessagingService } from '../../services/bulk-messaging-service';
import { 
  MessageTemplate,
  MessageTemplateCategory,
  DEFAULT_TEMPLATE_VARIABLES,
  MessagePreview,
} from '../../types/bulk-messaging';
import { animations } from '../../styles/design-system';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';

interface MessageTemplateManagerProps {
  tenantId: string;
  onTemplateUpdate?: () => void;
}

const CATEGORY_CONFIG = {
  reminder: { label: 'リマインダー', icon: '⏰', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  campaign: { label: 'キャンペーン', icon: '📣', color: 'text-green-600', bgColor: 'bg-green-50' },
  announcement: { label: 'お知らせ', icon: '📢', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  emergency: { label: '緊急', icon: '🚨', color: 'text-red-600', bgColor: 'bg-red-50' },
  custom: { label: 'カスタム', icon: '✏️', color: 'text-gray-600', bgColor: 'bg-gray-50' },
};

export default function MessageTemplateManager({
  tenantId,
  onTemplateUpdate,
}: MessageTemplateManagerProps) {
  const [service] = useState(() => new BulkMessagingService(tenantId));
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MessageTemplateCategory | 'all'>('all');
  const [previewData, setPreviewData] = useState<MessagePreview[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'campaign' as MessageTemplateCategory,
    subject: '',
    content: '',
    variables: [] as string[],
    is_active: true,
  });

  // Variable insertion
  const [showVariableMenu, setShowVariableMenu] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await service.getMessageTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      category: 'campaign',
      subject: '',
      content: '',
      variables: [],
      is_active: true,
    });
    setShowModal(true);
  };

  const handleEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      subject: template.subject || '',
      content: template.content,
      variables: template.variables,
      is_active: template.is_active,
    });
    setShowModal(true);
  };

  const handleSaveTemplate = async () => {
    setSaving(true);
    try {
      // Extract variables from content
      const variables = extractVariables(formData.content);
      const templateData = {
        ...formData,
        variables,
      };

      if (editingTemplate) {
        await service.updateMessageTemplate(editingTemplate.id, templateData);
      } else {
        await service.createMessageTemplate(templateData);
      }

      await loadTemplates();
      setShowModal(false);
      onTemplateUpdate?.();
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('このテンプレートを削除してもよろしいですか？')) return;

    try {
      await service.updateMessageTemplate(templateId, { is_active: false });
      await loadTemplates();
      onTemplateUpdate?.();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleDuplicateTemplate = (template: MessageTemplate) => {
    setEditingTemplate(null);
    setFormData({
      name: `${template.name} (コピー)`,
      category: template.category,
      subject: template.subject || '',
      content: template.content,
      variables: template.variables,
      is_active: true,
    });
    setShowModal(true);
  };

  const handlePreviewTemplate = async (template: MessageTemplate) => {
    setPreviewLoading(true);
    try {
      // For demo purposes, create mock preview data
      const mockCustomerIds = ['customer-1', 'customer-2', 'customer-3'];
      const previews = await service.previewMessage(template.id, mockCustomerIds);
      setPreviewData(previews);
      setShowPreviewModal(true);
    } catch (error) {
      console.error('Error generating preview:', error);
      // Fallback mock data
      setPreviewData([
        {
          customer_id: 'customer-1',
          customer_name: '田中様',
          channel_type: 'line',
          subject: template.subject,
          content: template.content
            .replace(/\{customer_name\}/g, '田中様')
            .replace(/\{salon_name\}/g, 'ビューティーサロン')
            .replace(/\{date\}/g, '4月15日(月)')
            .replace(/\{time\}/g, '14:00'),
          variables_used: extractVariableUsage(template.content),
        },
      ]);
      setShowPreviewModal(true);
    } finally {
      setPreviewLoading(false);
    }
  };

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{([^}]+)\}/g) || [];
    const variables = matches.map(match => match.slice(1, -1));
    return [...new Set(variables)];
  };

  const extractVariableUsage = (content: string): Record<string, string> => {
    const usage: Record<string, string> = {};
    const variables = extractVariables(content);
    
    variables.forEach(varName => {
      const variable = DEFAULT_TEMPLATE_VARIABLES.find(v => v.name === varName);
      if (variable) {
        usage[varName] = variable.description;
      }
    });
    
    return usage;
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content;
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    const newText = `${before}{${variable}}${after}`;
    setFormData({ ...formData, content: newText });
    
    // Reset cursor position after React re-render
    setTimeout(() => {
      textarea.selectionStart = start + variable.length + 2;
      textarea.selectionEnd = start + variable.length + 2;
      textarea.focus();
    }, 0);
    
    setShowVariableMenu(false);
  };

  const getFilteredTemplates = () => {
    if (selectedCategory === 'all') return templates;
    return templates.filter(t => t.category === selectedCategory);
  };

  const renderTemplateCard = (template: MessageTemplate) => {
    const categoryConfig = CATEGORY_CONFIG[template.category];
    const variableCount = template.variables.length;

    return (
      <motion.div
        key={template.id}
        layout
        whileHover={{ scale: 1.01 }}
        className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg ${categoryConfig.bgColor}`}>
              <span className="text-lg">{categoryConfig.icon}</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{template.name}</h3>
              <div className="flex items-center space-x-3 mt-1">
                <span className={`text-xs px-2 py-1 rounded-full ${categoryConfig.bgColor} ${categoryConfig.color}`}>
                  {categoryConfig.label}
                </span>
                {variableCount > 0 && (
                  <span className="text-xs text-gray-500">
                    {variableCount}個の変数
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => handlePreviewTemplate(template)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="プレビュー"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDuplicateTemplate(template)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="複製"
            >
              <DuplicateIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleEditTemplate(template)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="編集"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDeleteTemplate(template.id)}
              className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
              title="削除"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Preview */}
        <div className="bg-gray-50 rounded-lg p-4 mb-3">
          <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap">
            {template.content}
          </p>
        </div>

        {/* Variables */}
        {template.variables.length > 0 && (
          <div className="flex items-center space-x-2">
            <VariableIcon className="h-4 w-4 text-gray-400" />
            <div className="flex flex-wrap gap-1">
              {template.variables.map(variable => (
                <span
                  key={variable}
                  className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs"
                >
                  {`{${variable}}`}
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl">
              <DocumentTextIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">メッセージテンプレート</h2>
              <p className="text-sm text-gray-600">
                再利用可能なメッセージテンプレートを管理
              </p>
            </div>
          </div>

          <Button onClick={handleCreateTemplate}>
            <PlusIcon className="h-4 w-4 mr-2" />
            新規テンプレート
          </Button>
        </div>
      </Card>

      {/* Category Filter */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
            selectedCategory === 'all'
              ? 'bg-primary-100 text-primary-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          すべて ({templates.length})
        </button>
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
          const count = templates.filter(t => t.category === key).length;
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(key as MessageTemplateCategory)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === key
                  ? `${config.bgColor} ${config.color}`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1">{config.icon}</span>
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Template List */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : getFilteredTemplates().length > 0 ? (
        <div className="grid gap-4">
          {getFilteredTemplates().map(template => renderTemplateCard(template))}
        </div>
      ) : (
        <Card>
          <div className="text-center py-12">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {selectedCategory === 'all' 
                ? 'テンプレートがまだ作成されていません'
                : `${CATEGORY_CONFIG[selectedCategory as MessageTemplateCategory].label}テンプレートはありません`
              }
            </p>
            <Button
              variant="secondary"
              onClick={handleCreateTemplate}
              className="mt-4"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              最初のテンプレートを作成
            </Button>
          </div>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                {editingTemplate ? 'テンプレートを編集' : '新規テンプレート'}
              </h3>

              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    テンプレート名 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例: 1週間前リマインダー"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    カテゴリー <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <motion.button
                        key={key}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setFormData({ ...formData, category: key as MessageTemplateCategory })}
                        className={`p-3 border rounded-lg text-center transition-all ${
                          formData.category === key
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-2xl">{config.icon}</span>
                        <div className="text-sm font-medium text-gray-900 mt-1">{config.label}</div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Subject (for email) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    件名（メール用）
                  </label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="【重要】ご予約のリマインダー"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メッセージ内容 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      id="template-content"
                      value={formData.content}
                      onChange={(e) => {
                        setFormData({ ...formData, content: e.target.value });
                        setCursorPosition(e.target.selectionStart);
                      }}
                      onSelect={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)}
                      rows={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="{customer_name}様&#10;&#10;いつもご利用いただきありがとうございます。&#10;&#10;{date} {time}にご予約をいただいております。"
                    />
                    <button
                      type="button"
                      onClick={() => setShowVariableMenu(!showVariableMenu)}
                      className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 bg-white rounded-lg border border-gray-200 hover:border-gray-300"
                    >
                      <VariableIcon className="h-4 w-4" />
                    </button>

                    {/* Variable Menu */}
                    <AnimatePresence>
                      {showVariableMenu && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute top-12 right-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-10 max-h-80 overflow-y-auto"
                        >
                          <div className="text-sm font-medium text-gray-700 mb-2 px-2">
                            変数を挿入
                          </div>
                          {DEFAULT_TEMPLATE_VARIABLES.map(variable => (
                            <button
                              key={variable.name}
                              onClick={() => insertVariable(variable.name)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md"
                            >
                              <div className="font-mono text-sm text-primary-600">
                                {`{${variable.name}}`}
                              </div>
                              <div className="text-xs text-gray-500">{variable.description}</div>
                              <div className="text-xs text-gray-400">例: {variable.example}</div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* Detected Variables */}
                  {extractVariables(formData.content).length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">検出された変数: </span>
                      {extractVariables(formData.content).map(variable => (
                        <span
                          key={variable}
                          className="ml-1 px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs"
                        >
                          {`{${variable}}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
                <Button
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleSaveTemplate}
                  disabled={saving || !formData.name || !formData.content}
                >
                  {saving ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>保存中...</span>
                    </div>
                  ) : (
                    editingTemplate ? '更新' : '作成'
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreviewModal && previewData.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPreviewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-6">メッセージプレビュー</h3>

              <div className="space-y-4">
                {previewData.map((preview, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{preview.customer_name}</span>
                      <span className="text-xs text-gray-500 uppercase">{preview.channel_type}</span>
                    </div>
                    
                    {preview.subject && (
                      <div className="mb-2">
                        <span className="text-xs text-gray-500">件名:</span>
                        <p className="text-sm font-medium text-gray-700">{preview.subject}</p>
                      </div>
                    )}
                    
                    <div className="bg-gray-50 rounded p-3">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700">
                        {preview.content}
                      </pre>
                    </div>
                    
                    {Object.keys(preview.variables_used).length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-500">使用された変数:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(preview.variables_used).map(([name, desc]) => (
                            <span
                              key={name}
                              className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs"
                              title={desc}
                            >
                              {`{${name}}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t">
                <Button
                  variant="secondary"
                  onClick={() => setShowPreviewModal(false)}
                >
                  閉じる
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}