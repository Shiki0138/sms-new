const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkFeatureAccess } = require('../middleware/planRestrictions');

// Middleware to ensure only Standard and Premium plans can access
router.use(authenticateToken);
router.use(checkFeatureAccess('smart_upselling'));

// Get upselling suggestions for a customer
router.get('/suggestions/:customerId', async (req, res) => {
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

    // Get customer's purchase history and preferences
    const [purchaseAnalysis] = await db.execute(`
      SELECT 
        cpa.*,
        s.name as service_name,
        s.category,
        s.price
      FROM customer_purchase_analysis cpa
      JOIN services s ON s.category = cpa.service_category
      WHERE cpa.customer_id = ? 
      AND s.user_id = ?
      AND s.is_active = 1
      ORDER BY cpa.preference_score DESC
      LIMIT 5
    `, [customerId, userId]);

    // Get existing suggestions
    const [suggestions] = await db.execute(`
      SELECT 
        us.*,
        s.name as service_name,
        s.description as service_description,
        s.category,
        s.price,
        s.duration
      FROM upselling_suggestions us
      JOIN services s ON us.service_id = s.id
      WHERE us.customer_id = ? 
      AND us.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY us.confidence_score DESC, us.created_at DESC
    `, [customerId]);

    // Generate new AI-based suggestions if needed
    if (suggestions.length < 3) {
      await generateAISuggestions(customerId, userId);
      
      // Fetch updated suggestions
      const [newSuggestions] = await db.execute(`
        SELECT 
          us.*,
          s.name as service_name,
          s.description as service_description,
          s.category,
          s.price,
          s.duration
        FROM upselling_suggestions us
        JOIN services s ON us.service_id = s.id
        WHERE us.customer_id = ? 
        AND us.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ORDER BY us.confidence_score DESC, us.created_at DESC
      `, [customerId]);

      return res.json({
        suggestions: newSuggestions,
        analysis: purchaseAnalysis
      });
    }

    res.json({
      suggestions,
      analysis: purchaseAnalysis
    });

  } catch (error) {
    console.error('Error fetching upselling suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// Update suggestion status (accepted/rejected)
router.put('/suggestions/:suggestionId', async (req, res) => {
  try {
    const { suggestionId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify suggestion belongs to user's customer
    const [suggestion] = await db.execute(`
      SELECT us.*, c.user_id 
      FROM upselling_suggestions us
      JOIN customers c ON us.customer_id = c.id
      WHERE us.id = ? AND c.user_id = ?
    `, [suggestionId, userId]);

    if (!suggestion.length) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    // Update suggestion status
    await db.execute(
      'UPDATE upselling_suggestions SET status = ? WHERE id = ?',
      [status, suggestionId]
    );

    // If accepted, update customer preferences
    if (status === 'accepted') {
      await updateCustomerPreferences(suggestion[0].customer_id, suggestion[0].service_id);
    }

    res.json({ message: 'Suggestion updated successfully' });

  } catch (error) {
    console.error('Error updating suggestion:', error);
    res.status(500).json({ error: 'Failed to update suggestion' });
  }
});

// Get revenue analytics from upselling
router.get('/analytics', async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const dateFilter = startDate && endDate 
      ? 'AND us.created_at BETWEEN ? AND ?' 
      : 'AND us.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';

    const params = startDate && endDate 
      ? [userId, startDate, endDate] 
      : [userId];

    // Get upselling performance metrics
    const [metrics] = await db.execute(`
      SELECT 
        COUNT(DISTINCT us.id) as total_suggestions,
        COUNT(DISTINCT CASE WHEN us.status = 'accepted' THEN us.id END) as accepted_suggestions,
        COUNT(DISTINCT CASE WHEN us.status = 'rejected' THEN us.id END) as rejected_suggestions,
        SUM(CASE WHEN us.status = 'accepted' THEN us.potential_revenue ELSE 0 END) as realized_revenue,
        SUM(us.potential_revenue) as total_potential_revenue,
        AVG(us.confidence_score) as avg_confidence_score,
        COUNT(DISTINCT us.customer_id) as customers_targeted
      FROM upselling_suggestions us
      JOIN customers c ON us.customer_id = c.id
      WHERE c.user_id = ? ${dateFilter}
    `, params);

    // Get top performing suggestions by category
    const [topCategories] = await db.execute(`
      SELECT 
        s.category,
        COUNT(us.id) as suggestion_count,
        COUNT(CASE WHEN us.status = 'accepted' THEN 1 END) as accepted_count,
        SUM(CASE WHEN us.status = 'accepted' THEN us.potential_revenue ELSE 0 END) as category_revenue
      FROM upselling_suggestions us
      JOIN services s ON us.service_id = s.id
      JOIN customers c ON us.customer_id = c.id
      WHERE c.user_id = ? ${dateFilter}
      GROUP BY s.category
      ORDER BY category_revenue DESC
      LIMIT 5
    `, params);

    res.json({
      metrics: metrics[0],
      topCategories,
      conversionRate: metrics[0].total_suggestions > 0 
        ? (metrics[0].accepted_suggestions / metrics[0].total_suggestions * 100).toFixed(2) + '%'
        : '0%'
    });

  } catch (error) {
    console.error('Error fetching upselling analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Analyze customer purchase patterns
router.post('/analyze/:customerId', async (req, res) => {
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

    // Analyze purchase history
    await analyzeCustomerPurchases(customerId, userId);

    // Generate new suggestions based on analysis
    await generateAISuggestions(customerId, userId);

    res.json({ message: 'Customer analysis completed successfully' });

  } catch (error) {
    console.error('Error analyzing customer:', error);
    res.status(500).json({ error: 'Failed to analyze customer' });
  }
});

// Helper function to generate AI-based suggestions
async function generateAISuggestions(customerId, userId) {
  try {
    // Get customer's appointment history
    const [appointments] = await db.execute(`
      SELECT 
        s.id as service_id,
        s.category,
        s.price,
        COUNT(*) as frequency,
        MAX(a.appointment_date) as last_appointment
      FROM appointments a
      JOIN appointment_services ass ON a.id = ass.appointment_id
      JOIN services s ON ass.service_id = s.id
      WHERE a.customer_id = ? 
      AND a.status = 'completed'
      GROUP BY s.id, s.category, s.price
    `, [customerId]);

    // Get services not yet tried by customer
    const [unusedServices] = await db.execute(`
      SELECT 
        s.id,
        s.name,
        s.category,
        s.price,
        COUNT(DISTINCT a2.customer_id) as popularity_score
      FROM services s
      LEFT JOIN appointment_services ass2 ON s.id = ass2.service_id
      LEFT JOIN appointments a2 ON ass2.appointment_id = a2.id AND a2.status = 'completed'
      WHERE s.user_id = ?
      AND s.is_active = 1
      AND s.id NOT IN (
        SELECT DISTINCT ass.service_id 
        FROM appointments a
        JOIN appointment_services ass ON a.id = ass.appointment_id
        WHERE a.customer_id = ?
      )
      GROUP BY s.id
      ORDER BY popularity_score DESC
    `, [userId, customerId]);

    // Generate suggestions based on patterns
    const suggestions = [];
    
    // Pattern 1: Suggest complementary services
    for (const appointment of appointments) {
      const complementaryServices = unusedServices.filter(s => 
        isComplementary(appointment.category, s.category)
      ).slice(0, 2);

      for (const service of complementaryServices) {
        suggestions.push({
          service_id: service.id,
          reason: `Customers who book ${appointment.category} often enjoy ${service.category}`,
          confidence_score: calculateConfidence(appointment.frequency, service.popularity_score),
          potential_revenue: service.price * estimatedFrequency(appointment.frequency)
        });
      }
    }

    // Pattern 2: Suggest popular services
    const popularServices = unusedServices.slice(0, 3);
    for (const service of popularServices) {
      if (!suggestions.find(s => s.service_id === service.id)) {
        suggestions.push({
          service_id: service.id,
          reason: `One of our most popular services with ${service.popularity_score} happy customers`,
          confidence_score: Math.min(service.popularity_score / 100, 0.9),
          potential_revenue: service.price * 4 // Assume quarterly visits
        });
      }
    }

    // Insert suggestions into database
    for (const suggestion of suggestions.slice(0, 5)) {
      await db.execute(`
        INSERT INTO upselling_suggestions 
        (customer_id, service_id, suggestion_reason, confidence_score, potential_revenue)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        suggestion_reason = VALUES(suggestion_reason),
        confidence_score = VALUES(confidence_score),
        potential_revenue = VALUES(potential_revenue)
      `, [customerId, suggestion.service_id, suggestion.reason, 
          suggestion.confidence_score, suggestion.potential_revenue]);
    }

  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    throw error;
  }
}

// Helper function to analyze customer purchases
async function analyzeCustomerPurchases(customerId, userId) {
  try {
    // Get service categories and frequency
    const [categoryStats] = await db.execute(`
      SELECT 
        s.category,
        COUNT(*) as frequency,
        AVG(s.price) as avg_spending,
        MAX(a.appointment_date) as last_purchase_date
      FROM appointments a
      JOIN appointment_services ass ON a.id = ass.appointment_id
      JOIN services s ON ass.service_id = s.id
      WHERE a.customer_id = ? 
      AND a.status = 'completed'
      GROUP BY s.category
    `, [customerId]);

    // Calculate preference scores
    for (const stat of categoryStats) {
      const recencyScore = calculateRecencyScore(stat.last_purchase_date);
      const frequencyScore = Math.min(stat.frequency / 10, 1);
      const preferenceScore = (recencyScore * 0.4 + frequencyScore * 0.6);

      await db.execute(`
        INSERT INTO customer_purchase_analysis 
        (customer_id, service_category, frequency, avg_spending, last_purchase_date, preference_score)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        frequency = VALUES(frequency),
        avg_spending = VALUES(avg_spending),
        last_purchase_date = VALUES(last_purchase_date),
        preference_score = VALUES(preference_score)
      `, [customerId, stat.category, stat.frequency, stat.avg_spending, 
          stat.last_purchase_date, preferenceScore]);
    }

  } catch (error) {
    console.error('Error analyzing customer purchases:', error);
    throw error;
  }
}

// Helper function to update customer preferences after accepting suggestion
async function updateCustomerPreferences(customerId, serviceId) {
  try {
    const [service] = await db.execute(
      'SELECT category FROM services WHERE id = ?',
      [serviceId]
    );

    if (service.length) {
      await db.execute(`
        UPDATE customer_purchase_analysis 
        SET preference_score = LEAST(preference_score * 1.2, 1.0)
        WHERE customer_id = ? AND service_category = ?
      `, [customerId, service[0].category]);
    }
  } catch (error) {
    console.error('Error updating customer preferences:', error);
  }
}

// Helper functions for AI logic
function isComplementary(category1, category2) {
  const complementaryMap = {
    'haircut': ['hair-color', 'hair-treatment', 'styling'],
    'facial': ['massage', 'skincare', 'makeup'],
    'manicure': ['pedicure', 'nail-art', 'hand-treatment'],
    'massage': ['facial', 'body-treatment', 'aromatherapy']
  };

  return complementaryMap[category1]?.includes(category2) || false;
}

function calculateConfidence(frequency, popularity) {
  const freqScore = Math.min(frequency / 10, 0.5);
  const popScore = Math.min(popularity / 100, 0.5);
  return Math.min(freqScore + popScore, 0.95);
}

function estimatedFrequency(historicalFrequency) {
  return Math.max(Math.floor(historicalFrequency / 3), 1);
}

function calculateRecencyScore(lastPurchaseDate) {
  const daysSinceLastPurchase = Math.floor(
    (new Date() - new Date(lastPurchaseDate)) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceLastPurchase < 30) return 1.0;
  if (daysSinceLastPurchase < 60) return 0.8;
  if (daysSinceLastPurchase < 90) return 0.6;
  if (daysSinceLastPurchase < 180) return 0.4;
  return 0.2;
}

module.exports = router;