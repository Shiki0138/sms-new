const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'salon-lumiere-secret-key');
    const user = await User.findOne({
      where: {
        id: decoded.id,
        isActive: true
      }
    });

    if (!user) {
      throw new Error();
    }

    // Check if trial has expired for light plan users
    if (user.planType === 'light' && user.trialEndsAt < new Date()) {
      return res.status(403).json({
        message: 'Trial period has expired. Please upgrade your plan.'
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate' });
  }
};

const checkPlan = (allowedPlans) => {
  return (req, res, next) => {
    if (!allowedPlans.includes(req.user.planType)) {
      return res.status(403).json({
        message: 'This feature is not available in your current plan'
      });
    }
    next();
  };
};

module.exports = { authMiddleware, checkPlan };