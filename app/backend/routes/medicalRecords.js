const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { MedicalRecord, Customer } = require('../models');
const { authMiddleware } = require('../middleware/auth-new');
const { validate } = require('../middleware/validation');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG images are allowed'));
    }
  }
});

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get medical records for a customer
router.get('/customer/:customerId', async (req, res) => {
  try {
    // Verify customer belongs to user
    const customer = await Customer.findOne({
      where: {
        id: req.params.customerId,
        userId: req.user.id
      }
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const records = await MedicalRecord.findAll({
      where: {
        customerId: req.params.customerId,
        userId: req.user.id
      },
      order: [['visitDate', 'DESC']]
    });

    res.json({ records });
  } catch (error) {
    console.error('Get medical records error:', error);
    res.status(500).json({ message: 'Failed to get medical records' });
  }
});

// Get medical record by ID
router.get('/:id', async (req, res) => {
  try {
    const record = await MedicalRecord.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: ['customer', 'appointment']
    });

    if (!record) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    res.json({ record });
  } catch (error) {
    console.error('Get medical record error:', error);
    res.status(500).json({ message: 'Failed to get medical record' });
  }
});

// Create medical record
router.post('/', [
  body('customerId').notEmpty().isUUID(),
  body('visitDate').isISO8601(),
  body('services').isArray(),
  validate
], async (req, res) => {
  try {
    // Verify customer belongs to user
    const customer = await Customer.findOne({
      where: {
        id: req.body.customerId,
        userId: req.user.id
      }
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const record = await MedicalRecord.create({
      ...req.body,
      userId: req.user.id
    });

    res.status(201).json({
      message: 'Medical record created successfully',
      record
    });
  } catch (error) {
    console.error('Create medical record error:', error);
    res.status(500).json({ message: 'Failed to create medical record' });
  }
});

// Update medical record
router.put('/:id', async (req, res) => {
  try {
    const record = await MedicalRecord.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!record) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    await record.update(req.body);
    res.json({
      message: 'Medical record updated successfully',
      record
    });
  } catch (error) {
    console.error('Update medical record error:', error);
    res.status(500).json({ message: 'Failed to update medical record' });
  }
});

// Upload photos
router.post('/:id/photos', upload.fields([
  { name: 'beforePhoto', maxCount: 1 },
  { name: 'afterPhoto', maxCount: 1 }
]), async (req, res) => {
  try {
    const record = await MedicalRecord.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!record) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    // Light plan users can only upload 1 photo
    if (req.user.planType === 'light' && req.files.beforePhoto && req.files.afterPhoto) {
      return res.status(403).json({ 
        message: 'Light plan allows only 1 photo per record. Please upgrade your plan.' 
      });
    }

    const updates = {};
    const uploadDir = path.join(__dirname, '../../uploads', req.user.id);
    await fs.mkdir(uploadDir, { recursive: true });

    // Process before photo
    if (req.files.beforePhoto) {
      const beforePhoto = req.files.beforePhoto[0];
      const filename = `${record.id}_before_${Date.now()}.jpg`;
      const filepath = path.join(uploadDir, filename);
      
      await sharp(beforePhoto.buffer)
        .resize(800, 800, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toFile(filepath);
      
      updates.beforePhotoUrl = `/uploads/${req.user.id}/${filename}`;
    }

    // Process after photo
    if (req.files.afterPhoto) {
      const afterPhoto = req.files.afterPhoto[0];
      const filename = `${record.id}_after_${Date.now()}.jpg`;
      const filepath = path.join(uploadDir, filename);
      
      await sharp(afterPhoto.buffer)
        .resize(800, 800, { fit: 'inside' })
        .jpeg({ quality: 80 })
        .toFile(filepath);
      
      updates.afterPhotoUrl = `/uploads/${req.user.id}/${filename}`;
    }

    await record.update(updates);
    res.json({
      message: 'Photos uploaded successfully',
      record
    });
  } catch (error) {
    console.error('Upload photos error:', error);
    res.status(500).json({ message: 'Failed to upload photos' });
  }
});

// Delete medical record
router.delete('/:id', async (req, res) => {
  try {
    const record = await MedicalRecord.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!record) {
      return res.status(404).json({ message: 'Medical record not found' });
    }

    // Delete associated photos
    if (record.beforePhotoUrl) {
      const filepath = path.join(__dirname, '../..', record.beforePhotoUrl);
      await fs.unlink(filepath).catch(() => {});
    }
    if (record.afterPhotoUrl) {
      const filepath = path.join(__dirname, '../..', record.afterPhotoUrl);
      await fs.unlink(filepath).catch(() => {});
    }

    await record.destroy();
    res.json({ message: 'Medical record deleted successfully' });
  } catch (error) {
    console.error('Delete medical record error:', error);
    res.status(500).json({ message: 'Failed to delete medical record' });
  }
});

module.exports = router;