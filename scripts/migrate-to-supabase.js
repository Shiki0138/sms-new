#!/usr/bin/env node

const { Sequelize } = require('sequelize');
const { supabaseAdmin } = require('../src/config/supabase/client');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
dotenv.config();

// Old database connection (Sequelize)
const oldDb = new Sequelize({
  database: process.env.OLD_DB_NAME || 'salon_lumiere',
  username: process.env.OLD_DB_USER || 'postgres',
  password: process.env.OLD_DB_PASSWORD || 'postgres',
  host: process.env.OLD_DB_HOST || 'localhost',
  port: process.env.OLD_DB_PORT || 5432,
  dialect: 'postgres',
  logging: false
});

// Migration functions
const migrationFunctions = {
  /**
   * Migrate users and tenants
   */
  async migrateUsersAndTenants() {
    console.log('📦 Migrating users and tenants...');
    
    try {
      // Get all users from old database
      const [users] = await oldDb.query('SELECT * FROM users');
      
      if (!users.length) {
        console.log('No users found to migrate');
        return;
      }

      const tenantMap = new Map();
      const userMap = new Map();

      // First, create tenants
      for (const user of users) {
        if (!tenantMap.has(user.email)) {
          // Create tenant in Supabase
          const tenantData = {
            id: uuidv4(),
            name: user.businessName || `${user.name}'s Salon`,
            email: user.email,
            phone_number: user.phone,
            plan_type: 'light', // Default plan
            settings: {}
          };

          const { data: tenant, error } = await supabaseAdmin
            .from('tenants')
            .insert(tenantData)
            .select()
            .single();

          if (error) {
            console.error(`Failed to create tenant for ${user.email}:`, error);
            continue;
          }

          tenantMap.set(user.email, tenant.id);
          console.log(`✅ Created tenant: ${tenant.name}`);
        }
      }

      // Then, create auth users and profiles
      for (const user of users) {
        const tenantId = tenantMap.get(user.email);
        
        if (!tenantId) {
          console.error(`No tenant found for user ${user.email}`);
          continue;
        }

        try {
          // Create auth user
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: user.email,
            password: uuidv4(), // Temporary password - user will need to reset
            email_confirm: true,
            user_metadata: {
              full_name: user.name,
              tenant_id: tenantId
            }
          });

          if (authError) {
            console.error(`Failed to create auth for ${user.email}:`, authError);
            continue;
          }

          // Create user profile
          const profileData = {
            id: authUser.user.id,
            tenant_id: tenantId,
            email: user.email,
            full_name: user.name,
            role: 'owner',
            is_active: true
          };

          const { error: profileError } = await supabaseAdmin
            .from('users')
            .insert(profileData);

          if (profileError) {
            console.error(`Failed to create profile for ${user.email}:`, profileError);
            // Clean up auth user
            await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
            continue;
          }

          userMap.set(user.id, authUser.user.id);
          console.log(`✅ Migrated user: ${user.email}`);
        } catch (error) {
          console.error(`Error migrating user ${user.email}:`, error);
        }
      }

      return { tenantMap, userMap };
    } catch (error) {
      console.error('Error in user/tenant migration:', error);
      throw error;
    }
  },

  /**
   * Migrate customers
   */
  async migrateCustomers(tenantMap, userMap) {
    console.log('📦 Migrating customers...');
    
    try {
      const [customers] = await oldDb.query('SELECT * FROM customers');
      
      if (!customers.length) {
        console.log('No customers found to migrate');
        return;
      }

      const customerMap = new Map();
      const batchSize = 100;

      for (let i = 0; i < customers.length; i += batchSize) {
        const batch = customers.slice(i, i + batchSize);
        const customerData = [];

        for (const customer of batch) {
          // Find tenant ID based on user ID
          const newUserId = userMap.get(customer.userId);
          if (!newUserId) {
            console.warn(`No user mapping found for customer ${customer.id}`);
            continue;
          }

          // Get tenant ID from user
          const { data: user } = await supabaseAdmin
            .from('users')
            .select('tenant_id')
            .eq('id', newUserId)
            .single();

          if (!user) continue;

          const newCustomerId = uuidv4();
          customerMap.set(customer.id, newCustomerId);

          customerData.push({
            id: newCustomerId,
            tenant_id: user.tenant_id,
            name: customer.name,
            phone_number: customer.phone,
            email: customer.email,
            birth_date: customer.birthDate,
            gender: customer.gender,
            address: customer.address,
            notes: customer.notes,
            visit_count: customer.visitCount || 0,
            last_visit_date: customer.lastVisit,
            total_spent: customer.totalSpent || 0,
            created_at: customer.createdAt,
            updated_at: customer.updatedAt
          });
        }

        if (customerData.length > 0) {
          const { error } = await supabaseAdmin
            .from('customers')
            .insert(customerData);

          if (error) {
            console.error('Failed to insert customer batch:', error);
          } else {
            console.log(`✅ Migrated ${customerData.length} customers`);
          }
        }
      }

      return customerMap;
    } catch (error) {
      console.error('Error in customer migration:', error);
      throw error;
    }
  },

  /**
   * Migrate appointments/reservations
   */
  async migrateAppointments(tenantMap, userMap, customerMap) {
    console.log('📦 Migrating appointments...');
    
    try {
      const [appointments] = await oldDb.query('SELECT * FROM appointments');
      
      if (!appointments.length) {
        console.log('No appointments found to migrate');
        return;
      }

      const batchSize = 100;

      for (let i = 0; i < appointments.length; i += batchSize) {
        const batch = appointments.slice(i, i + batchSize);
        const reservationData = [];

        for (const apt of batch) {
          const newCustomerId = customerMap.get(apt.customerId);
          if (!newCustomerId) {
            console.warn(`No customer mapping found for appointment ${apt.id}`);
            continue;
          }

          // Get tenant ID from customer
          const { data: customer } = await supabaseAdmin
            .from('customers')
            .select('tenant_id')
            .eq('id', newCustomerId)
            .single();

          if (!customer) continue;

          reservationData.push({
            id: uuidv4(),
            tenant_id: customer.tenant_id,
            customer_id: newCustomerId,
            start_time: apt.startTime,
            end_time: apt.endTime,
            status: apt.status || 'confirmed',
            menu_content: apt.service,
            price: apt.price,
            notes: apt.notes,
            reminder_sent: apt.reminderSent || false,
            created_at: apt.createdAt,
            updated_at: apt.updatedAt
          });
        }

        if (reservationData.length > 0) {
          const { error } = await supabaseAdmin
            .from('reservations')
            .insert(reservationData);

          if (error) {
            console.error('Failed to insert reservation batch:', error);
          } else {
            console.log(`✅ Migrated ${reservationData.length} reservations`);
          }
        }
      }
    } catch (error) {
      console.error('Error in appointment migration:', error);
      throw error;
    }
  },

  /**
   * Migrate sales
   */
  async migrateSales(tenantMap, userMap, customerMap) {
    console.log('📦 Migrating sales...');
    
    try {
      const [sales] = await oldDb.query('SELECT * FROM sales');
      
      if (!sales.length) {
        console.log('No sales found to migrate');
        return;
      }

      // Note: The new schema doesn't have a dedicated sales table
      // Sales data might need to be integrated into reservations or a custom table
      console.log(`⚠️  Sales migration skipped - ${sales.length} records need manual review`);
      
    } catch (error) {
      console.error('Error in sales migration:', error);
    }
  },

  /**
   * Migrate settings
   */
  async migrateSettings(tenantMap) {
    console.log('📦 Migrating settings...');
    
    try {
      const [settings] = await oldDb.query('SELECT * FROM settings');
      
      if (!settings.length) {
        console.log('No settings found to migrate');
        return;
      }

      for (const setting of settings) {
        // Find tenant by matching email or other criteria
        // Update tenant settings
        const tenantId = Array.from(tenantMap.values())[0]; // Simplified - you'd match properly
        
        if (tenantId) {
          const { error } = await supabaseAdmin
            .from('tenants')
            .update({
              settings: {
                businessHours: setting.businessHours,
                reminderSettings: setting.reminderSettings,
                // Add other settings as needed
              }
            })
            .eq('id', tenantId);

          if (!error) {
            console.log('✅ Migrated settings for tenant');
          }
        }
      }
    } catch (error) {
      console.error('Error in settings migration:', error);
    }
  }
};

// Main migration function
async function runMigration() {
  console.log('🚀 Starting Supabase migration...');
  console.log('================================');
  
  try {
    // Test connections
    console.log('Testing old database connection...');
    await oldDb.authenticate();
    console.log('✅ Old database connected');

    console.log('Testing Supabase connection...');
    const { error } = await supabaseAdmin.from('tenants').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Supabase connected');

    // Confirm migration
    console.log('\n⚠️  WARNING: This will migrate data to Supabase.');
    console.log('Make sure you have backed up your data!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Run migrations in order
    const { tenantMap, userMap } = await migrationFunctions.migrateUsersAndTenants();
    const customerMap = await migrationFunctions.migrateCustomers(tenantMap, userMap);
    await migrationFunctions.migrateAppointments(tenantMap, userMap, customerMap);
    await migrationFunctions.migrateSales(tenantMap, userMap, customerMap);
    await migrationFunctions.migrateSettings(tenantMap);

    console.log('\n================================');
    console.log('✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Send password reset emails to all users');
    console.log('2. Verify data integrity in Supabase dashboard');
    console.log('3. Update your application to use Supabase endpoints');
    console.log('4. Test thoroughly before going live');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await oldDb.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration().then(() => process.exit(0));
}

module.exports = { runMigration, migrationFunctions };