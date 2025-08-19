const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkFeatureAccess } = require('../middleware/planRestrictions');

// Middleware to ensure only Standard and Premium plans can access
router.use(authenticateToken);
router.use(checkFeatureAccess('membership_management'));

// Get all membership tiers
router.get('/tiers', async (req, res) => {
  try {
    const userId = req.user.id;

    const [tiers] = await db.execute(`
      SELECT 
        id,
        name,
        description,
        monthly_price,
        benefits,
        discount_percentage,
        priority_booking,
        is_active,
        (SELECT COUNT(*) FROM customer_memberships 
         WHERE tier_id = membership_tiers.id 
         AND status = 'active'
         AND customer_id IN (SELECT id FROM customers WHERE user_id = ?)) as active_members
      FROM membership_tiers
      WHERE is_active = 1
      ORDER BY monthly_price ASC
    `, [userId]);

    res.json(tiers.map(tier => ({
      ...tier,
      benefits: JSON.parse(tier.benefits || '[]')
    })));

  } catch (error) {
    console.error('Error fetching membership tiers:', error);
    res.status(500).json({ error: 'Failed to fetch membership tiers' });
  }
});

// Create a new membership tier
router.post('/tiers', async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      name, 
      description, 
      monthly_price, 
      benefits, 
      discount_percentage, 
      priority_booking 
    } = req.body;

    // Validate required fields
    if (!name || !monthly_price) {
      return res.status(400).json({ error: 'Name and monthly price are required' });
    }

    const [result] = await db.execute(`
      INSERT INTO membership_tiers 
      (name, description, monthly_price, benefits, discount_percentage, priority_booking)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      name,
      description,
      monthly_price,
      JSON.stringify(benefits || []),
      discount_percentage || 0,
      priority_booking || false
    ]);

    res.status(201).json({
      id: result.insertId,
      message: 'Membership tier created successfully'
    });

  } catch (error) {
    console.error('Error creating membership tier:', error);
    res.status(500).json({ error: 'Failed to create membership tier' });
  }
});

// Update membership tier
router.put('/tiers/:tierId', async (req, res) => {
  try {
    const { tierId } = req.params;
    const { 
      name, 
      description, 
      monthly_price, 
      benefits, 
      discount_percentage, 
      priority_booking,
      is_active 
    } = req.body;

    await db.execute(`
      UPDATE membership_tiers 
      SET name = ?, description = ?, monthly_price = ?, 
          benefits = ?, discount_percentage = ?, 
          priority_booking = ?, is_active = ?
      WHERE id = ?
    `, [
      name,
      description,
      monthly_price,
      JSON.stringify(benefits || []),
      discount_percentage || 0,
      priority_booking || false,
      is_active !== undefined ? is_active : true,
      tierId
    ]);

    res.json({ message: 'Membership tier updated successfully' });

  } catch (error) {
    console.error('Error updating membership tier:', error);
    res.status(500).json({ error: 'Failed to update membership tier' });
  }
});

// Get customer memberships
router.get('/customers/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const userId = req.user.id;

    // Verify customer belongs to user
    const [customer] = await db.execute(
      'SELECT id FROM customers WHERE id = ? AND user_id = ?',
      [customerId, userId]
    );

    if (!customer.length) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const [memberships] = await db.execute(`
      SELECT 
        cm.*,
        mt.name as tier_name,
        mt.monthly_price,
        mt.benefits,
        mt.discount_percentage,
        mt.priority_booking
      FROM customer_memberships cm
      JOIN membership_tiers mt ON cm.tier_id = mt.id
      WHERE cm.customer_id = ?
      ORDER BY cm.created_at DESC
    `, [customerId]);

    res.json(memberships.map(membership => ({
      ...membership,
      benefits: JSON.parse(membership.benefits || '[]')
    })));

  } catch (error) {
    console.error('Error fetching customer memberships:', error);
    res.status(500).json({ error: 'Failed to fetch customer memberships' });
  }
});

// Create customer membership
router.post('/customers/:customerId/subscribe', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { customerId } = req.params;
    const { tier_id, payment_method, auto_renew } = req.body;
    const userId = req.user.id;

    // Verify customer belongs to user
    const [customer] = await connection.execute(
      'SELECT id FROM customers WHERE id = ? AND user_id = ?',
      [customerId, userId]
    );

    if (!customer.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if customer already has active membership
    const [existingMembership] = await connection.execute(
      'SELECT id FROM customer_memberships WHERE customer_id = ? AND status = "active"',
      [customerId]
    );

    if (existingMembership.length) {
      await connection.rollback();
      return res.status(400).json({ error: 'Customer already has an active membership' });
    }

    // Get tier details
    const [tier] = await connection.execute(
      'SELECT * FROM membership_tiers WHERE id = ? AND is_active = 1',
      [tier_id]
    );

    if (!tier.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Membership tier not found' });
    }

    const startDate = new Date();
    const nextBillingDate = new Date(startDate);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    // Create membership
    const [membershipResult] = await connection.execute(`
      INSERT INTO customer_memberships 
      (customer_id, tier_id, start_date, auto_renew, status, payment_method, next_billing_date)
      VALUES (?, ?, ?, ?, 'active', ?, ?)
    `, [customerId, tier_id, startDate, auto_renew !== false, payment_method, nextBillingDate]);

    // Create initial transaction
    await connection.execute(`
      INSERT INTO membership_transactions 
      (membership_id, amount, transaction_type, payment_status)
      VALUES (?, ?, 'subscription', 'success')
    `, [membershipResult.insertId, tier[0].monthly_price]);

    await connection.commit();

    res.status(201).json({
      id: membershipResult.insertId,
      message: 'Membership created successfully',
      next_billing_date: nextBillingDate
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error creating membership:', error);
    res.status(500).json({ error: 'Failed to create membership' });
  } finally {
    connection.release();
  }
});

// Cancel membership
router.put('/customers/:customerId/cancel', async (req, res) => {
  try {
    const { customerId } = req.params;
    const userId = req.user.id;

    // Verify customer belongs to user
    const [customer] = await db.execute(
      'SELECT id FROM customers WHERE id = ? AND user_id = ?',
      [customerId, userId]
    );

    if (!customer.length) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get active membership
    const [membership] = await db.execute(
      'SELECT id, tier_id FROM customer_memberships WHERE customer_id = ? AND status = "active"',
      [customerId]
    );

    if (!membership.length) {
      return res.status(404).json({ error: 'No active membership found' });
    }

    // Cancel membership
    await db.execute(`
      UPDATE customer_memberships 
      SET status = 'cancelled', 
          auto_renew = FALSE,
          end_date = CURRENT_DATE
      WHERE id = ?
    `, [membership[0].id]);

    res.json({ message: 'Membership cancelled successfully' });

  } catch (error) {
    console.error('Error cancelling membership:', error);
    res.status(500).json({ error: 'Failed to cancel membership' });
  }
});

// Process membership renewals (should be called by a cron job)
router.post('/process-renewals', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Get memberships due for renewal
    const [dueRenewals] = await connection.execute(`
      SELECT 
        cm.*,
        mt.monthly_price,
        c.user_id
      FROM customer_memberships cm
      JOIN membership_tiers mt ON cm.tier_id = mt.id
      JOIN customers c ON cm.customer_id = c.id
      WHERE cm.status = 'active'
      AND cm.auto_renew = TRUE
      AND cm.next_billing_date <= CURRENT_DATE
    `);

    let processed = 0;
    let failed = 0;

    for (const membership of dueRenewals) {
      try {
        // Process payment (integrate with payment gateway)
        const paymentSuccess = await processPayment(membership);

        if (paymentSuccess) {
          // Update next billing date
          const nextBillingDate = new Date(membership.next_billing_date);
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

          await connection.execute(`
            UPDATE customer_memberships 
            SET next_billing_date = ?
            WHERE id = ?
          `, [nextBillingDate, membership.id]);

          // Record transaction
          await connection.execute(`
            INSERT INTO membership_transactions 
            (membership_id, amount, transaction_type, payment_status)
            VALUES (?, ?, 'renewal', 'success')
          `, [membership.id, membership.monthly_price]);

          processed++;
        } else {
          // Handle failed payment
          await connection.execute(`
            INSERT INTO membership_transactions 
            (membership_id, amount, transaction_type, payment_status)
            VALUES (?, ?, 'renewal', 'failed')
          `, [membership.id, membership.monthly_price]);

          // Suspend membership after multiple failures
          const [failedAttempts] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM membership_transactions 
            WHERE membership_id = ? 
            AND transaction_type = 'renewal' 
            AND payment_status = 'failed'
            AND transaction_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          `, [membership.id]);

          if (failedAttempts[0].count >= 3) {
            await connection.execute(`
              UPDATE customer_memberships 
              SET status = 'expired'
              WHERE id = ?
            `, [membership.id]);
          }

          failed++;
        }
      } catch (error) {
        console.error(`Error processing renewal for membership ${membership.id}:`, error);
        failed++;
      }
    }

    await connection.commit();

    res.json({
      message: 'Renewals processed',
      processed,
      failed,
      total: dueRenewals.length
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error processing renewals:', error);
    res.status(500).json({ error: 'Failed to process renewals' });
  } finally {
    connection.release();
  }
});

// Get membership analytics
router.get('/analytics', async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const dateFilter = startDate && endDate 
      ? 'AND mt.transaction_date BETWEEN ? AND ?' 
      : 'AND mt.transaction_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)';

    const params = startDate && endDate 
      ? [userId, userId, startDate, endDate] 
      : [userId, userId];

    // Get membership metrics
    const [metrics] = await db.execute(`
      SELECT 
        COUNT(DISTINCT cm.id) as total_memberships,
        COUNT(DISTINCT CASE WHEN cm.status = 'active' THEN cm.id END) as active_memberships,
        COUNT(DISTINCT CASE WHEN cm.status = 'cancelled' THEN cm.id END) as cancelled_memberships,
        SUM(CASE WHEN mt.payment_status = 'success' THEN mt.amount ELSE 0 END) as total_revenue,
        AVG(CASE WHEN mt.payment_status = 'success' THEN mt.amount ELSE NULL END) as avg_membership_value
      FROM customer_memberships cm
      JOIN customers c ON cm.customer_id = c.id
      LEFT JOIN membership_transactions mt ON cm.id = mt.membership_id
      WHERE c.user_id = ? ${dateFilter}
    `, params);

    // Get revenue by tier
    const [tierRevenue] = await db.execute(`
      SELECT 
        mbt.name as tier_name,
        COUNT(DISTINCT cm.id) as member_count,
        SUM(CASE WHEN mt.payment_status = 'success' THEN mt.amount ELSE 0 END) as tier_revenue
      FROM membership_tiers mbt
      JOIN customer_memberships cm ON mbt.id = cm.tier_id
      JOIN customers c ON cm.customer_id = c.id
      LEFT JOIN membership_transactions mt ON cm.id = mt.membership_id
      WHERE c.user_id = ? ${dateFilter}
      GROUP BY mbt.id, mbt.name
      ORDER BY tier_revenue DESC
    `, params);

    // Calculate retention rate
    const [retention] = await db.execute(`
      SELECT 
        COUNT(DISTINCT CASE WHEN cm.auto_renew = TRUE THEN cm.id END) / 
        COUNT(DISTINCT cm.id) * 100 as retention_rate
      FROM customer_memberships cm
      JOIN customers c ON cm.customer_id = c.id
      WHERE c.user_id = ? AND cm.status IN ('active', 'cancelled')
    `, [userId]);

    res.json({
      metrics: metrics[0],
      tierRevenue,
      retentionRate: retention[0].retention_rate || 0,
      monthlyRecurringRevenue: calculateMRR(tierRevenue)
    });

  } catch (error) {
    console.error('Error fetching membership analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Helper function to process payment (integrate with payment gateway)
async function processPayment(membership) {
  // TODO: Integrate with actual payment gateway
  // For now, simulate 95% success rate
  return Math.random() > 0.05;
}

// Helper function to calculate Monthly Recurring Revenue
function calculateMRR(tierRevenue) {
  return tierRevenue.reduce((total, tier) => {
    return total + (tier.tier_revenue / 3); // Assuming 3 months of data
  }, 0).toFixed(2);
}

module.exports = router;