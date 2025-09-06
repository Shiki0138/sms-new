'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create channel_configs table
    await queryInterface.createTable('channel_configs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      channel: {
        type: Sequelize.ENUM('sms', 'email', 'line', 'instagram'),
        allowNull: false
      },
      provider: {
        type: Sequelize.STRING,
        allowNull: false
      },
      config: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {}
      },
      encryptedConfig: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      webhookUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },
      webhookSecret: {
        type: Sequelize.STRING,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      isVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      verifiedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      lastTestAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {}
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add unique index for userId and channel
    await queryInterface.addIndex('channel_configs', ['userId', 'channel'], {
      unique: true,
      name: 'channel_configs_user_channel_unique'
    });

    // Create message_conversations table
    await queryInterface.createTable('message_conversations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      customerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'customers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      channel: {
        type: Sequelize.ENUM('sms', 'email', 'line', 'instagram', 'unified'),
        allowNull: false
      },
      channelIdentifier: {
        type: Sequelize.STRING,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING,
        allowNull: true
      },
      lastMessageAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      lastMessagePreview: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      unreadCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      isPinned: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      isArchived: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {}
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes for message_conversations
    await queryInterface.addIndex('message_conversations', ['userId', 'customerId', 'channel'], {
      name: 'message_conversations_user_customer_channel'
    });
    await queryInterface.addIndex('message_conversations', ['lastMessageAt'], {
      name: 'message_conversations_last_message'
    });

    // Create bulk_message_jobs table
    await queryInterface.createTable('bulk_message_jobs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      channels: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: []
      },
      recipientFilter: {
        type: Sequelize.JSON,
        defaultValue: {}
      },
      recipientCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      messageContent: {
        type: Sequelize.JSON,
        allowNull: false
      },
      scheduledAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('draft', 'scheduled', 'processing', 'completed', 'failed', 'cancelled'),
        defaultValue: 'draft'
      },
      statistics: {
        type: Sequelize.JSON,
        defaultValue: {
          total: 0,
          sent: 0,
          delivered: 0,
          failed: 0,
          opened: 0,
          clicked: 0
        }
      },
      failureReason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {}
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes for bulk_message_jobs
    await queryInterface.addIndex('bulk_message_jobs', ['userId', 'status'], {
      name: 'bulk_message_jobs_user_status'
    });
    await queryInterface.addIndex('bulk_message_jobs', ['scheduledAt'], {
      name: 'bulk_message_jobs_scheduled'
    });

    // Update messages table to add new columns
    await queryInterface.addColumn('messages', 'conversationId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'message_conversations',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('messages', 'bulkJobId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'bulk_message_jobs',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('messages', 'emailSubject', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('messages', 'openedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('messages', 'clickedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('messages', 'bouncedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Update customers table to add multi-channel fields
    await queryInterface.addColumn('customers', 'lineUserId', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('customers', 'instagramUsername', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('customers', 'instagramUserId', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('customers', 'preferredChannel', {
      type: Sequelize.ENUM('sms', 'email', 'line', 'instagram'),
      defaultValue: 'sms'
    });

    await queryInterface.addColumn('customers', 'channelPreferences', {
      type: Sequelize.JSON,
      defaultValue: {
        sms: true,
        email: true,
        line: false,
        instagram: false
      }
    });

    await queryInterface.addColumn('customers', 'lastContactedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('customers', 'lastContactedChannel', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Update messages table to include SMS in channel enum
    await queryInterface.changeColumn('messages', 'channel', {
      type: Sequelize.ENUM('sms', 'email', 'line', 'instagram'),
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove columns from customers table
    await queryInterface.removeColumn('customers', 'lastContactedChannel');
    await queryInterface.removeColumn('customers', 'lastContactedAt');
    await queryInterface.removeColumn('customers', 'channelPreferences');
    await queryInterface.removeColumn('customers', 'preferredChannel');
    await queryInterface.removeColumn('customers', 'instagramUserId');
    await queryInterface.removeColumn('customers', 'instagramUsername');
    await queryInterface.removeColumn('customers', 'lineUserId');

    // Remove columns from messages table
    await queryInterface.removeColumn('messages', 'bouncedAt');
    await queryInterface.removeColumn('messages', 'clickedAt');
    await queryInterface.removeColumn('messages', 'openedAt');
    await queryInterface.removeColumn('messages', 'emailSubject');
    await queryInterface.removeColumn('messages', 'bulkJobId');
    await queryInterface.removeColumn('messages', 'conversationId');

    // Drop tables
    await queryInterface.dropTable('bulk_message_jobs');
    await queryInterface.dropTable('message_conversations');
    await queryInterface.dropTable('channel_configs');

    // Revert messages channel enum
    await queryInterface.changeColumn('messages', 'channel', {
      type: Sequelize.ENUM('email', 'line', 'instagram'),
      allowNull: false
    });
  }
};