/**
 * Customer Routes - Supabase Integration Example
 * Version: 1.0.0
 * 
 * This is an example of how to migrate existing routes to use Supabase
 */

const express = require('express');
const router = express.Router();
const { db, migration } = require('../config/database');
const authMiddleware = require('../middleware/auth');

/**
 * GET /api/customers
 * Get all customers for the authenticated tenant
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Get the appropriate data source (Supabase or in-memory)
    const customersTable = await migration.getDataSource('customers');
    
    // If using Supabase
    if (migration.isSupabaseEnabled()) {
      const { data, error } = await customersTable.select('*', {
        filters: { is_active: true },
        orderBy: { column: 'created_at', ascending: false },
        limit: req.query.limit || 50,
        offset: req.query.offset || 0
      });
      
      if (error) throw error;
      
      return res.json({
        success: true,
        data: data,
        total: data.length
      });
    } else {
      // Fallback to in-memory implementation
      const customers = await customersTable.findAll({
        where: { userId: req.user.id, isActive: true },
        limit: req.query.limit || 50,
        offset: req.query.offset || 0
      });
      
      return res.json({
        success: true,
        data: customers,
        total: customers.length
      });
    }
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customers'
    });
  }
});

/**
 * GET /api/customers/search
 * Search customers by name or phone
 */
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters'
      });
    }
    
    if (migration.isSupabaseEnabled()) {
      const { data, error } = await db.getSupabaseClient()
        .from('customers')
        .select('*')
        .eq('user_id', req.user.id)
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(20);
      
      if (error) throw error;
      
      return res.json({
        success: true,
        data: data
      });
    } else {
      // In-memory search implementation
      const { Op } = require('sequelize');
      const Customer = require('../models/Customer');
      
      const customers = await Customer.findAll({
        where: {
          userId: req.user.id,
          [Op.or]: [
            { name: { [Op.iLike]: `%${q}%` } },
            { phone: { [Op.iLike]: `%${q}%` } },
            { email: { [Op.iLike]: `%${q}%` } }
          ]
        },
        limit: 20
      });
      
      return res.json({
        success: true,
        data: customers
      });
    }
  } catch (error) {
    console.error('Error searching customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search customers'
    });
  }
});

/**
 * GET /api/customers/:id
 * Get a specific customer
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    if (migration.isSupabaseEnabled()) {
      const { data, error } = await db.getSupabaseClient()
        .from('customers')
        .select(`
          *,
          appointments (
            id,
            appointment_date,
            start_time,
            status,
            services (name, price)
          ),
          messages (
            id,
            sent_at,
            content,
            status
          )
        `)
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            error: 'Customer not found'
          });
        }
        throw error;
      }
      
      return res.json({
        success: true,
        data: data
      });
    } else {
      // In-memory implementation
      const Customer = require('../models/Customer');
      const customer = await Customer.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id
        },
        include: ['appointments', 'messages']
      });
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }
      
      return res.json({
        success: true,
        data: customer
      });
    }
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer'
    });
  }
});

/**
 * POST /api/customers
 * Create a new customer
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, phone, email, birth_date, gender, address, notes, tags } = req.body;
    
    // Validation
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Name and phone are required'
      });
    }
    
    // Check for duplicate phone number
    if (migration.isSupabaseEnabled()) {
      const { data: existing } = await db.getSupabaseClient()
        .from('customers')
        .select('id')
        .eq('user_id', req.user.id)
        .eq('phone', phone)
        .single();
      
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Customer with this phone number already exists'
        });
      }
      
      // Create customer
      const customersTable = db.getTenantTable('customers');
      const { data, error } = await customersTable.insert({
        name,
        phone,
        email,
        birth_date,
        gender,
        address,
        notes,
        tags: tags || [],
        first_visit_date: new Date(),
        metadata: {
          source: 'api',
          created_by: req.user.email
        }
      });
      
      if (error) throw error;
      
      return res.status(201).json({
        success: true,
        data: data[0]
      });
    } else {
      // In-memory implementation
      const Customer = require('../models/Customer');
      
      const existing = await Customer.findOne({
        where: {
          userId: req.user.id,
          phone
        }
      });
      
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Customer with this phone number already exists'
        });
      }
      
      const customer = await Customer.create({
        userId: req.user.id,
        name,
        phone,
        email,
        birthDate: birth_date,
        gender,
        address,
        notes,
        tags,
        firstVisitDate: new Date()
      });
      
      return res.status(201).json({
        success: true,
        data: customer
      });
    }
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create customer'
    });
  }
});

/**
 * PUT /api/customers/:id
 * Update a customer
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const updates = req.body;
    delete updates.id; // Prevent ID update
    delete updates.user_id; // Prevent tenant change
    
    if (migration.isSupabaseEnabled()) {
      const customersTable = db.getTenantTable('customers');
      const { data, error } = await customersTable.update(req.params.id, updates);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }
      
      return res.json({
        success: true,
        data: data[0]
      });
    } else {
      // In-memory implementation
      const Customer = require('../models/Customer');
      
      const [updated] = await Customer.update(updates, {
        where: {
          id: req.params.id,
          userId: req.user.id
        }
      });
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }
      
      const customer = await Customer.findByPk(req.params.id);
      
      return res.json({
        success: true,
        data: customer
      });
    }
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update customer'
    });
  }
});

/**
 * DELETE /api/customers/:id
 * Soft delete a customer
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (migration.isSupabaseEnabled()) {
      // Soft delete by setting is_active to false
      const customersTable = db.getTenantTable('customers');
      const { data, error } = await customersTable.update(req.params.id, {
        is_active: false,
        metadata: {
          deleted_at: new Date().toISOString(),
          deleted_by: req.user.email
        }
      });
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }
      
      return res.json({
        success: true,
        message: 'Customer deleted successfully'
      });
    } else {
      // In-memory implementation
      const Customer = require('../models/Customer');
      
      const updated = await Customer.update(
        { isActive: false },
        {
          where: {
            id: req.params.id,
            userId: req.user.id
          }
        }
      );
      
      if (!updated[0]) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }
      
      return res.json({
        success: true,
        message: 'Customer deleted successfully'
      });
    }
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete customer'
    });
  }
});

/**
 * POST /api/customers/:id/tags
 * Add tags to a customer
 */
router.post('/:id/tags', authMiddleware, async (req, res) => {
  try {
    const { tags } = req.body;
    
    if (!Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        error: 'Tags must be an array'
      });
    }
    
    if (migration.isSupabaseEnabled()) {
      // Get current tags
      const { data: customer, error: fetchError } = await db.getSupabaseClient()
        .from('customers')
        .select('tags')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();
      
      if (fetchError || !customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }
      
      // Merge tags
      const currentTags = customer.tags || [];
      const newTags = [...new Set([...currentTags, ...tags])];
      
      // Update
      const { data, error } = await db.getTenantTable('customers')
        .update(req.params.id, { tags: newTags });
      
      if (error) throw error;
      
      return res.json({
        success: true,
        data: data[0]
      });
    } else {
      // In-memory implementation
      const Customer = require('../models/Customer');
      
      const customer = await Customer.findOne({
        where: {
          id: req.params.id,
          userId: req.user.id
        }
      });
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }
      
      const currentTags = customer.tags || [];
      const newTags = [...new Set([...currentTags, ...tags])];
      
      await customer.update({ tags: newTags });
      
      return res.json({
        success: true,
        data: customer
      });
    }
  } catch (error) {
    console.error('Error adding tags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add tags'
    });
  }
});

/**
 * GET /api/customers/export
 * Export customers to CSV
 */
router.get('/export/csv', authMiddleware, async (req, res) => {
  try {
    const { fields = ['name', 'phone', 'email', 'total_visits', 'total_spent'] } = req.query;
    
    let customers;
    
    if (migration.isSupabaseEnabled()) {
      const { data, error } = await db.getSupabaseClient()
        .from('customers')
        .select(fields.join(','))
        .eq('user_id', req.user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      customers = data;
    } else {
      // In-memory implementation
      const Customer = require('../models/Customer');
      customers = await Customer.findAll({
        where: {
          userId: req.user.id,
          isActive: true
        },
        attributes: fields,
        order: [['createdAt', 'DESC']]
      });
    }
    
    // Convert to CSV
    const csv = require('csv-writer').createObjectCsvStringifier;
    const csvStringifier = csv({
      header: fields.map(field => ({ id: field, title: field }))
    });
    
    const csvData = csvStringifier.getHeaderString() + 
                   csvStringifier.stringifyRecords(customers);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
    res.send(csvData);
  } catch (error) {
    console.error('Error exporting customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export customers'
    });
  }
});

module.exports = router;