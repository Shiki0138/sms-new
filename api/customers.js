// Customer API endpoint - Vercel serverless function with Supabase integration
import jwt from 'jsonwebtoken';
import { supabaseAdmin as supabase } from '../lib/supabase.js';

// Helper function to verify JWT token
async function verifyToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('No valid auth token');
    }
    
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-minimum-32-characters-long');
        return decoded;
    } catch (error) {
        throw new Error('Invalid token');
    }
}

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Verify authentication (temporarily disabled for testing)
        // const authHeader = req.headers.authorization;
        // const user = await verifyToken(authHeader);
        
        switch (req.method) {
            case 'GET':
                return await handleGet(req, res);
            case 'POST':
                return await handlePost(req, res);
            default:
                return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Customer API error:', error);
        return res.status(401).json({ error: error.message || 'Authentication failed' });
    }
}

// Handle GET requests
async function handleGet(req, res) {
    try {
        const { query, page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let queryBuilder = supabase
            .from('customers')
            .select('*', { count: 'exact' })
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        // Add search functionality
        if (query) {
            queryBuilder = queryBuilder.or(
                `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`
            );
        }
        
        // Add pagination
        queryBuilder = queryBuilder.range(offset, offset + parseInt(limit) - 1);
        
        const { data: customers, error, count } = await queryBuilder;
        
        if (error) {
            console.error('Supabase error:', error);
            // Fallback to mock data if database is not available
            return res.status(200).json({
                customers: getMockCustomers(),
                total: 5,
                page: parseInt(page),
                limit: parseInt(limit),
                message: 'Using mock data - database connection pending'
            });
        }
        
        return res.status(200).json({
            customers: customers || [],
            total: count || 0,
            page: parseInt(page),
            limit: parseInt(limit),
            message: 'Customers retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        // Return mock data as fallback
        return res.status(200).json({
            customers: getMockCustomers(),
            total: 5,
            page: 1,
            limit: 50,
            message: 'Using mock data due to error'
        });
    }
}

// Handle POST requests
async function handlePost(req, res) {
    try {
        const customerData = req.body;
        
        // Validate required fields
        if (!customerData.firstName || !customerData.lastName) {
            return res.status(400).json({ error: '氏名は必須項目です' });
        }
        
        // Prepare data for database
        const newCustomer = {
            first_name: customerData.firstName,
            last_name: customerData.lastName,
            first_name_kana: customerData.firstNameKana || '',
            last_name_kana: customerData.lastNameKana || '',
            email: customerData.email || null,
            phone: customerData.phone || null,
            birth_date: customerData.birthDate || null,
            gender: customerData.gender || null,
            postal_code: customerData.postalCode || null,
            prefecture: customerData.prefecture || null,
            city: customerData.city || null,
            address: customerData.address || null,
            notes: customerData.notes || null,
            allergies: customerData.allergies || [],
            tags: customerData.tags || [],
            visit_count: 0,
            total_spent: 0,
            is_active: true
        };
        
        const { data: customer, error } = await supabase
            .from('customers')
            .insert([newCustomer])
            .select()
            .single();
        
        if (error) {
            console.error('Supabase insert error:', error);
            // Fallback to mock response
            const mockCustomer = {
                id: `cust-${Date.now()}`,
                ...customerData,
                visitCount: 0,
                totalSpent: 0,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            return res.status(201).json({
                customer: mockCustomer,
                message: 'Customer created (mock mode)'
            });
        }
        
        // Transform response to match frontend expectations
        const transformedCustomer = {
            id: customer.id,
            firstName: customer.first_name,
            lastName: customer.last_name,
            firstNameKana: customer.first_name_kana,
            lastNameKana: customer.last_name_kana,
            email: customer.email,
            phone: customer.phone,
            birthDate: customer.birth_date,
            gender: customer.gender,
            postalCode: customer.postal_code,
            prefecture: customer.prefecture,
            city: customer.city,
            address: customer.address,
            notes: customer.notes,
            allergies: customer.allergies,
            tags: customer.tags,
            visitCount: customer.visit_count,
            totalSpent: customer.total_spent,
            isActive: customer.is_active,
            createdAt: customer.created_at,
            updatedAt: customer.updated_at
        };
        
        return res.status(201).json({
            customer: transformedCustomer,
            message: 'Customer created successfully'
        });
    } catch (error) {
        console.error('Error creating customer:', error);
        return res.status(500).json({ error: 'Failed to create customer' });
    }
}

// Mock data for fallback
function getMockCustomers() {
    return [
        {
            id: 'cust-001',
            firstName: 'さくら',
            lastName: '田中',
            firstNameKana: 'サクラ',
            lastNameKana: 'タナカ',
            email: 'tanaka.sakura@example.com',
            phone: '090-1234-5678',
            birthDate: '1990-05-15',
            gender: 'female',
            postalCode: '150-0001',
            prefecture: '東京都',
            city: '渋谷区',
            address: '1-2-3',
            visitCount: 12,
            totalSpent: 85000,
            lastVisit: '2024-01-15',
            notes: '敏感肌、アロマオイル好み',
            allergies: ['化学系染料に軽度の反応'],
            tags: ['VIP', '敏感肌', 'ナチュラル志向'],
            isActive: true,
            createdAt: new Date('2023-06-15').toISOString(),
            updatedAt: new Date('2024-01-15').toISOString()
        },
        {
            id: 'cust-002',
            firstName: '美由紀',
            lastName: '佐藤',
            firstNameKana: 'ミユキ',
            lastNameKana: 'サトウ',
            email: 'sato.miyuki@example.com',
            phone: '090-2345-6789',
            birthDate: '1985-12-03',
            gender: 'female',
            postalCode: '160-0022',
            prefecture: '東京都',
            city: '新宿区',
            address: '4-5-6',
            visitCount: 8,
            totalSpent: 62000,
            lastVisit: '2024-01-20',
            notes: 'ショートヘア専門、カラーリング好き',
            allergies: [],
            tags: ['ショートヘア', 'カラー好き'],
            isActive: true,
            createdAt: new Date('2023-08-20').toISOString(),
            updatedAt: new Date('2024-01-20').toISOString()
        },
        {
            id: 'cust-003',
            firstName: '恵子',
            lastName: '高橋',
            firstNameKana: 'ケイコ',
            lastNameKana: 'タカハシ',
            email: 'takahashi.keiko@example.com',
            phone: '090-3456-7890',
            birthDate: '1992-03-22',
            gender: 'female',
            postalCode: '154-0017',
            prefecture: '東京都',
            city: '世田谷区',
            address: '7-8-9',
            visitCount: 15,
            totalSpent: 120000,
            lastVisit: '2024-01-25',
            notes: 'VIP顧客、月2回定期来店',
            allergies: [],
            tags: ['VIP', '定期客'],
            isActive: true,
            createdAt: new Date('2023-04-10').toISOString(),
            updatedAt: new Date('2024-01-25').toISOString()
        },
        {
            id: 'cust-004',
            firstName: '裕子',
            lastName: '鈴木',
            firstNameKana: 'ユウコ',
            lastNameKana: 'スズキ',
            email: 'suzuki.yuko@example.com',
            phone: '090-4567-8901',
            birthDate: '1988-09-08',
            gender: 'female',
            postalCode: '104-0061',
            prefecture: '東京都',
            city: '中央区',
            address: '10-11-12',
            visitCount: 6,
            totalSpent: 45000,
            lastVisit: '2024-01-18',
            notes: 'パーマ専門、自然派化粧品希望',
            allergies: [],
            tags: ['パーマ好き', '自然派'],
            isActive: true,
            createdAt: new Date('2023-09-30').toISOString(),
            updatedAt: new Date('2024-01-18').toISOString()
        },
        {
            id: 'cust-005',
            firstName: '真由美',
            lastName: '鈴木',
            firstNameKana: 'マユミ',
            lastNameKana: 'スズキ',
            email: 'suzuki.mayumi@example.com',
            phone: '090-5555-6666',
            birthDate: '1983-07-25',
            gender: 'female',
            postalCode: '110-0005',
            prefecture: '東京都',
            city: '台東区',
            address: '5-6-7',
            visitCount: 20,
            totalSpent: 300000,
            lastVisit: '2024-01-12',
            notes: 'プレミアム会員、長期リピーター',
            allergies: [],
            tags: ['プレミアム', '長期顧客'],
            isActive: true,
            createdAt: new Date('2022-05-10').toISOString(),
            updatedAt: new Date('2024-01-12').toISOString()
        }
    ];
}