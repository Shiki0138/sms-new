// CSV Template API - Returns CSV templates for different import types
import Papa from 'papaparse';

// Template data for different types
const templates = {
    customers: {
        headers: [
            '姓',
            '名',
            '姓カナ',
            '名カナ',
            'メールアドレス',
            '電話番号',
            '生年月日',
            '性別',
            '郵便番号',
            '都道府県',
            '市区町村',
            '住所',
            '備考',
            'タグ',
            'お客様番号',
            '初回来店日',
            '最終来店日',
            '来店回数',
            '累計売上'
        ],
        sampleData: [
            {
                '姓': '山田',
                '名': '太郎',
                '姓カナ': 'ヤマダ',
                '名カナ': 'タロウ',
                'メールアドレス': 'yamada.taro@example.com',
                '電話番号': '090-1234-5678',
                '生年月日': '1990-05-15',
                '性別': '男性',
                '郵便番号': '150-0001',
                '都道府県': '東京都',
                '市区町村': '渋谷区',
                '住所': '神南1-2-3',
                '備考': 'アレルギー：特になし',
                'タグ': 'VIP,リピーター',
                'お客様番号': 'CUST001',
                '初回来店日': '2023-01-15',
                '最終来店日': '2024-01-20',
                '来店回数': '12',
                '累計売上': '85000'
            },
            {
                '姓': '佐藤',
                '名': '花子',
                '姓カナ': 'サトウ',
                '名カナ': 'ハナコ',
                'メールアドレス': 'sato.hanako@example.com',
                '電話番号': '090-2345-6789',
                '生年月日': '1985-08-20',
                '性別': '女性',
                '郵便番号': '160-0022',
                '都道府県': '東京都',
                '市区町村': '新宿区',
                '住所': '新宿3-4-5',
                '備考': '敏感肌のため注意',
                'タグ': '新規',
                'お客様番号': 'CUST002',
                '初回来店日': '2024-01-05',
                '最終来店日': '2024-01-05',
                '来店回数': '1',
                '累計売上': '8500'
            }
        ]
    },
    appointments: {
        headers: [
            '予約日',
            '開始時間',
            '顧客名',
            '顧客ID',
            'サービス',
            'スタッフ',
            '料金',
            'ステータス',
            '備考',
            '予約番号',
            '予約経路'
        ],
        sampleData: [
            {
                '予約日': '2024-02-01',
                '開始時間': '10:00',
                '顧客名': '山田 太郎',
                '顧客ID': 'CUST001',
                'サービス': 'カット',
                'スタッフ': '田中 美穂',
                '料金': '4500',
                'ステータス': '予約済',
                '備考': 'いつもどおりでお願いします',
                '予約番号': 'APT001',
                '予約経路': 'ホットペッパービューティー'
            },
            {
                '予約日': '2024-02-02',
                '開始時間': '14:30',
                '顧客名': '佐藤 花子',
                '顧客ID': 'CUST002',
                'サービス': 'カラー + トリートメント',
                'スタッフ': '鈴木 健太',
                '料金': '12000',
                'ステータス': '確認済',
                '備考': 'アッシュ系の色をご希望',
                '予約番号': 'APT002',
                '予約経路': '電話予約'
            }
        ]
    },
    services: {
        headers: [
            'サービス名',
            'カテゴリー',
            '説明',
            '所要時間（分）',
            '料金',
            'サービスタイプ',
            'アクティブ'
        ],
        sampleData: [
            {
                'サービス名': 'カット',
                'カテゴリー': 'ヘアスタイル',
                '説明': '基本的なヘアカット',
                '所要時間（分）': '60',
                '料金': '4500',
                'サービスタイプ': 'cut',
                'アクティブ': 'true'
            },
            {
                'サービス名': 'カラーリング',
                'カテゴリー': 'カラー',
                '説明': '全体カラー',
                '所要時間（分）': '120',
                '料金': '8000',
                'サービスタイプ': 'color',
                'アクティブ': 'true'
            },
            {
                'サービス名': 'トリートメント',
                'カテゴリー': 'ケア',
                '説明': 'ディープケアトリートメント',
                '所要時間（分）': '45',
                '料金': '5000',
                'サービスタイプ': 'treatment',
                'アクティブ': 'true'
            }
        ]
    }
};

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { type } = req.query;
    
    if (!type || !templates[type]) {
        return res.status(400).json({ 
            error: 'Invalid template type. Supported types: customers, appointments, services' 
        });
    }
    
    try {
        const template = templates[type];
        
        // Create CSV content with headers and sample data
        const csvContent = Papa.unparse(template.sampleData, {
            quotes: true,
            header: true
        });
        
        // Add BOM for Excel compatibility with Japanese characters
        const bom = '\uFEFF';
        const csvWithBom = bom + csvContent;
        
        // Set response headers for file download
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${type}_template.csv"`);
        
        return res.status(200).send(csvWithBom);
        
    } catch (error) {
        console.error('Template generation error:', error);
        return res.status(500).json({ 
            error: 'Failed to generate template',
            message: error.message 
        });
    }
}