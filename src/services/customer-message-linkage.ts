import { supabase } from '../lib/supabase';

export interface CustomerLinkageResult {
  customerId: string | null;
  isNewCustomer: boolean;
  confidence: number;
  suggestedName?: string;
}

export interface MessageCustomerInfo {
  customerId?: string;
  name: string;
  channelType: 'line' | 'instagram' | 'email';
  channelId: string;
  isLinked: boolean;
}

/**
 * 顧客管理とメッセージの連動サービス
 * LINEやInstagramのメッセージと既存顧客の紐付けを管理
 */
export class CustomerMessageLinkageService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * メッセージ送信者を既存顧客と照合
   */
  async linkMessageToCustomer(
    channelType: 'line' | 'instagram' | 'email',
    channelId: string,
    senderName?: string
  ): Promise<CustomerLinkageResult> {
    try {
      // 1. 完全一致チェック（チャンネルIDで既存の紐付けを確認）
      const exactMatch = await this.findExactMatch(channelType, channelId);
      if (exactMatch) {
        return {
          customerId: exactMatch.id,
          isNewCustomer: false,
          confidence: 1.0,
        };
      }

      // 2. 部分一致チェック（名前での照合）
      if (senderName) {
        const nameMatches = await this.findNameMatches(senderName);
        if (nameMatches.length > 0) {
          // 最も可能性の高い顧客を返す
          const bestMatch = nameMatches[0];
          return {
            customerId: bestMatch.id,
            isNewCustomer: false,
            confidence: this.calculateNameConfidence(senderName, bestMatch.name),
            suggestedName: bestMatch.name,
          };
        }
      }

      // 3. 新規顧客として判定
      return {
        customerId: null,
        isNewCustomer: true,
        confidence: 0.0,
      };
    } catch (error) {
      console.error('Error linking message to customer:', error);
      return {
        customerId: null,
        isNewCustomer: true,
        confidence: 0.0,
      };
    }
  }

  /**
   * 顧客とメッセージチャンネルを手動で紐付け
   */
  async manualLinkCustomerToChannel(
    customerId: string,
    channelType: 'line' | 'instagram' | 'email',
    channelId: string,
    channelName?: string
  ): Promise<boolean> {
    try {
      // 1. 顧客テーブルを更新
      const updateData: any = {};
      if (channelType === 'line') {
        updateData.line_id = channelId;
      } else if (channelType === 'instagram') {
        updateData.instagram_id = channelId;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: customerError } = await supabase
          .from('customers')
          .update(updateData)
          .eq('id', customerId)
          .eq('tenant_id', this.tenantId);

        if (customerError) throw customerError;
      }

      // 2. メッセージチャンネルレコードを作成/更新
      const { error: channelError } = await supabase
        .from('message_channels')
        .upsert({
          tenant_id: this.tenantId,
          customer_id: customerId,
          channel_type: channelType,
          channel_id: channelId,
          channel_name: channelName || channelId,
          is_active: true,
        }, {
          onConflict: 'tenant_id,channel_type,channel_id',
        });

      if (channelError) throw channelError;

      // 3. 既存のメッセージを顧客に関連付け
      await this.updateExistingMessages(channelType, channelId, customerId);

      return true;
    } catch (error) {
      console.error('Error manually linking customer to channel:', error);
      return false;
    }
  }

  /**
   * 新規顧客を作成してメッセージと紐付け
   */
  async createCustomerFromMessage(
    name: string,
    channelType: 'line' | 'instagram' | 'email',
    channelId: string
  ): Promise<{ customerId: string; success: boolean }> {
    try {
      // 1. 新規顧客を作成
      const customerData: any = {
        tenant_id: this.tenantId,
        name: name,
        visit_count: 0,
      };

      // チャンネル情報を追加
      if (channelType === 'line') {
        customerData.line_id = channelId;
      } else if (channelType === 'instagram') {
        customerData.instagram_id = channelId;
      } else if (channelType === 'email') {
        customerData.email = channelId;
      }

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert(customerData)
        .select()
        .single();

      if (customerError) throw customerError;

      // 2. メッセージチャンネルレコードを作成
      if (channelType !== 'email') { // emailは直接customers.emailに入るので除外
        await supabase
          .from('message_channels')
          .insert({
            tenant_id: this.tenantId,
            customer_id: customer.id,
            channel_type: channelType,
            channel_id: channelId,
            channel_name: name,
            is_active: true,
          });
      }

      // 3. 既存のメッセージを新規顧客に関連付け
      await this.updateExistingMessages(channelType, channelId, customer.id);

      return {
        customerId: customer.id,
        success: true,
      };
    } catch (error) {
      console.error('Error creating customer from message:', error);
      return {
        customerId: '',
        success: false,
      };
    }
  }

  /**
   * メッセージ送信者の情報を取得（顧客情報付き）
   */
  async getMessageCustomerInfo(
    channelType: 'line' | 'instagram' | 'email',
    channelId: string,
    senderName?: string
  ): Promise<MessageCustomerInfo> {
    try {
      // 既存の紐付けを確認
      const linkage = await this.linkMessageToCustomer(channelType, channelId, senderName);

      if (linkage.customerId) {
        // 顧客情報を取得
        const { data: customer, error } = await supabase
          .from('customers')
          .select('name')
          .eq('id', linkage.customerId)
          .eq('tenant_id', this.tenantId)
          .single();

        if (!error && customer) {
          return {
            customerId: linkage.customerId,
            name: customer.name,
            channelType,
            channelId,
            isLinked: true,
          };
        }
      }

      // 紐付けされていない場合
      return {
        name: senderName || channelId,
        channelType,
        channelId,
        isLinked: false,
      };
    } catch (error) {
      console.error('Error getting message customer info:', error);
      return {
        name: senderName || channelId,
        channelType,
        channelId,
        isLinked: false,
      };
    }
  }

  /**
   * 顧客の全メッセージチャンネルを取得
   */
  async getCustomerChannels(customerId: string): Promise<Array<{
    channelType: 'line' | 'instagram' | 'email';
    channelId: string;
    channelName: string;
    isActive: boolean;
  }>> {
    try {
      const { data: channels, error } = await supabase
        .from('message_channels')
        .select('channel_type, channel_id, channel_name, is_active')
        .eq('customer_id', customerId)
        .eq('tenant_id', this.tenantId);

      if (error) throw error;

      return channels || [];
    } catch (error) {
      console.error('Error getting customer channels:', error);
      return [];
    }
  }

  /**
   * 未紐付けメッセージの一覧を取得
   */
  async getUnlinkedMessages(): Promise<Array<{
    channelType: 'line' | 'instagram' | 'email';
    channelId: string;
    senderName?: string;
    messageCount: number;
    lastMessageAt: string;
  }>> {
    try {
      // customer_idがnullのメッセージを集計
      const { data: unlinked, error } = await supabase
        .from('messages')
        .select(`
          channel_type:message_channels(channel_type),
          channel_id:message_channels(channel_id),
          channel_name:message_channels(channel_name),
          sent_at
        `)
        .is('customer_id', null)
        .eq('tenant_id', this.tenantId)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      // グループ化して集計
      const grouped = new Map();
      unlinked?.forEach((msg: any) => {
        const key = `${msg.channel_type.channel_type}-${msg.channel_id.channel_id}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            channelType: msg.channel_type.channel_type,
            channelId: msg.channel_id.channel_id,
            senderName: msg.channel_name.channel_name,
            messageCount: 0,
            lastMessageAt: msg.sent_at,
          });
        }
        const item = grouped.get(key);
        item.messageCount++;
        if (msg.sent_at > item.lastMessageAt) {
          item.lastMessageAt = msg.sent_at;
        }
      });

      return Array.from(grouped.values());
    } catch (error) {
      console.error('Error getting unlinked messages:', error);
      return [];
    }
  }

  // プライベートメソッド

  private async findExactMatch(
    channelType: 'line' | 'instagram' | 'email',
    channelId: string
  ): Promise<{ id: string; name: string } | null> {
    try {
      let query = supabase
        .from('customers')
        .select('id, name')
        .eq('tenant_id', this.tenantId);

      if (channelType === 'line') {
        query = query.eq('line_id', channelId);
      } else if (channelType === 'instagram') {
        query = query.eq('instagram_id', channelId);
      } else if (channelType === 'email') {
        query = query.eq('email', channelId);
      }

      const { data, error } = await query.single();

      if (error || !data) return null;
      return data;
    } catch (error) {
      return null;
    }
  }

  private async findNameMatches(
    senderName: string
  ): Promise<Array<{ id: string; name: string }>> {
    try {
      // 部分一致検索（PostgreSQLのILIKE使用）
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .eq('tenant_id', this.tenantId)
        .or(`name.ilike.%${senderName}%,name.ilike.%${senderName.replace(/\s+/g, '')}%`)
        .limit(5);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error finding name matches:', error);
      return [];
    }
  }

  private calculateNameConfidence(senderName: string, customerName: string): number {
    // 簡単な類似度計算
    const sender = senderName.toLowerCase().replace(/\s+/g, '');
    const customer = customerName.toLowerCase().replace(/\s+/g, '');

    if (sender === customer) return 0.95;
    if (sender.includes(customer) || customer.includes(sender)) return 0.8;

    // レーベンシュタイン距離による類似度
    const distance = this.levenshteinDistance(sender, customer);
    const maxLen = Math.max(sender.length, customer.length);
    return Math.max(0.5, 1 - distance / maxLen);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private async updateExistingMessages(
    channelType: 'line' | 'instagram' | 'email',
    channelId: string,
    customerId: string
  ): Promise<void> {
    try {
      // チャンネルIDに基づいて既存のメッセージを顧客に関連付け
      const { error } = await supabase
        .from('messages')
        .update({ customer_id: customerId })
        .eq('tenant_id', this.tenantId)
        .is('customer_id', null)
        .in('channel_id', [
          supabase
            .from('message_channels')
            .select('id')
            .eq('channel_type', channelType)
            .eq('channel_id', channelId)
        ]);

      if (error) {
        console.error('Error updating existing messages:', error);
      }
    } catch (error) {
      console.error('Error updating existing messages:', error);
    }
  }
}