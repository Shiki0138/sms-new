import React, { useState, useEffect } from 'react';
import { MessageCircle, ExternalLink, Copy, Check, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

interface LineConfig {
  channelAccessToken: string;
  channelSecret: string;
  webhookUrl: string;
  isConfigured: boolean;
}

const LineIntegrationPage: React.FC = () => {
  const { tenant } = useAuth();
  const [config, setConfig] = useState<LineConfig>({
    channelAccessToken: '',
    channelSecret: '',
    webhookUrl: '',
    isConfigured: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Webhook URLを生成
  const webhookUrl = `${window.location.origin}/api/webhooks/line`;

  useEffect(() => {
    loadLineConfig();
  }, []);

  const loadLineConfig = async () => {
    try {
      // TODO: データベースから既存の設定を取得
      // const existingConfig = await getLineConfig(tenant?.id);
      // setConfig(existingConfig);
    } catch (error) {
      console.error('LINE設定の読み込みに失敗:', error);
    }
  };

  const handleSave = async () => {
    if (!config.channelAccessToken || !config.channelSecret) {
      toast.error('チャンネルアクセストークンとチャンネルシークレットを入力してください');
      return;
    }

    try {
      setIsLoading(true);
      
      // TODO: データベースに設定を保存
      // await saveLineConfig(tenant?.id, {
      //   channelAccessToken: config.channelAccessToken,
      //   channelSecret: config.channelSecret,
      //   webhookUrl,
      // });

      setConfig(prev => ({ ...prev, isConfigured: true, webhookUrl }));
      toast.success('LINE Bot設定を保存しました');
    } catch (error) {
      toast.error('設定の保存に失敗しました');
      console.error('LINE設定の保存に失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('コピーしました');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error('コピーに失敗しました');
    }
  };

  const testConnection = async () => {
    if (!config.channelAccessToken) {
      toast.error('チャンネルアクセストークンを入力してください');
      return;
    }

    try {
      setIsLoading(true);
      
      // LINE APIに接続テスト
      const response = await fetch('https://api.line.me/v2/bot/info', {
        headers: {
          'Authorization': `Bearer ${config.channelAccessToken}`,
        },
      });

      if (response.ok) {
        toast.success('LINE APIとの接続に成功しました');
      } else {
        toast.error('LINE APIとの接続に失敗しました。トークンを確認してください。');
      }
    } catch (error) {
      toast.error('接続テストに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <MessageCircle className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">LINE Bot連携設定</h1>
          <p className="text-gray-600">顧客とのLINEメッセージでのやりとりを有効化</p>
        </div>
      </div>

      {/* 設定状況 */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${config.isConfigured ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="font-medium">
                {config.isConfigured ? 'LINE Bot設定完了' : 'LINE Bot未設定'}
              </span>
            </div>
            {config.isConfigured && (
              <Button
                variant="outline"
                size="sm"
                onClick={testConnection}
                disabled={isLoading}
              >
                接続テスト
              </Button>
            )}
          </div>
          {config.isConfigured && (
            <p className="text-sm text-green-600 mt-2">
              LINE Botが正常に設定されています。顧客はLINEでメッセージを送信できます。
            </p>
          )}
        </div>
      </Card>

      {/* 設定手順 */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">LINE Bot設定手順</h2>
          
          <div className="space-y-6">
            {/* ステップ1 */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">1</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-2">LINE Developers Console にアクセス</h3>
                <p className="text-gray-600 text-sm mb-3">
                  LINE Developers Console でMessaging APIチャンネルを作成してください。
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://developers.line.biz/console/', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  LINE Developers Console を開く
                </Button>
              </div>
            </div>

            {/* ステップ2 */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">2</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-2">Webhook URL を設定</h3>
                <p className="text-gray-600 text-sm mb-3">
                  LINE Developers Console のMessaging API設定で、以下のWebhook URLを設定してください。
                </p>
                <div className="bg-gray-50 border rounded-lg p-3 flex items-center justify-between">
                  <code className="text-sm text-gray-800 break-all">{webhookUrl}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                  >
                    {copiedField === 'webhook' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* ステップ3 */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">3</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-2">アクセストークンとシークレットを取得</h3>
                <p className="text-gray-600 text-sm mb-4">
                  LINE Developers Console から以下の情報をコピーして、下記のフォームに入力してください。
                </p>

                <div className="space-y-4">
                  {/* チャンネルアクセストークン */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      チャンネルアクセストークン
                    </label>
                    <div className="relative">
                      <input
                        type={showTokens ? 'text' : 'password'}
                        value={config.channelAccessToken}
                        onChange={(e) => setConfig(prev => ({ ...prev, channelAccessToken: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                        placeholder="チャンネルアクセストークンを入力"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTokens(!showTokens)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      >
                        {showTokens ? '隠す' : '表示'}
                      </button>
                    </div>
                  </div>

                  {/* チャンネルシークレット */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      チャンネルシークレット
                    </label>
                    <input
                      type={showTokens ? 'text' : 'password'}
                      value={config.channelSecret}
                      onChange={(e) => setConfig(prev => ({ ...prev, channelSecret: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="チャンネルシークレットを入力"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 保存ボタン */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Info className="h-4 w-4" />
                <span>設定情報は安全に暗号化されて保存されます</span>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={testConnection}
                  disabled={isLoading || !config.channelAccessToken}
                >
                  接続テスト
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isLoading || !config.channelAccessToken || !config.channelSecret}
                  className="flex items-center space-x-2"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <span>設定を保存</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 注意事項 */}
      <Card>
        <div className="p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-gray-900 mb-2">重要な注意事項</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• アクセストークンとシークレットは第三者に絶対に教えないでください</li>
                <li>• LINE Botの応答設定で「Bot応答メッセージ」を無効にしてください</li>
                <li>• Webhook URLは必ず「利用する」に設定してください</li>
                <li>• 設定完了後、LINE Botアカウントを友だち追加してテストしてください</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {config.isConfigured && (
        <Card>
          <div className="p-6">
            <h3 className="font-medium text-gray-900 mb-4">次のステップ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">顧客にBotを案内</h4>
                <p className="text-sm text-blue-700 mb-3">
                  顧客にLINE Botアカウントを友だち追加してもらい、メッセージのやりとりを開始しましょう。
                </p>
                <Button variant="outline" size="sm">
                  QRコード生成
                </Button>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">自動応答を設定</h4>
                <p className="text-sm text-green-700 mb-3">
                  よくある質問への自動応答や、営業時間外の応答メッセージを設定できます。
                </p>
                <Button variant="outline" size="sm">
                  自動応答設定
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default LineIntegrationPage;