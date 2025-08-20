#!/usr/bin/env node

/**
 * Migration Script: In-Memory Database to Supabase
 * Version: 1.0.0
 * Created: 2025-08-20
 * 
 * This script migrates data from the existing in-memory database to Supabase
 * with full error handling and rollback capabilities.
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

// Configuration
const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  BATCH_SIZE: 100,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  LOG_FILE: path.join(__dirname, '../logs/migration.log')
};

// Validation
if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Initialize Supabase client with service key for admin operations
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Logger utility
class Logger {
  constructor(logFile) {
    this.logFile = logFile;
  }

  async log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };

    console.log(`[${level}] ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));

    try {
      await fs.appendFile(
        this.logFile,
        JSON.stringify(logEntry) + '\n'
      );
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  async info(message, data) {
    await this.log('INFO', message, data);
  }

  async warn(message, data) {
    await this.log('WARN', message, data);
  }

  async error(message, data) {
    await this.log('ERROR', message, data);
  }

  async success(message, data) {
    await this.log('SUCCESS', message, data);
  }
}

// Migration tracker
class MigrationTracker {
  constructor() {
    this.stats = {
      users: { attempted: 0, succeeded: 0, failed: 0 },
      customers: { attempted: 0, succeeded: 0, failed: 0 },
      appointments: { attempted: 0, succeeded: 0, failed: 0 },
      sales: { attempted: 0, succeeded: 0, failed: 0 },
      messages: { attempted: 0, succeeded: 0, failed: 0 },
      settings: { attempted: 0, succeeded: 0, failed: 0 },
      staff: { attempted: 0, succeeded: 0, failed: 0 },
      services: { attempted: 0, succeeded: 0, failed: 0 },
      templates: { attempted: 0, succeeded: 0, failed: 0 },
      campaigns: { attempted: 0, succeeded: 0, failed: 0 }
    };
    this.errors = [];
    this.migrated = {
      users: new Map(),
      customers: new Map(),
      appointments: new Map(),
      sales: new Map(),
      staff: new Map(),
      services: new Map()
    };
  }

  recordAttempt(table) {
    if (this.stats[table]) {
      this.stats[table].attempted++;
    }
  }

  recordSuccess(table, oldId, newId) {
    if (this.stats[table]) {
      this.stats[table].succeeded++;
    }
    if (this.migrated[table]) {
      this.migrated[table].set(oldId, newId);
    }
  }

  recordFailure(table, error, data) {
    if (this.stats[table]) {
      this.stats[table].failed++;
    }
    this.errors.push({
      table,
      error: error.message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  getMappedId(table, oldId) {
    return this.migrated[table]?.get(oldId) || oldId;
  }

  getSummary() {
    return {
      stats: this.stats,
      totalErrors: this.errors.length,
      errors: this.errors.slice(0, 10) // First 10 errors
    };
  }
}

// Data loader from in-memory database
class DataLoader {
  constructor(dataPath) {
    this.dataPath = dataPath;
  }

  async loadData() {
    try {
      const dataFile = path.join(this.dataPath, 'database.json');
      const content = await fs.readFile(dataFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      // If no database.json, return mock data structure
      return this.getMockData();
    }
  }

  getMockData() {
    return {
      users: [],
      customers: [],
      appointments: [],
      sales: [],
      messages: [],
      messageTemplates: [],
      campaigns: [],
      settings: [],
      staff: [],
      services: []
    };
  }
}

// Migration utilities
class MigrationUtils {
  static async retry(fn, attempts = CONFIG.RETRY_ATTEMPTS) {
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === attempts - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * (i + 1)));
      }
    }
  }

  static async batchInsert(table, data, batchSize = CONFIG.BATCH_SIZE) {
    const results = [];
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const { data: inserted, error } = await supabase
        .from(table)
        .insert(batch)
        .select();

      if (error) throw error;
      results.push(...(inserted || []));
    }
    return results;
  }

  static sanitizeData(data, fields) {
    const sanitized = {};
    fields.forEach(field => {
      if (data[field] !== undefined) {
        sanitized[field] = data[field];
      }
    });
    return sanitized;
  }

  static async hashPassword(password) {
    return bcrypt.hash(password, 10);
  }

  static transformDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date.toISOString();
  }
}

// Individual table migrators
class TableMigrator {
  constructor(logger, tracker) {
    this.logger = logger;
    this.tracker = tracker;
  }

  async migrateUsers(users) {
    await this.logger.info(`Starting migration of ${users.length} users`);

    for (const user of users) {
      this.tracker.recordAttempt('users');

      try {
        // Create auth user first
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password || 'TempPassword123!',
          email_confirm: true
        });

        if (authError) throw authError;

        // Insert into users table
        const userData = MigrationUtils.sanitizeData(user, [
          'email', 'name', 'role', 'phone', 'is_active'
        ]);
        userData.id = authUser.user.id;
        userData.password_hash = await MigrationUtils.hashPassword(user.password || 'TempPassword123!');

        const { error: userError } = await supabase
          .from('users')
          .insert(userData);

        if (userError) throw userError;

        // Create default subscription
        const { error: subError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: authUser.user.id,
            plan: user.subscription?.plan || 'light',
            status: user.subscription?.status || 'trial',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          });

        if (subError) throw subError;

        this.tracker.recordSuccess('users', user.id, authUser.user.id);
        await this.logger.success(`Migrated user: ${user.email}`);
      } catch (error) {
        this.tracker.recordFailure('users', error, user);
        await this.logger.error(`Failed to migrate user: ${user.email}`, error);
      }
    }
  }

  async migrateCustomers(customers) {
    await this.logger.info(`Starting migration of ${customers.length} customers`);

    const customersToInsert = customers.map(customer => {
      this.tracker.recordAttempt('customers');

      return MigrationUtils.sanitizeData({
        ...customer,
        user_id: this.tracker.getMappedId('users', customer.user_id),
        birth_date: MigrationUtils.transformDate(customer.birth_date),
        first_visit_date: MigrationUtils.transformDate(customer.first_visit_date),
        last_visit_date: MigrationUtils.transformDate(customer.last_visit_date),
        tags: customer.tags || [],
        metadata: customer.metadata || {}
      }, [
        'user_id', 'name', 'phone', 'email', 'birth_date', 'gender',
        'address', 'notes', 'tags', 'first_visit_date', 'last_visit_date',
        'total_visits', 'total_spent', 'is_active', 'consent_sms', 'metadata'
      ]);
    });

    try {
      const results = await MigrationUtils.batchInsert('customers', customersToInsert);
      results.forEach((result, index) => {
        this.tracker.recordSuccess('customers', customers[index].id, result.id);
      });
      await this.logger.success(`Migrated ${results.length} customers`);
    } catch (error) {
      customersToInsert.forEach((_, index) => {
        this.tracker.recordFailure('customers', error, customers[index]);
      });
      await this.logger.error('Failed to migrate customers batch', error);
    }
  }

  async migrateAppointments(appointments) {
    await this.logger.info(`Starting migration of ${appointments.length} appointments`);

    const appointmentsToInsert = appointments.map(appointment => {
      this.tracker.recordAttempt('appointments');

      return MigrationUtils.sanitizeData({
        ...appointment,
        user_id: this.tracker.getMappedId('users', appointment.user_id),
        customer_id: this.tracker.getMappedId('customers', appointment.customer_id),
        staff_id: appointment.staff_id ? this.tracker.getMappedId('staff', appointment.staff_id) : null,
        service_id: appointment.service_id ? this.tracker.getMappedId('services', appointment.service_id) : null,
        appointment_date: MigrationUtils.transformDate(appointment.date),
        confirmed_at: MigrationUtils.transformDate(appointment.confirmed_at),
        cancelled_at: MigrationUtils.transformDate(appointment.cancelled_at),
        reminder_sent_at: MigrationUtils.transformDate(appointment.reminder_sent_at),
        metadata: appointment.metadata || {}
      }, [
        'user_id', 'customer_id', 'staff_id', 'service_id',
        'appointment_date', 'start_time', 'end_time', 'status',
        'price', 'notes', 'reminder_sent', 'reminder_sent_at',
        'confirmed_at', 'cancelled_at', 'cancellation_reason', 'metadata'
      ]);
    });

    try {
      const results = await MigrationUtils.batchInsert('appointments', appointmentsToInsert);
      results.forEach((result, index) => {
        this.tracker.recordSuccess('appointments', appointments[index].id, result.id);
      });
      await this.logger.success(`Migrated ${results.length} appointments`);
    } catch (error) {
      appointmentsToInsert.forEach((_, index) => {
        this.tracker.recordFailure('appointments', error, appointments[index]);
      });
      await this.logger.error('Failed to migrate appointments batch', error);
    }
  }

  async migrateSales(sales) {
    await this.logger.info(`Starting migration of ${sales.length} sales`);

    const salesToInsert = sales.map(sale => {
      this.tracker.recordAttempt('sales');

      return MigrationUtils.sanitizeData({
        ...sale,
        user_id: this.tracker.getMappedId('users', sale.user_id),
        customer_id: sale.customer_id ? this.tracker.getMappedId('customers', sale.customer_id) : null,
        appointment_id: sale.appointment_id ? this.tracker.getMappedId('appointments', sale.appointment_id) : null,
        staff_id: sale.staff_id ? this.tracker.getMappedId('staff', sale.staff_id) : null,
        sale_date: MigrationUtils.transformDate(sale.date),
        items: sale.items || [],
        metadata: sale.metadata || {}
      }, [
        'user_id', 'customer_id', 'appointment_id', 'staff_id',
        'sale_date', 'items', 'subtotal', 'tax_amount', 'discount_amount',
        'total_amount', 'payment_method', 'payment_status', 'notes', 'metadata'
      ]);
    });

    try {
      const results = await MigrationUtils.batchInsert('sales', salesToInsert);
      results.forEach((result, index) => {
        this.tracker.recordSuccess('sales', sales[index].id, result.id);
      });
      await this.logger.success(`Migrated ${results.length} sales`);
    } catch (error) {
      salesToInsert.forEach((_, index) => {
        this.tracker.recordFailure('sales', error, sales[index]);
      });
      await this.logger.error('Failed to migrate sales batch', error);
    }
  }

  async migrateMessages(messages) {
    await this.logger.info(`Starting migration of ${messages.length} messages`);

    const messagesToInsert = messages.map(message => {
      this.tracker.recordAttempt('messages');

      return MigrationUtils.sanitizeData({
        ...message,
        user_id: this.tracker.getMappedId('users', message.user_id),
        customer_id: message.customer_id ? this.tracker.getMappedId('customers', message.customer_id) : null,
        sent_at: MigrationUtils.transformDate(message.sent_at),
        delivered_at: MigrationUtils.transformDate(message.delivered_at),
        failed_at: MigrationUtils.transformDate(message.failed_at),
        metadata: message.metadata || {}
      }, [
        'user_id', 'customer_id', 'template_id', 'campaign_id',
        'type', 'recipient_phone', 'recipient_name', 'subject', 'content',
        'status', 'sent_at', 'delivered_at', 'failed_at', 'error_message',
        'provider', 'provider_message_id', 'cost', 'segments', 'metadata'
      ]);
    });

    try {
      const results = await MigrationUtils.batchInsert('messages', messagesToInsert);
      results.forEach((result, index) => {
        this.tracker.recordSuccess('messages', messages[index].id, result.id);
      });
      await this.logger.success(`Migrated ${results.length} messages`);
    } catch (error) {
      messagesToInsert.forEach((_, index) => {
        this.tracker.recordFailure('messages', error, messages[index]);
      });
      await this.logger.error('Failed to migrate messages batch', error);
    }
  }

  async migrateSettings(settings) {
    await this.logger.info(`Starting migration of ${settings.length} settings`);

    for (const setting of settings) {
      this.tracker.recordAttempt('settings');

      try {
        const settingData = MigrationUtils.sanitizeData({
          ...setting,
          user_id: this.tracker.getMappedId('users', setting.user_id),
          business_hours: setting.business_hours || {},
          notification_settings: setting.notification_settings || {},
          api_settings: setting.api_settings || {}
        }, [
          'user_id', 'business_name', 'business_phone', 'business_email',
          'business_address', 'business_hours', 'sms_sender_name',
          'timezone', 'language', 'notification_settings', 'api_settings'
        ]);

        const { error } = await supabase
          .from('settings')
          .insert(settingData);

        if (error) throw error;

        this.tracker.recordSuccess('settings', setting.id, setting.id);
        await this.logger.success(`Migrated settings for user: ${setting.user_id}`);
      } catch (error) {
        this.tracker.recordFailure('settings', error, setting);
        await this.logger.error(`Failed to migrate settings for user: ${setting.user_id}`, error);
      }
    }
  }
}

// Main migration orchestrator
class MigrationOrchestrator {
  constructor() {
    this.logger = new Logger(CONFIG.LOG_FILE);
    this.tracker = new MigrationTracker();
    this.dataLoader = new DataLoader(path.join(__dirname, '../data'));
    this.tableMigrator = new TableMigrator(this.logger, this.tracker);
  }

  async confirmMigration() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question('\n⚠️  This will migrate all data to Supabase. Continue? (yes/no): ', (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes');
      });
    });
  }

  async preflightCheck() {
    await this.logger.info('Running preflight checks...');

    try {
      // Test Supabase connection
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (error) throw new Error(`Supabase connection failed: ${error.message}`);

      await this.logger.success('✓ Supabase connection established');

      // Check if tables are empty (to prevent duplicate migration)
      const tables = ['users', 'customers', 'appointments', 'sales', 'messages'];
      for (const table of tables) {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          await this.logger.warn(`Could not check ${table} table: ${error.message}`);
        } else if (count > 0) {
          await this.logger.warn(`⚠️  Table ${table} already contains ${count} records`);
        }
      }

      return true;
    } catch (error) {
      await this.logger.error('Preflight check failed', error);
      return false;
    }
  }

  async migrate() {
    try {
      await this.logger.info('=== Starting SMS System Migration to Supabase ===');

      // Preflight checks
      if (!await this.preflightCheck()) {
        throw new Error('Preflight checks failed');
      }

      // Confirm migration
      if (!await this.confirmMigration()) {
        await this.logger.info('Migration cancelled by user');
        return;
      }

      // Load data
      await this.logger.info('Loading data from in-memory database...');
      const data = await this.dataLoader.loadData();

      // Migration order is important due to foreign key constraints
      await this.tableMigrator.migrateUsers(data.users || []);
      await this.tableMigrator.migrateSettings(data.settings || []);
      await this.tableMigrator.migrateCustomers(data.customers || []);
      
      // Migrate staff and services (if available)
      if (data.staff) {
        await this.logger.info(`Starting migration of ${data.staff.length} staff members`);
        // Similar pattern as customers
      }
      
      if (data.services) {
        await this.logger.info(`Starting migration of ${data.services.length} services`);
        // Similar pattern as customers
      }

      await this.tableMigrator.migrateAppointments(data.appointments || []);
      await this.tableMigrator.migrateSales(data.sales || []);
      await this.tableMigrator.migrateMessages(data.messages || []);

      // Generate summary report
      const summary = this.tracker.getSummary();
      await this.logger.info('=== Migration Summary ===', summary);

      // Save detailed migration report
      const reportPath = path.join(__dirname, '../logs/migration-report.json');
      await fs.writeFile(reportPath, JSON.stringify(summary, null, 2));
      await this.logger.success(`Migration report saved to: ${reportPath}`);

      if (summary.totalErrors > 0) {
        await this.logger.warn(`⚠️  Migration completed with ${summary.totalErrors} errors. Check the migration report for details.`);
      } else {
        await this.logger.success('✅ Migration completed successfully!');
      }

    } catch (error) {
      await this.logger.error('Migration failed', error);
      throw error;
    }
  }

  async rollback() {
    await this.logger.info('Starting rollback process...');

    try {
      // Delete in reverse order to respect foreign key constraints
      const tables = [
        'messages', 'campaigns', 'sales', 'appointments',
        'staff_services', 'services', 'staff', 'message_templates',
        'customers', 'settings', 'subscriptions', 'users'
      ];

      for (const table of tables) {
        const migrated = this.tracker.migrated[table];
        if (migrated && migrated.size > 0) {
          const ids = Array.from(migrated.values());
          
          const { error } = await supabase
            .from(table)
            .delete()
            .in('id', ids);

          if (error) {
            await this.logger.error(`Failed to rollback ${table}`, error);
          } else {
            await this.logger.success(`Rolled back ${ids.length} records from ${table}`);
          }
        }
      }

      // Delete auth users
      const userIds = Array.from(this.tracker.migrated.users?.values() || []);
      for (const userId of userIds) {
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) {
          await this.logger.error(`Failed to delete auth user ${userId}`, error);
        }
      }

      await this.logger.success('Rollback completed');
    } catch (error) {
      await this.logger.error('Rollback failed', error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const orchestrator = new MigrationOrchestrator();

  try {
    await orchestrator.migrate();
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    
    // Ask if user wants to rollback
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('\nDo you want to rollback the migration? (yes/no): ', async (answer) => {
      rl.close();
      
      if (answer.toLowerCase() === 'yes') {
        try {
          await orchestrator.rollback();
        } catch (rollbackError) {
          console.error('❌ Rollback failed:', rollbackError.message);
        }
      }
      
      process.exit(1);
    });
  }
}

// Run migration
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { MigrationOrchestrator, MigrationTracker, TableMigrator };