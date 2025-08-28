// Supabase configuration and utilities for SMS Salon Management System
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
}

// Create Supabase client for frontend
export const supabase = createClient(supabaseUrl, supabaseKey);

// Create Supabase admin client for backend operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Database helper functions
export class DatabaseService {
    constructor(client = supabaseAdmin) {
        this.client = client;
    }

    // Generic CRUD operations
    async findAll(table, options = {}) {
        try {
            let query = this.client.from(table).select(options.select || '*');
            
            if (options.where) {
                Object.entries(options.where).forEach(([key, value]) => {
                    query = query.eq(key, value);
                });
            }
            
            if (options.orderBy) {
                query = query.order(options.orderBy.column, { 
                    ascending: options.orderBy.ascending !== false 
                });
            }
            
            if (options.limit) {
                query = query.limit(options.limit);
            }
            
            const { data, error } = await query;
            if (error) throw error;
            
            return data;
        } catch (error) {
            console.error(`Error finding all from ${table}:`, error);
            throw error;
        }
    }

    async findById(table, id, select = '*') {
        try {
            const { data, error } = await this.client
                .from(table)
                .select(select)
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error finding ${table} by ID ${id}:`, error);
            throw error;
        }
    }

    async create(table, data) {
        try {
            const { data: result, error } = await this.client
                .from(table)
                .insert([data])
                .select()
                .single();
            
            if (error) throw error;
            return result;
        } catch (error) {
            console.error(`Error creating in ${table}:`, error);
            throw error;
        }
    }

    async update(table, id, data) {
        try {
            const { data: result, error } = await this.client
                .from(table)
                .update(data)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return result;
        } catch (error) {
            console.error(`Error updating ${table} with ID ${id}:`, error);
            throw error;
        }
    }

    async delete(table, id) {
        try {
            const { error } = await this.client
                .from(table)
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error(`Error deleting from ${table} with ID ${id}:`, error);
            throw error;
        }
    }

    // Specialized query methods
    async searchCustomers(query, limit = 50) {
        try {
            const { data, error } = await this.client
                .from('customers')
                .select('*')
                .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
                .eq('is_active', true)
                .limit(limit);
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error searching customers:', error);
            throw error;
        }
    }

    async getAppointmentsByDate(startDate, endDate, staffId = null) {
        try {
            let query = this.client
                .from('appointments')
                .select(`
                    *,
                    customer:customers(*),
                    staff:users(*),
                    service:services(*),
                    package:service_packages(*)
                `)
                .gte('appointment_date', startDate)
                .lte('appointment_date', endDate);
            
            if (staffId) {
                query = query.eq('staff_id', staffId);
            }
            
            const { data, error } = await query.order('appointment_date');
            if (error) throw error;
            
            return data;
        } catch (error) {
            console.error('Error getting appointments by date:', error);
            throw error;
        }
    }

    async getCustomerRecords(customerId) {
        try {
            const { data, error } = await this.client
                .from('medical_records')
                .select(`
                    *,
                    staff:users(name),
                    photos:record_photos(*)
                `)
                .eq('customer_id', customerId)
                .order('record_date', { ascending: false });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting customer records:', error);
            throw error;
        }
    }

    async getSalesAnalytics(startDate, endDate) {
        try {
            const { data, error } = await this.client
                .from('sales')
                .select(`
                    *,
                    customer:customers(first_name, last_name),
                    staff:users(name),
                    appointment:appointments(service:services(name))
                `)
                .gte('created_at', startDate)
                .lte('created_at', endDate)
                .eq('payment_status', 'paid');
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting sales analytics:', error);
            throw error;
        }
    }

    async getStaffSchedule(staffId, date) {
        try {
            const { data, error } = await this.client
                .from('staff_schedules')
                .select('*')
                .eq('staff_id', staffId)
                .eq('date', date)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            console.error('Error getting staff schedule:', error);
            throw error;
        }
    }

    // Notification system
    async createNotification(data) {
        try {
            const { data: result, error } = await this.client
                .from('notifications')
                .insert([data])
                .select()
                .single();
            
            if (error) throw error;
            return result;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }

    async getPendingNotifications() {
        try {
            const { data, error } = await this.client
                .from('notifications')
                .select('*')
                .is('sent_at', null)
                .lte('scheduled_for', new Date().toISOString())
                .order('scheduled_for');
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting pending notifications:', error);
            throw error;
        }
    }

    // Messaging system
    async getConversations(customerId = null) {
        try {
            let query = this.client
                .from('conversations')
                .select(`
                    *,
                    customer:customers(first_name, last_name, email, phone),
                    messages!inner(
                        content,
                        sent_at,
                        sender_type,
                        delivered_at,
                        read_at
                    )
                `)
                .eq('is_active', true);
            
            if (customerId) {
                query = query.eq('customer_id', customerId);
            }
            
            const { data, error } = await query.order('last_message_at', { ascending: false });
            if (error) throw error;
            
            // Transform data to include last message
            return data.map(conv => ({
                ...conv,
                lastMessage: conv.messages?.[0] || null,
                unreadCount: conv.messages?.filter(m => 
                    m.sender_type === 'customer' && !m.read_at
                ).length || 0
            }));
        } catch (error) {
            console.error('Error getting conversations:', error);
            throw error;
        }
    }

    async getMessages(conversationId) {
        try {
            const { data, error } = await this.client
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('sent_at');
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting messages:', error);
            throw error;
        }
    }
}

// Create default database service instance
export const db = new DatabaseService();

// Authentication helpers
export const auth = {
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Auth sign in error:', error);
            throw error;
        }
    },

    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            console.error('Auth sign out error:', error);
            throw error;
        }
    },

    async getCurrentUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;
            return user;
        } catch (error) {
            console.error('Get current user error:', error);
            throw error;
        }
    },

    async getCurrentUserProfile() {
        try {
            const user = await this.getCurrentUser();
            if (!user) return null;
            
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get user profile error:', error);
            throw error;
        }
    }
};

export default { supabase, supabaseAdmin, db, auth, DatabaseService };