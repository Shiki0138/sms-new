import React from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Palette, 
  Users, 
  Star, 
  Award,
  TrendingUp,
  Calendar,
  MessageCircle,
  Settings
} from 'lucide-react';
import { colors, salonTheme, animations } from '../styles/design-system';

const DesignBoardPage: React.FC = () => {
  const colorPalettes = [
    {
      name: 'プライマリー（インディゴ）',
      description: '信頼性と高級感を表現する洗練されたインディゴブルー',
      colors: colors.primary,
      characteristics: ['男女両方に好まれる', '信頼性', '高級感', 'プロフェッショナル'],
    },
    {
      name: 'セカンダリー（ウォームグレー）',
      description: 'モダンで温かみのあるグレートーン',
      colors: colors.secondary,
      characteristics: ['現代的', '洗練', '中性的', '使いやすい'],
    },
    {
      name: 'アクセント（プレミアムゴールド）',
      description: 'ラグジュアリー感を演出する上品なゴールド',
      colors: colors.accent,
      characteristics: ['高級感', 'エレガント', '特別感', 'プレミアム'],
    },
  ];

  const themeExamples = [
    {
      name: 'エレガント',
      theme: salonTheme.elegant,
      description: '日常使用向け - 男女両方に好まれる',
      useCase: '一般的なサロン経営者に最適',
    },
    {
      name: 'ラグジュアリー',
      theme: salonTheme.luxury,
      description: 'プレミアム感重視 - 高級サロン向け',
      useCase: '高級サロンや特別なサービス向け',
    },
    {
      name: 'モダン',
      theme: salonTheme.modern,
      description: 'スタイリッシュで現代的',
      useCase: '若い世代のサロンオーナー向け',
    },
  ];

  const demoComponents = [
    { icon: Calendar, label: '予約管理', color: 'primary' },
    { icon: Users, label: '顧客管理', color: 'secondary' },
    { icon: MessageCircle, label: 'メッセージ', color: 'accent' },
    { icon: Settings, label: '設定', color: 'primary' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={animations.spring.gentle}
        className="mb-8"
      >
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-primary-100 rounded-xl">
            <Palette className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              デザインシステム - ジェンダーニュートラル
            </h1>
            <p className="text-gray-600 mt-1">
              男女両方に好まれる洗練された配色システム
            </p>
          </div>
        </div>
        
        {/* 特徴説明 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Users, title: 'ジェンダーニュートラル', desc: '男女問わず好まれる配色' },
            { icon: Award, title: '高級感', desc: 'プレミアムな印象を演出' },
            { icon: Star, title: '信頼性', desc: 'プロフェッショナルな印象' },
            { icon: TrendingUp, title: 'モダン', desc: '現代的で洗練されたデザイン' },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, ...animations.spring.gentle }}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-200"
            >
              <feature.icon className="h-8 w-8 text-primary-600 mb-3" />
              <h3 className="font-bold text-gray-800 mb-1">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* カラーパレット */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, ...animations.spring.gentle }}
        className="mb-12"
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <Sparkles className="h-6 w-6 mr-2 text-primary-600" />
          カラーパレット
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {colorPalettes.map((palette, paletteIndex) => (
            <motion.div
              key={palette.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: paletteIndex * 0.1, ...animations.spring.gentle }}
              className="bg-white rounded-2xl overflow-hidden shadow-lg"
            >
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{palette.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{palette.description}</p>
                
                {/* 色見本 */}
                <div className="grid grid-cols-5 gap-1 mb-4">
                  {Object.entries(palette.colors).map(([shade, color]) => (
                    <motion.div
                      key={shade}
                      whileHover={{ scale: 1.1 }}
                      className="aspect-square rounded-lg shadow-sm relative group cursor-pointer"
                      style={{ backgroundColor: color }}
                    >
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all" />
                      <div className="absolute bottom-1 left-1 text-xs font-mono text-white bg-black bg-opacity-50 px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {shade}
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                {/* 特徴 */}
                <div className="flex flex-wrap gap-2">
                  {palette.characteristics.map((char, charIndex) => (
                    <span
                      key={charIndex}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                    >
                      {char}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* テーマバリエーション */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, ...animations.spring.gentle }}
        className="mb-12"
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6">テーマバリエーション</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {themeExamples.map((theme, themeIndex) => (
            <motion.div
              key={theme.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: themeIndex * 0.1, ...animations.spring.gentle }}
              className="bg-white rounded-2xl overflow-hidden shadow-lg"
            >
              {/* テーマヘッダー */}
              <div 
                className="h-24 relative"
                style={{ 
                  background: `linear-gradient(135deg, ${theme.theme.primary}, ${theme.theme.secondary})` 
                }}
              >
                <div className="absolute inset-0 bg-black bg-opacity-10" />
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="font-bold text-lg">{theme.name}</h3>
                  <p className="text-sm opacity-90">{theme.description}</p>
                </div>
              </div>
              
              {/* テーマ詳細 */}
              <div className="p-6">
                <p className="text-gray-600 mb-4">{theme.useCase}</p>
                
                {/* カラー組み合わせ */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center">
                    <div 
                      className="w-12 h-12 rounded-lg mx-auto mb-2 shadow-sm"
                      style={{ backgroundColor: theme.theme.primary }}
                    />
                    <span className="text-xs text-gray-600">Primary</span>
                  </div>
                  <div className="text-center">
                    <div 
                      className="w-12 h-12 rounded-lg mx-auto mb-2 shadow-sm"
                      style={{ backgroundColor: theme.theme.secondary }}
                    />
                    <span className="text-xs text-gray-600">Secondary</span>
                  </div>
                  <div className="text-center">
                    <div 
                      className="w-12 h-12 rounded-lg mx-auto mb-2 shadow-sm"
                      style={{ backgroundColor: theme.theme.accent }}
                    />
                    <span className="text-xs text-gray-600">Accent</span>
                  </div>
                </div>
                
                {/* デモボタン */}
                <div className="space-y-2">
                  <button 
                    className="w-full py-2 px-4 rounded-lg font-medium transition-colors"
                    style={{ 
                      backgroundColor: theme.theme.primary,
                      color: 'white'
                    }}
                  >
                    プライマリーボタン
                  </button>
                  <button 
                    className="w-full py-2 px-4 rounded-lg font-medium border transition-colors"
                    style={{ 
                      borderColor: theme.theme.secondary,
                      color: theme.theme.secondary
                    }}
                  >
                    セカンダリーボタン
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* 実装例 */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, ...animations.spring.gentle }}
        className="mb-12"
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6">実装例</h2>
        
        {/* ナビゲーション例 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-primary-500 to-secondary-500 p-6 text-white">
            <h3 className="text-xl font-bold mb-2">サロン管理システム</h3>
            <p className="opacity-90">新しいカラーシステムの実装例</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {demoComponents.map((component, index) => (
                <motion.div
                  key={component.label}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-4 rounded-xl text-center cursor-pointer transition-all ${
                    component.color === 'primary' ? 'bg-primary-100 text-primary-700 hover:bg-primary-200' :
                    component.color === 'secondary' ? 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200' :
                    'bg-accent-100 text-accent-700 hover:bg-accent-200'
                  }`}
                >
                  <component.icon className="h-8 w-8 mx-auto mb-2" />
                  <span className="font-medium">{component.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* カラーガイドライン */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">カラー使用ガイドライン</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">✅ 推奨される使用法</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• プライマリーカラー: メインアクション、重要な要素</li>
                <li>• セカンダリーカラー: 補助的な要素、背景</li>
                <li>• アクセントカラー: 特別な要素、強調箇所</li>
                <li>• 組み合わせ使用で統一感のあるデザイン</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">💡 デザインのポイント</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• 男女問わず好まれる中性的な配色</li>
                <li>• 高級感を演出するプレミアムな色調</li>
                <li>• ビジネス用途にも適したプロフェッショナルな印象</li>
                <li>• 長時間使用しても疲れない落ち着いた色合い</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default DesignBoardPage;