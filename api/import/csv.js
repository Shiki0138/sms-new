// CSV Import API - Vercel serverless function with Supabase integration
import jwt from 'jsonwebtoken';
import { supabaseAdmin as supabase } from '../../lib/supabase.js';
import multer from 'multer';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed.'));
        }
    }
});

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

// Field mappings for different import types
const fieldMappings = {
    customers: {
        '姓': 'last_name',
        '名': 'first_name',
        '姓カナ': 'last_name_kana',
        '名カナ': 'first_name_kana',
        'メールアドレス': 'email',
        '電話番号': 'phone',
        '生年月日': 'birth_date',
        '性別': 'gender',
        '郵便番号': 'postal_code',
        '都道府県': 'prefecture',
        '市区町村': 'city',
        '住所': 'address',
        '備考': 'notes',
        'タグ': 'tags',
        // Hot Pepper Beauty specific fields
        'お客様番号': 'external_id',
        '初回来店日': 'first_visit_date',
        '最終来店日': 'last_visit_date',
        '来店回数': 'visit_count',
        '累計売上': 'total_spent'
    },
    appointments: {
        '予約日': 'appointment_date',
        '開始時間': 'start_time',
        '顧客名': 'customer_name',
        '顧客ID': 'customer_id',
        'サービス': 'service_name',
        'スタッフ': 'staff_name',
        '料金': 'total_amount',
        'ステータス': 'status',
        '備考': 'notes',
        // Hot Pepper Beauty specific
        '予約番号': 'external_id',
        '予約経路': 'booking_source'
    },
    services: {
        'サービス名': 'name',
        'カテゴリー': 'category',
        '説明': 'description',
        '所要時間（分）': 'duration_minutes',
        '料金': 'price',
        'サービスタイプ': 'service_type',
        'アクティブ': 'is_active'
    }
};

// Process CSV data based on type
async function processCSVData(data, type) {
    const mapping = fieldMappings[type];
    const results = {
        success: [],
        errors: [],
        imported: 0,
        failed: 0
    };

    for (const row of data) {
        try {
            const processedRow = {};
            
            // Map CSV fields to database fields
            for (const [csvField, dbField] of Object.entries(mapping)) {
                if (row[csvField] !== undefined && row[csvField] !== '') {
                    processedRow[dbField] = row[csvField];
                }
            }

            // Type-specific processing
            if (type === 'customers') {
                processedRow.id = processedRow.external_id || uuidv4();
                
                // Process tags
                if (processedRow.tags && typeof processedRow.tags === 'string') {
                    processedRow.tags = processedRow.tags.split(',').map(tag => tag.trim());
                }
                
                // Convert numbers
                if (processedRow.visit_count) {
                    processedRow.visit_count = parseInt(processedRow.visit_count) || 0;
                }
                if (processedRow.total_spent) {
                    processedRow.total_spent = parseFloat(processedRow.total_spent) || 0;
                }
                
                // Set defaults
                processedRow.is_active = true;
                
                // Check for existing customer by email or phone
                if (processedRow.email || processedRow.phone) {
                    const { data: existing } = await supabase
                        .from('customers')
                        .select('id')
                        .or(`email.eq.${processedRow.email},phone.eq.${processedRow.phone}`)
                        .single();
                    
                    if (existing) {
                        // Update existing customer
                        const { error } = await supabase
                            .from('customers')
                            .update(processedRow)
                            .eq('id', existing.id);
                        
                        if (!error) {
                            results.success.push({ row: processedRow, action: 'updated' });
                            results.imported++;
                        } else {
                            throw error;
                        }
                    } else {
                        // Insert new customer
                        const { error } = await supabase
                            .from('customers')
                            .insert([processedRow]);
                        
                        if (!error) {
                            results.success.push({ row: processedRow, action: 'created' });
                            results.imported++;
                        } else {
                            throw error;
                        }
                    }
                }
            }
            
            else if (type === 'appointments') {
                processedRow.id = processedRow.external_id || uuidv4();
                
                // Parse date and time
                if (processedRow.appointment_date && processedRow.start_time) {
                    const dateTime = new Date(`${processedRow.appointment_date} ${processedRow.start_time}`);
                    processedRow.appointment_date = dateTime.toISOString();
                }
                
                // Find customer by name if no ID provided
                if (!processedRow.customer_id && processedRow.customer_name) {
                    const nameParts = processedRow.customer_name.split(' ');
                    const { data: customer } = await supabase
                        .from('customers')
                        .select('id')
                        .eq('last_name', nameParts[0])
                        .eq('first_name', nameParts[1])
                        .single();
                    
                    if (customer) {
                        processedRow.customer_id = customer.id;
                    }
                }
                
                // Convert amount
                if (processedRow.total_amount) {
                    processedRow.total_amount = parseFloat(processedRow.total_amount) || 0;
                }
                
                // Set defaults
                processedRow.duration_minutes = 60;
                processedRow.payment_status = 'pending';
                
                const { error } = await supabase
                    .from('appointments')
                    .insert([processedRow]);
                
                if (!error) {
                    results.success.push({ row: processedRow, action: 'created' });
                    results.imported++;
                } else {
                    throw error;
                }
            }
            
            else if (type === 'services') {
                processedRow.id = uuidv4();
                
                // Convert numbers
                if (processedRow.duration_minutes) {
                    processedRow.duration_minutes = parseInt(processedRow.duration_minutes) || 60;
                }
                if (processedRow.price) {
                    processedRow.price = parseFloat(processedRow.price) || 0;
                }
                
                // Convert boolean
                processedRow.is_active = processedRow.is_active !== 'false' && processedRow.is_active !== '0';
                
                const { error } = await supabase
                    .from('services')
                    .insert([processedRow]);
                
                if (!error) {
                    results.success.push({ row: processedRow, action: 'created' });
                    results.imported++;
                } else {
                    throw error;
                }
            }
            
        } catch (error) {
            results.errors.push({
                row: row,
                error: error.message || 'Unknown error'
            });
            results.failed++;
        }
    }
    
    return results;
}

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Verify authentication (temporarily disabled for testing)
        // const authHeader = req.headers.authorization;
        // const user = await verifyToken(authHeader);
        
        // In a real implementation, you would use multer middleware
        // For now, we'll parse the CSV from the request body
        const { csvData, type } = req.body;
        
        if (!csvData || !type) {
            return res.status(400).json({ 
                error: 'CSV data and type are required' 
            });
        }
        
        if (!fieldMappings[type]) {
            return res.status(400).json({ 
                error: 'Invalid import type. Supported types: customers, appointments, services' 
            });
        }
        
        // Parse CSV data
        const parseResult = Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            encoding: 'UTF-8'
        });
        
        if (parseResult.errors.length > 0) {
            return res.status(400).json({ 
                error: 'CSV parsing failed',
                details: parseResult.errors 
            });
        }
        
        // Process the data
        const results = await processCSVData(parseResult.data, type);
        
        return res.status(200).json({
            message: 'CSV import completed',
            imported: results.imported,
            failed: results.failed,
            total: parseResult.data.length,
            errors: results.errors.slice(0, 10) // Return first 10 errors
        });
        
    } catch (error) {
        console.error('CSV import error:', error);
        return res.status(500).json({ 
            error: 'Failed to import CSV',
            message: error.message 
        });
    }
}