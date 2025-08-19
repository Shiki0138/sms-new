const BaseService = require('./base.service');

/**
 * Message service for managing communications
 */
class MessageService extends BaseService {
  constructor() {
    super('messages');
  }

  /**
   * Get conversation history with a customer
   * @param {string} customerId - Customer ID
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of messages
   */
  async getConversation(customerId, tenantId, options = {}) {
    return await this.findAll({
      ...options,
      tenantId,
      filters: {
        customer_id: customerId
      },
      orderBy: 'created_at',
      orderDirection: 'desc'
    });
  }

  /**
   * Send a message
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} Sent message
   */
  async sendMessage(messageData) {
    try {
      // Validate required fields
      const requiredFields = ['tenant_id', 'customer_id', 'channel_type', 'content'];
      for (const field of requiredFields) {
        if (!messageData[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Set default values
      const message = {
        ...messageData,
        direction: 'sent',
        message_type: messageData.message_type || 'text',
        metadata: messageData.metadata || {}
      };

      // Create message record
      const createdMessage = await this.create(message);

      // TODO: Integrate with actual messaging providers (LINE, Instagram, SMS)
      // This would be handled by separate provider services

      return createdMessage;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Mark message as read
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Updated message
   */
  async markAsRead(messageId) {
    return await this.update(messageId, {
      read_at: new Date().toISOString()
    });
  }

  /**
   * Mark multiple messages as read
   * @param {Array} messageIds - Array of message IDs
   * @returns {Promise<Array>} Updated messages
   */
  async markManyAsRead(messageIds) {
    return await this.updateMany(
      { id: messageIds },
      { read_at: new Date().toISOString() }
    );
  }

  /**
   * Get unread message count
   * @param {string} tenantId - Tenant ID
   * @param {string} customerId - Customer ID (optional)
   * @returns {Promise<number>} Unread count
   */
  async getUnreadCount(tenantId, customerId = null) {
    const filters = {
      direction: 'received',
      read_at: null
    };

    if (customerId) {
      filters.customer_id = customerId;
    }

    return await this.count(filters, { tenantId });
  }

  /**
   * Search messages
   * @param {string} searchTerm - Search term
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of messages
   */
  async search(searchTerm, tenantId, options = {}) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*, customers(*)')
        .eq('tenant_id', tenantId)
        .ilike('content', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(options.limit || 50);

      if (error) throw error;

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get messages by channel
   * @param {string} channelType - Channel type (line, instagram, email, sms)
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of messages
   */
  async getByChannel(channelType, tenantId, options = {}) {
    return await this.findAll({
      ...options,
      tenantId,
      filters: {
        ...options.filters,
        channel_type: channelType
      }
    });
  }

  /**
   * Create bulk message record
   * @param {Object} bulkMessageData - Bulk message data
   * @returns {Promise<Object>} Created bulk message
   */
  async createBulkMessage(bulkMessageData) {
    try {
      const { data, error } = await this.supabase
        .from('bulk_messages')
        .insert(bulkMessageData)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update bulk message status
   * @param {string} bulkMessageId - Bulk message ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Updated bulk message
   */
  async updateBulkMessage(bulkMessageId, updates) {
    try {
      const { data, error } = await this.supabase
        .from('bulk_messages')
        .update(updates)
        .eq('id', bulkMessageId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get bulk messages
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of bulk messages
   */
  async getBulkMessages(tenantId, options = {}) {
    try {
      let query = this.supabase
        .from('bulk_messages')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get message statistics
   * @param {string} tenantId - Tenant ID
   * @param {string} period - Period (day, week, month)
   * @returns {Promise<Object>} Message statistics
   */
  async getStatistics(tenantId, period = 'month') {
    try {
      const stats = await this.executeRpc('get_message_stats', {
        p_tenant_id: tenantId,
        p_period: period
      });

      return stats[0] || {
        total_sent: 0,
        total_received: 0,
        by_channel: {
          line: { sent: 0, received: 0 },
          instagram: { sent: 0, received: 0 },
          email: { sent: 0, received: 0 },
          sms: { sent: 0, received: 0 }
        },
        response_rate: 0,
        average_response_time: 0
      };
    } catch (error) {
      console.error('Error fetching message stats:', error);
      return {
        total_sent: 0,
        total_received: 0,
        by_channel: {
          line: { sent: 0, received: 0 },
          instagram: { sent: 0, received: 0 },
          email: { sent: 0, received: 0 },
          sms: { sent: 0, received: 0 }
        },
        response_rate: 0,
        average_response_time: 0
      };
    }
  }
}

module.exports = new MessageService();