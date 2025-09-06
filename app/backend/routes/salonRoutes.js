const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { db } = require('../../shared/firebase-config');

const router = express.Router();

/**
 * @desc    Get salon information
 * @route   GET /api/salon/info
 * @access  Private
 */
router.get('/info', authenticateToken, asyncHandler(async (req, res) => {
    try {
        // VOTANサロンの情報を取得
        const salonDoc = await db.collection('salons').doc('salon_votan_001').get();
        
        if (!salonDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'サロン情報が見つかりません'
            });
        }
        
        const salonData = salonDoc.data();
        
        res.json({
            success: true,
            data: salonData
        });
    } catch (error) {
        console.error('サロン情報取得エラー:', error);
        res.status(500).json({
            success: false,
            message: 'サロン情報の取得に失敗しました'
        });
    }
}));

/**
 * @desc    Get all staff members
 * @route   GET /api/salon/staff
 * @access  Private
 */
router.get('/staff', authenticateToken, asyncHandler(async (req, res) => {
    try {
        const staffSnapshot = await db.collection('staff')
            .where('salonId', '==', 'salon_votan_001')
            .where('isActive', '==', true)
            .orderBy('experience', 'desc')
            .get();
        
        const staffList = [];
        staffSnapshot.forEach(doc => {
            staffList.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        res.json({
            success: true,
            data: staffList,
            count: staffList.length
        });
    } catch (error) {
        console.error('スタッフ情報取得エラー:', error);
        res.status(500).json({
            success: false,
            message: 'スタッフ情報の取得に失敗しました'
        });
    }
}));

/**
 * @desc    Get staff member by ID
 * @route   GET /api/salon/staff/:id
 * @access  Private
 */
router.get('/staff/:id', authenticateToken, asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const staffDoc = await db.collection('staff').doc(id).get();
        
        if (!staffDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'スタッフが見つかりません'
            });
        }
        
        const staffData = staffDoc.data();
        
        res.json({
            success: true,
            data: {
                id: staffDoc.id,
                ...staffData
            }
        });
    } catch (error) {
        console.error('スタッフ情報取得エラー:', error);
        res.status(500).json({
            success: false,
            message: 'スタッフ情報の取得に失敗しました'
        });
    }
}));

/**
 * @desc    Get all services
 * @route   GET /api/salon/services
 * @access  Private
 */
router.get('/services', authenticateToken, asyncHandler(async (req, res) => {
    try {
        const { category } = req.query;
        
        let query = db.collection('services')
            .where('salonId', '==', 'salon_votan_001')
            .where('isActive', '==', true)
            .orderBy('price', 'asc');
        
        if (category) {
            query = query.where('category', '==', category);
        }
        
        const servicesSnapshot = await query.get();
        
        const servicesList = [];
        servicesSnapshot.forEach(doc => {
            servicesList.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // カテゴリ別にグループ化
        const groupedServices = servicesList.reduce((groups, service) => {
            const category = service.category;
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(service);
            return groups;
        }, {});
        
        res.json({
            success: true,
            data: servicesList,
            grouped: groupedServices,
            count: servicesList.length
        });
    } catch (error) {
        console.error('サービス情報取得エラー:', error);
        res.status(500).json({
            success: false,
            message: 'サービス情報の取得に失敗しました'
        });
    }
}));

/**
 * @desc    Get service by ID
 * @route   GET /api/salon/services/:id
 * @access  Private
 */
router.get('/services/:id', authenticateToken, asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const serviceDoc = await db.collection('services').doc(id).get();
        
        if (!serviceDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'サービスが見つかりません'
            });
        }
        
        const serviceData = serviceDoc.data();
        
        res.json({
            success: true,
            data: {
                id: serviceDoc.id,
                ...serviceData
            }
        });
    } catch (error) {
        console.error('サービス情報取得エラー:', error);
        res.status(500).json({
            success: false,
            message: 'サービス情報の取得に失敗しました'
        });
    }
}));

/**
 * @desc    Get salon settings
 * @route   GET /api/salon/settings
 * @access  Private
 */
router.get('/settings', authenticateToken, asyncHandler(async (req, res) => {
    try {
        const settingsDoc = await db.collection('settings').doc('settings_votan_001').get();
        
        if (!settingsDoc.exists) {
            return res.status(404).json({
                success: false,
                message: '設定情報が見つかりません'
            });
        }
        
        const settingsData = settingsDoc.data();
        
        res.json({
            success: true,
            data: settingsData
        });
    } catch (error) {
        console.error('設定情報取得エラー:', error);
        res.status(500).json({
            success: false,
            message: '設定情報の取得に失敗しました'
        });
    }
}));

/**
 * @desc    Update salon information
 * @route   PUT /api/salon/info
 * @access  Private
 */
router.put('/info', authenticateToken, asyncHandler(async (req, res) => {
    try {
        const { name, nameEn, address, phone, nearestStations } = req.body;
        
        const updateData = {
            ...(name && { name }),
            ...(nameEn && { nameEn }),
            ...(address && { address }),
            ...(phone && { phone }),
            ...(nearestStations && { nearestStations }),
            updatedAt: new Date()
        };
        
        await db.collection('salons').doc('salon_votan_001').update(updateData);
        
        res.json({
            success: true,
            message: 'サロン情報を更新しました'
        });
    } catch (error) {
        console.error('サロン情報更新エラー:', error);
        res.status(500).json({
            success: false,
            message: 'サロン情報の更新に失敗しました'
        });
    }
}));

/**
 * @desc    Add new staff member
 * @route   POST /api/salon/staff
 * @access  Private
 */
router.post('/staff', authenticateToken, asyncHandler(async (req, res) => {
    try {
        const { name, experience, position, specialties } = req.body;
        
        if (!name || !position) {
            return res.status(400).json({
                success: false,
                message: '名前と役職は必須です'
            });
        }
        
        const staffData = {
            salonId: 'salon_votan_001',
            name,
            experience: experience || 0,
            position,
            specialties: specialties || [],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const docRef = await db.collection('staff').add(staffData);
        
        res.status(201).json({
            success: true,
            message: 'スタッフを追加しました',
            data: {
                id: docRef.id,
                ...staffData
            }
        });
    } catch (error) {
        console.error('スタッフ追加エラー:', error);
        res.status(500).json({
            success: false,
            message: 'スタッフの追加に失敗しました'
        });
    }
}));

/**
 * @desc    Update staff member
 * @route   PUT /api/salon/staff/:id
 * @access  Private
 */
router.put('/staff/:id', authenticateToken, asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { name, experience, position, specialties, isActive } = req.body;
        
        const updateData = {
            ...(name && { name }),
            ...(experience !== undefined && { experience }),
            ...(position && { position }),
            ...(specialties && { specialties }),
            ...(isActive !== undefined && { isActive }),
            updatedAt: new Date()
        };
        
        await db.collection('staff').doc(id).update(updateData);
        
        res.json({
            success: true,
            message: 'スタッフ情報を更新しました'
        });
    } catch (error) {
        console.error('スタッフ更新エラー:', error);
        res.status(500).json({
            success: false,
            message: 'スタッフ情報の更新に失敗しました'
        });
    }
}));

module.exports = router;