// Subscription Routes
// Handles plan management, upgrades, and billing

const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const { authenticate } = require('../middleware/auth');
const { checkPlanFeature } = require('../middleware/planRestrictions');
const { getAvailablePlans, comparePlans, getPlan } = require('../config/plans');

// Get available plans
router.get('/plans', async (req, res) => {
  try {
    const plans = getAvailablePlans();
    res.json({
      success: true,
      plans,
      currency: 'JPY'
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plans'
    });
  }
});

// Get current subscription
router.get('/current', authenticate, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ 
      salon: req.user.salonId 
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }
    
    res.json({
      success: true,
      subscription: {
        ...subscription.toObject(),
        planDetails: subscription.planDetails,
        daysRemaining: subscription.daysRemaining(),
        isActive: subscription.isActive()
      }
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription'
    });
  }
});

// Get usage statistics
router.get('/usage', authenticate, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ 
      salon: req.user.salonId 
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }
    
    const plan = getPlan(subscription.planId);
    const usage = subscription.usage.currentMonth;
    
    res.json({
      success: true,
      usage: {
        bookings: {
          current: usage.bookings,
          limit: plan.features.maxMonthlyBookings,
          percentage: plan.features.maxMonthlyBookings === -1 ? 0 : 
            (usage.bookings / plan.features.maxMonthlyBookings) * 100
        },
        sms: {
          current: usage.smsCount,
          limit: plan.features.maxSmsPerMonth,
          percentage: plan.features.maxSmsPerMonth === -1 ? 0 :
            (usage.smsCount / plan.features.maxSmsPerMonth) * 100
        },
        api: {
          current: usage.apiCalls,
          hasAccess: plan.features.apiAccess
        },
        storage: {
          current: usage.storageUsed,
          unit: 'MB'
        },
        resetDate: usage.resetDate
      }
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage data'
    });
  }
});

// Compare plans
router.get('/compare/:plan1/:plan2', async (req, res) => {
  try {
    const comparison = comparePlans(req.params.plan1, req.params.plan2);
    
    if (!comparison) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan IDs provided'
      });
    }
    
    res.json({
      success: true,
      comparison
    });
  } catch (error) {
    console.error('Error comparing plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare plans'
    });
  }
});

// Upgrade plan
router.post('/upgrade', authenticate, async (req, res) => {
  try {
    const { newPlanId, billingInfo } = req.body;
    
    if (!newPlanId) {
      return res.status(400).json({
        success: false,
        error: 'New plan ID is required'
      });
    }
    
    const subscription = await Subscription.findOne({ 
      salon: req.user.salonId 
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }
    
    if (!subscription.canUpgrade(newPlanId)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot downgrade plans. Please contact support.'
      });
    }
    
    // Record plan change
    subscription.planHistory.push({
      fromPlan: subscription.planId,
      toPlan: newPlanId,
      reason: 'User upgrade',
      changedBy: req.user._id
    });
    
    // Update plan
    subscription.planId = newPlanId;
    
    // Update billing if provided
    if (billingInfo) {
      Object.assign(subscription.billing, billingInfo);
    }
    
    await subscription.save();
    
    res.json({
      success: true,
      message: 'Plan upgraded successfully',
      subscription: {
        ...subscription.toObject(),
        planDetails: subscription.planDetails
      }
    });
  } catch (error) {
    console.error('Error upgrading plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upgrade plan'
    });
  }
});

// Cancel subscription
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const { reason, feedback } = req.body;
    
    const subscription = await Subscription.findOne({ 
      salon: req.user.salonId 
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }
    
    subscription.status = 'cancelled';
    subscription.metadata.cancellationReason = reason;
    subscription.metadata.cancellationFeedback = feedback;
    subscription.metadata.cancelledAt = new Date();
    subscription.metadata.cancelledBy = req.user._id;
    
    await subscription.save();
    
    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      effectiveUntil: subscription.endDate
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription'
    });
  }
});

// Apply discount code
router.post('/apply-discount', authenticate, async (req, res) => {
  try {
    const { discountCode } = req.body;
    
    if (!discountCode) {
      return res.status(400).json({
        success: false,
        error: 'Discount code is required'
      });
    }
    
    const subscription = await Subscription.findOne({ 
      salon: req.user.salonId 
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }
    
    // TODO: Validate discount code from database
    // For now, we'll use a mock implementation
    const mockDiscount = {
      code: discountCode,
      type: 'percentage',
      value: 20,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };
    
    subscription.discounts.push(mockDiscount);
    await subscription.save();
    
    res.json({
      success: true,
      message: 'Discount applied successfully',
      discount: mockDiscount
    });
  } catch (error) {
    console.error('Error applying discount:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply discount'
    });
  }
});

// Webhook for payment updates (Stripe, etc.)
router.post('/webhook/payment', async (req, res) => {
  try {
    // TODO: Implement payment webhook handling
    // This would be called by your payment provider
    
    res.json({ received: true });
  } catch (error) {
    console.error('Payment webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;