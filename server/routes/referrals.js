const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkFeatureAccess } = require('../middleware/planRestrictions');
const crypto = require('crypto');

// Middleware to ensure only Standard and Premium plans can access
router.use(authenticateToken);
router.use(checkFeatureAccess('referral_tracking'));

// Get referral program for a customer
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const userId = req.user.id;

    // Verify customer belongs to user
    const [customer] = await db.execute(
      'SELECT id, name, email, phone FROM customers WHERE id = ? AND user_id = ?',
      [customerId, userId]
    );

    if (!customer.length) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get customer's referral stats
    const [stats] = await db.execute(`
      SELECT 
        COUNT(DISTINCT r.id) as total_referrals,
        COUNT(DISTINCT CASE WHEN r.status = 'converted' THEN r.id END) as successful_referrals,
        COUNT(DISTINCT CASE WHEN r.status = 'pending' THEN r.id END) as pending_referrals,
        SUM(CASE WHEN r.reward_status = 'used' THEN r.reward_value ELSE 0 END) as rewards_earned,
        SUM(CASE WHEN r.reward_status = 'issued' THEN r.reward_value ELSE 0 END) as rewards_available
      FROM referrals r
      WHERE r.referrer_id = ?
    `, [customerId]);

    // Get active referral code
    const [referralCode] = await db.execute(`
      SELECT referral_code 
      FROM referrals 
      WHERE referrer_id = ? 
      AND status = 'pending'
      AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
      LIMIT 1
    `, [customerId]);

    // Generate new code if none exists
    let code = referralCode[0]?.referral_code;
    if (!code) {
      code = await generateUniqueReferralCode(customer[0].name);
      await db.execute(`
        INSERT INTO referrals 
        (referrer_id, referral_code, status, reward_type, reward_value, expires_at)
        VALUES (?, ?, 'pending', 'discount', 10, DATE_ADD(NOW(), INTERVAL 90 DAY))
      `, [customerId, code]);
    }

    // Get recent referrals
    const [recentReferrals] = await db.execute(`
      SELECT 
        r.*,
        c.name as referred_name,
        c.phone as referred_phone
      FROM referrals r
      LEFT JOIN customers c ON r.referred_customer_id = c.id
      WHERE r.referrer_id = ?
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [customerId]);

    res.json({
      customer: customer[0],
      stats: stats[0],
      referralCode: code,
      shareUrl: `${process.env.BASE_URL}/referral/${code}`,
      recentReferrals
    });

  } catch (error) {
    console.error('Error fetching referral program:', error);
    res.status(500).json({ error: 'Failed to fetch referral program' });
  }
});

// Create a new referral
router.post('/create', async (req, res) => {
  try {
    const { 
      referrer_id, 
      referred_name, 
      referred_phone, 
      referred_email,
      reward_type = 'discount',
      reward_value = 10
    } = req.body;
    const userId = req.user.id;

    // Verify referrer is user's customer
    const [referrer] = await db.execute(
      'SELECT id FROM customers WHERE id = ? AND user_id = ?',
      [referrer_id, userId]
    );

    if (!referrer.length) {
      return res.status(404).json({ error: 'Referrer not found' });
    }

    // Check if referred person already exists
    const [existingCustomer] = await db.execute(
      'SELECT id FROM customers WHERE (phone = ? OR email = ?) AND user_id = ?',
      [referred_phone, referred_email, userId]
    );

    if (existingCustomer.length) {
      return res.status(400).json({ 
        error: 'This person is already a customer',
        customerId: existingCustomer[0].id 
      });
    }

    // Generate unique referral code
    const referralCode = await generateUniqueReferralCode(referred_name);

    // Create referral
    const [result] = await db.execute(`
      INSERT INTO referrals 
      (referrer_id, referral_code, referred_name, referred_phone, referred_email,
       status, reward_type, reward_value, expires_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, DATE_ADD(NOW(), INTERVAL 90 DAY))
    `, [referrer_id, referralCode, referred_name, referred_phone, referred_email,
        reward_type, reward_value]);

    // Send referral invitation (integrate with messaging service)
    await sendReferralInvitation({
      name: referred_name,
      phone: referred_phone,
      email: referred_email,
      referralCode,
      rewardValue: reward_value,
      rewardType: reward_type
    });

    res.status(201).json({
      id: result.insertId,
      referralCode,
      message: 'Referral created and invitation sent'
    });

  } catch (error) {
    console.error('Error creating referral:', error);
    res.status(500).json({ error: 'Failed to create referral' });
  }
});

// Validate and convert referral
router.post('/convert/:referralCode', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    const { referralCode } = req.params;
    const { customer_id } = req.body;
    const userId = req.user.id;

    // Get referral details
    const [referral] = await connection.execute(`
      SELECT r.*, c.user_id as referrer_user_id
      FROM referrals r
      JOIN customers c ON r.referrer_id = c.id
      WHERE r.referral_code = ?
      AND r.status = 'pending'
      AND (r.expires_at IS NULL OR r.expires_at > NOW())
    `, [referralCode]);

    if (!referral.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Invalid or expired referral code' });
    }

    // Verify the business owner is processing this
    if (referral[0].referrer_user_id !== userId) {
      await connection.rollback();
      return res.status(403).json({ error: 'Unauthorized to process this referral' });
    }

    // Update referral status
    await connection.execute(`
      UPDATE referrals 
      SET status = 'converted',
          referred_customer_id = ?,
          conversion_date = NOW()
      WHERE id = ?
    `, [customer_id, referral[0].id]);

    // Create rewards for both referrer and referred
    // Reward for referrer
    await connection.execute(`
      INSERT INTO referral_rewards 
      (referral_id, customer_id, reward_type, reward_value, expires_at)
      VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 180 DAY))
    `, [referral[0].id, referral[0].referrer_id, 
        referral[0].reward_type, referral[0].reward_value]);

    // Reward for new customer (if applicable)
    const newCustomerReward = referral[0].reward_type === 'discount' 
      ? referral[0].reward_value / 2 
      : 5; // Default $5 credit

    await connection.execute(`
      INSERT INTO referral_rewards 
      (referral_id, customer_id, reward_type, reward_value, expires_at)
      VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 90 DAY))
    `, [referral[0].id, customer_id, 'credit', newCustomerReward]);

    // Update referral reward status
    await connection.execute(`
      UPDATE referrals 
      SET reward_status = 'issued'
      WHERE id = ?
    `, [referral[0].id]);

    await connection.commit();

    // Send thank you messages
    await sendReferralThankYou(referral[0].referrer_id, referral[0].reward_value);

    res.json({
      message: 'Referral converted successfully',
      referrerReward: {
        type: referral[0].reward_type,
        value: referral[0].reward_value
      },
      newCustomerReward: {
        type: 'credit',
        value: newCustomerReward
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error converting referral:', error);
    res.status(500).json({ error: 'Failed to convert referral' });
  } finally {
    connection.release();
  }
});

// Get available rewards for a customer
router.get('/rewards/:customerId', async (req, res) => {
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

    // Get available rewards
    const [rewards] = await db.execute(`
      SELECT 
        rr.*,
        r.referral_code,
        r.referred_name,
        r.conversion_date
      FROM referral_rewards rr
      JOIN referrals r ON rr.referral_id = r.id
      WHERE rr.customer_id = ?
      AND rr.used_date IS NULL
      AND (rr.expires_at IS NULL OR rr.expires_at > NOW())
      ORDER BY rr.created_at DESC
    `, [customerId]);

    // Get reward usage history
    const [usageHistory] = await db.execute(`
      SELECT 
        rr.*,
        r.referral_code,
        r.referred_name
      FROM referral_rewards rr
      JOIN referrals r ON rr.referral_id = r.id
      WHERE rr.customer_id = ?
      AND rr.used_date IS NOT NULL
      ORDER BY rr.used_date DESC
      LIMIT 10
    `, [customerId]);

    res.json({
      availableRewards: rewards,
      totalAvailable: rewards.reduce((sum, r) => sum + r.reward_value, 0),
      usageHistory
    });

  } catch (error) {
    console.error('Error fetching rewards:', error);
    res.status(500).json({ error: 'Failed to fetch rewards' });
  }
});

// Apply reward to appointment
router.post('/rewards/:rewardId/apply', async (req, res) => {
  try {
    const { rewardId } = req.params;
    const { appointment_id } = req.body;
    const userId = req.user.id;

    // Verify reward belongs to user's customer
    const [reward] = await db.execute(`
      SELECT rr.*, c.user_id
      FROM referral_rewards rr
      JOIN customers c ON rr.customer_id = c.id
      WHERE rr.id = ?
      AND rr.used_date IS NULL
      AND (rr.expires_at IS NULL OR rr.expires_at > NOW())
    `, [rewardId]);

    if (!reward.length || reward[0].user_id !== userId) {
      return res.status(404).json({ error: 'Reward not found or expired' });
    }

    // Mark reward as used
    await db.execute(
      'UPDATE referral_rewards SET used_date = NOW() WHERE id = ?',
      [rewardId]
    );

    // Apply discount to appointment (if applicable)
    if (appointment_id) {
      // This would integrate with your appointment/payment system
      await applyDiscountToAppointment(appointment_id, reward[0]);
    }

    res.json({
      message: 'Reward applied successfully',
      reward: reward[0]
    });

  } catch (error) {
    console.error('Error applying reward:', error);
    res.status(500).json({ error: 'Failed to apply reward' });
  }
});

// Get referral analytics
router.get('/analytics', async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const dateFilter = startDate && endDate 
      ? 'AND r.created_at BETWEEN ? AND ?' 
      : 'AND r.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)';

    const params = startDate && endDate 
      ? [userId, startDate, endDate] 
      : [userId];

    // Get referral metrics
    const [metrics] = await db.execute(`
      SELECT 
        COUNT(DISTINCT r.id) as total_referrals,
        COUNT(DISTINCT CASE WHEN r.status = 'converted' THEN r.id END) as successful_conversions,
        COUNT(DISTINCT r.referrer_id) as active_referrers,
        SUM(CASE WHEN r.status = 'converted' THEN r.reward_value ELSE 0 END) as total_rewards_issued,
        AVG(CASE WHEN r.status = 'converted' THEN 
          DATEDIFF(r.conversion_date, r.created_at) 
        END) as avg_conversion_days
      FROM referrals r
      JOIN customers c ON r.referrer_id = c.id
      WHERE c.user_id = ? ${dateFilter}
    `, params);

    // Get top referrers
    const [topReferrers] = await db.execute(`
      SELECT 
        c.id,
        c.name,
        COUNT(r.id) as total_referrals,
        COUNT(CASE WHEN r.status = 'converted' THEN 1 END) as successful_referrals,
        SUM(CASE WHEN r.status = 'converted' THEN r.reward_value ELSE 0 END) as rewards_earned
      FROM customers c
      JOIN referrals r ON c.id = r.referrer_id
      WHERE c.user_id = ? ${dateFilter}
      GROUP BY c.id
      ORDER BY successful_referrals DESC
      LIMIT 10
    `, params);

    // Calculate conversion rate
    const conversionRate = metrics[0].total_referrals > 0
      ? (metrics[0].successful_conversions / metrics[0].total_referrals * 100).toFixed(2)
      : 0;

    // Get referral source effectiveness
    const [sourceAnalysis] = await db.execute(`
      SELECT 
        r.reward_type,
        COUNT(r.id) as referral_count,
        COUNT(CASE WHEN r.status = 'converted' THEN 1 END) as conversions,
        AVG(r.reward_value) as avg_reward_value
      FROM referrals r
      JOIN customers c ON r.referrer_id = c.id
      WHERE c.user_id = ? ${dateFilter}
      GROUP BY r.reward_type
    `, params);

    res.json({
      metrics: {
        ...metrics[0],
        conversionRate: conversionRate + '%'
      },
      topReferrers,
      sourceAnalysis,
      estimatedRevenue: calculateEstimatedRevenue(metrics[0].successful_conversions)
    });

  } catch (error) {
    console.error('Error fetching referral analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Helper function to generate unique referral code
async function generateUniqueReferralCode(name) {
  const baseCode = name.substring(0, 3).toUpperCase() + 
                   crypto.randomBytes(3).toString('hex').toUpperCase();
  
  // Check if code exists
  const [existing] = await db.execute(
    'SELECT id FROM referrals WHERE referral_code = ?',
    [baseCode]
  );

  if (existing.length) {
    // Regenerate if exists
    return generateUniqueReferralCode(name);
  }

  return baseCode;
}

// Helper function to send referral invitation
async function sendReferralInvitation(details) {
  // TODO: Integrate with messaging service
  console.log('Sending referral invitation:', details);
  // This would send SMS/Email with the referral link
}

// Helper function to send thank you message
async function sendReferralThankYou(customerId, rewardValue) {
  // TODO: Integrate with messaging service
  console.log(`Sending thank you to customer ${customerId} for ${rewardValue} reward`);
}

// Helper function to apply discount to appointment
async function applyDiscountToAppointment(appointmentId, reward) {
  // TODO: Integrate with appointment/payment system
  console.log(`Applying ${reward.reward_type} ${reward.reward_value} to appointment ${appointmentId}`);
}

// Helper function to calculate estimated revenue from referrals
function calculateEstimatedRevenue(conversions) {
  // Assuming average customer lifetime value
  const avgCustomerValue = 500;
  return conversions * avgCustomerValue;
}

module.exports = router;