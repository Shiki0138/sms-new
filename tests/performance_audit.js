// SMS美容室管理システム - パフォーマンス監査スクリプト
const { performance } = require('perf_hooks');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class PerformanceAuditor {
    constructor() {
        this.baseUrl = 'http://localhost:3001';
        this.results = {
            timestamp: new Date().toISOString(),
            pages: {},
            summary: {},
            recommendations: []
        };
    }

    // HTTPリクエストの実行時間を測定
    async measureHttpRequest(url) {
        const startTime = performance.now();
        try {
            const response = await fetch(url);
            const endTime = performance.now();
            const responseTime = endTime - startTime;
            
            return {
                success: true,
                status: response.status,
                responseTime: responseTime,
                contentLength: response.headers.get('content-length') || 'unknown'
            };
        } catch (error) {
            const endTime = performance.now();
            return {
                success: false,
                error: error.message,
                responseTime: endTime - startTime
            };
        }
    }

    // ファイルサイズ分析
    analyzeFileSize(filePath) {
        try {
            const stats = fs.statSync(filePath);
            return {
                size: stats.size,
                sizeKB: Math.round(stats.size / 1024 * 100) / 100,
                sizeMB: Math.round(stats.size / (1024 * 1024) * 100) / 100
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    // メモリ使用量測定
    measureMemoryUsage() {
        const used = process.memoryUsage();
        return {
            rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
            heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
            heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
            external: Math.round(used.external / 1024 / 1024 * 100) / 100
        };
    }

    // CPUプロファイリング
    async measureCpuUsage() {
        const startUsage = process.cpuUsage();
        await new Promise(resolve => setTimeout(resolve, 1000));
        const endUsage = process.cpuUsage(startUsage);
        
        return {
            user: endUsage.user / 1000,
            system: endUsage.system / 1000
        };
    }

    // ページ別パフォーマンステスト
    async testPagePerformance(pageName, pageUrl) {
        console.log(`Testing performance for ${pageName}...`);
        
        const httpTest = await this.measureHttpRequest(`${this.baseUrl}${pageUrl}`);
        const memoryBefore = this.measureMemoryUsage();
        
        // CPU使用量測定
        const cpuUsage = await this.measureCpuUsage();
        
        const memoryAfter = this.measureMemoryUsage();
        
        this.results.pages[pageName] = {
            url: pageUrl,
            http: httpTest,
            memory: {
                before: memoryBefore,
                after: memoryAfter,
                difference: {
                    heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed
                }
            },
            cpu: cpuUsage
        };
    }

    // 静的リソースのサイズ分析
    analyzeStaticResources() {
        const frontendDir = '/Users/leadfive/Desktop/system/017_SMS/app/frontend';
        const results = {
            css: {},
            js: {},
            html: {},
            total: { css: 0, js: 0, html: 0 }
        };

        // CSS ファイル分析
        const cssDir = path.join(frontendDir, 'css');
        try {
            const cssFiles = fs.readdirSync(cssDir).filter(file => file.endsWith('.css'));
            cssFiles.forEach(file => {
                const filePath = path.join(cssDir, file);
                const fileInfo = this.analyzeFileSize(filePath);
                results.css[file] = fileInfo;
                if (fileInfo.size) results.total.css += fileInfo.size;
            });
        } catch (error) {
            console.log('CSS directory error:', error.message);
        }

        // JS ファイル分析
        const jsDir = path.join(frontendDir, 'js');
        try {
            const jsFiles = fs.readdirSync(jsDir).filter(file => file.endsWith('.js'));
            jsFiles.forEach(file => {
                const filePath = path.join(jsDir, file);
                const fileInfo = this.analyzeFileSize(filePath);
                results.js[file] = fileInfo;
                if (fileInfo.size) results.total.js += fileInfo.size;
            });
        } catch (error) {
            console.log('JS directory error:', error.message);
        }

        // HTML ファイル分析
        try {
            const htmlFiles = fs.readdirSync(frontendDir).filter(file => file.endsWith('.html'));
            htmlFiles.forEach(file => {
                const filePath = path.join(frontendDir, file);
                const fileInfo = this.analyzeFileSize(filePath);
                results.html[file] = fileInfo;
                if (fileInfo.size) results.total.html += fileInfo.size;
            });
        } catch (error) {
            console.log('HTML directory error:', error.message);
        }

        return results;
    }

    // パフォーマンス分析とレコメンデーション
    generateRecommendations() {
        const recommendations = [];
        
        // レスポンス時間チェック
        Object.keys(this.results.pages).forEach(pageName => {
            const page = this.results.pages[pageName];
            if (page.http.responseTime > 1000) {
                recommendations.push({
                    type: 'warning',
                    page: pageName,
                    issue: 'Response time > 1000ms',
                    recommendation: 'ページ読み込み時間の最適化が必要です',
                    value: `${Math.round(page.http.responseTime)}ms`
                });
            }
        });

        // ファイルサイズチェック
        if (this.results.staticResources) {
            const totalSize = Object.values(this.results.staticResources.total).reduce((a, b) => a + b, 0);
            if (totalSize > 5 * 1024 * 1024) { // 5MB
                recommendations.push({
                    type: 'warning',
                    issue: 'Large total asset size',
                    recommendation: '静的リソースの圧縮・最適化を検討してください',
                    value: `${Math.round(totalSize / 1024 / 1024 * 100) / 100}MB`
                });
            }
        }

        // メモリ使用量チェック
        const avgMemoryUsage = Object.values(this.results.pages)
            .reduce((sum, page) => sum + page.memory.after.heapUsed, 0) / Object.keys(this.results.pages).length;
        
        if (avgMemoryUsage > 100) { // 100MB
            recommendations.push({
                type: 'info',
                issue: 'High memory usage',
                recommendation: 'メモリ使用量の最適化を検討してください',
                value: `${Math.round(avgMemoryUsage)}MB`
            });
        }

        this.results.recommendations = recommendations;
    }

    // 全体的なパフォーマンス評価
    calculatePerformanceScore() {
        const pages = Object.values(this.results.pages);
        const avgResponseTime = pages.reduce((sum, page) => sum + page.http.responseTime, 0) / pages.length;
        const failedRequests = pages.filter(page => !page.http.success).length;
        
        let score = 100;
        
        // レスポンス時間による減点
        if (avgResponseTime > 500) score -= 10;
        if (avgResponseTime > 1000) score -= 20;
        if (avgResponseTime > 2000) score -= 30;
        
        // 失敗リクエストによる減点
        score -= failedRequests * 15;
        
        // 警告による減点
        const warningCount = this.results.recommendations.filter(r => r.type === 'warning').length;
        score -= warningCount * 5;
        
        return Math.max(0, Math.min(100, score));
    }

    // サマリー生成
    generateSummary() {
        const pages = Object.values(this.results.pages);
        const avgResponseTime = pages.reduce((sum, page) => sum + page.http.responseTime, 0) / pages.length;
        const successRate = pages.filter(page => page.http.success).length / pages.length * 100;
        
        this.results.summary = {
            totalPages: pages.length,
            averageResponseTime: Math.round(avgResponseTime),
            successRate: Math.round(successRate),
            performanceScore: this.calculatePerformanceScore(),
            totalRecommendations: this.results.recommendations.length,
            warningCount: this.results.recommendations.filter(r => r.type === 'warning').length
        };
    }

    // メインテスト実行
    async runAudit() {
        console.log('🚀 SMS美容室管理システム - パフォーマンス監査開始');
        
        // ページ別テスト
        const pagesToTest = [
            { name: 'メインページ', url: '/' },
            { name: 'ダッシュボード', url: '/dashboard.html' },
            { name: '顧客管理', url: '/customers.html' },
            { name: 'メッセージ', url: '/messages.html' },
            { name: '予約管理', url: '/appointments.html' },
            { name: 'サービス管理', url: '/services.html' },
            { name: '設定', url: '/settings.html' }
        ];

        for (const page of pagesToTest) {
            await this.testPagePerformance(page.name, page.url);
        }

        // 静的リソース分析
        console.log('📁 静的リソース分析中...');
        this.results.staticResources = this.analyzeStaticResources();

        // レコメンデーション生成
        console.log('📋 レコメンデーション生成中...');
        this.generateRecommendations();

        // サマリー生成
        this.generateSummary();

        console.log('✅ パフォーマンス監査完了');
        return this.results;
    }

    // 結果をファイルに保存
    saveResults(outputPath = '/Users/leadfive/Desktop/system/017_SMS/tests/performance_results.json') {
        fs.writeFileSync(outputPath, JSON.stringify(this.results, null, 2));
        console.log(`📄 結果をファイルに保存: ${outputPath}`);
    }

    // 結果を人間が読みやすい形式で出力
    printReadableResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 SMS美容室管理システム - パフォーマンス監査結果');
        console.log('='.repeat(60));
        
        console.log(`\n🏆 総合パフォーマンススコア: ${this.results.summary.performanceScore}/100`);
        console.log(`⚡ 平均レスポンス時間: ${this.results.summary.averageResponseTime}ms`);
        console.log(`✅ 成功率: ${this.results.summary.successRate}%`);
        console.log(`⚠️  警告数: ${this.results.summary.warningCount}`);
        
        console.log('\n📋 ページ別パフォーマンス:');
        Object.keys(this.results.pages).forEach(pageName => {
            const page = this.results.pages[pageName];
            const status = page.http.success ? '✅' : '❌';
            console.log(`  ${status} ${pageName}: ${Math.round(page.http.responseTime)}ms`);
        });

        if (this.results.recommendations.length > 0) {
            console.log('\n🚀 改善推奨事項:');
            this.results.recommendations.forEach((rec, index) => {
                const icon = rec.type === 'warning' ? '⚠️ ' : 'ℹ️ ';
                console.log(`  ${index + 1}. ${icon}${rec.recommendation} (${rec.value || ''})`);
            });
        }

        console.log('\n' + '='.repeat(60));
    }
}

// メイン実行
async function main() {
    const auditor = new PerformanceAuditor();
    
    try {
        const results = await auditor.runAudit();
        auditor.printReadableResults();
        auditor.saveResults();
        
        // 終了コードを設定（スコアが80未満の場合は警告）
        process.exit(results.summary.performanceScore < 80 ? 1 : 0);
    } catch (error) {
        console.error('❌ パフォーマンス監査でエラーが発生しました:', error);
        process.exit(1);
    }
}

// スクリプトが直接実行された場合
if (require.main === module) {
    main();
}

module.exports = PerformanceAuditor;