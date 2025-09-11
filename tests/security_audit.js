// SMS美容室管理システム - セキュリティ監査スクリプト
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SecurityAuditor {
    constructor() {
        this.baseUrl = 'http://localhost:3001';
        this.results = {
            timestamp: new Date().toISOString(),
            httpHeaders: {},
            vulnerabilities: [],
            codeAnalysis: {},
            dependencies: {},
            summary: {},
            recommendations: []
        };
    }

    // HTTPセキュリティヘッダーをチェック
    async checkSecurityHeaders(url = this.baseUrl) {
        console.log('🔒 HTTPセキュリティヘッダーをチェック中...');
        
        try {
            const response = await fetch(url);
            const headers = {};
            
            // セキュリティ関連ヘッダーを収集
            const securityHeaders = [
                'content-security-policy',
                'strict-transport-security',
                'x-frame-options',
                'x-content-type-options',
                'x-xss-protection',
                'referrer-policy',
                'permissions-policy',
                'cross-origin-embedder-policy',
                'cross-origin-opener-policy',
                'cross-origin-resource-policy'
            ];

            securityHeaders.forEach(header => {
                headers[header] = {
                    present: response.headers.has(header),
                    value: response.headers.get(header) || null
                };
            });

            this.results.httpHeaders = headers;
            this.analyzeSecurityHeaders();
            
        } catch (error) {
            console.error('HTTPヘッダーチェックエラー:', error.message);
            this.results.vulnerabilities.push({
                type: 'connection',
                severity: 'high',
                issue: 'Unable to connect to server',
                description: error.message
            });
        }
    }

    // セキュリティヘッダーを分析
    analyzeSecurityHeaders() {
        const headers = this.results.httpHeaders;
        
        // Content Security Policy チェック
        if (!headers['content-security-policy']?.present) {
            this.results.vulnerabilities.push({
                type: 'header',
                severity: 'high',
                issue: 'Missing Content-Security-Policy header',
                description: 'CSPヘッダーがありません。XSS攻撃のリスクがあります。',
                recommendation: "Content-Security-Policy ヘッダーを追加してください"
            });
        }

        // HSTS チェック
        if (!headers['strict-transport-security']?.present) {
            this.results.vulnerabilities.push({
                type: 'header',
                severity: 'medium',
                issue: 'Missing Strict-Transport-Security header',
                description: 'HSTSヘッダーがありません。',
                recommendation: "Strict-Transport-Security ヘッダーを追加してください"
            });
        }

        // X-Frame-Options チェック
        if (!headers['x-frame-options']?.present) {
            this.results.vulnerabilities.push({
                type: 'header',
                severity: 'medium',
                issue: 'Missing X-Frame-Options header',
                description: 'クリックジャッキング攻撃の可能性があります。',
                recommendation: "X-Frame-Options ヘッダーを追加してください"
            });
        }

        // X-Content-Type-Options チェック
        if (!headers['x-content-type-options']?.present) {
            this.results.vulnerabilities.push({
                type: 'header',
                severity: 'low',
                issue: 'Missing X-Content-Type-Options header',
                description: 'MIMEタイプスニッフィング攻撃の可能性があります。',
                recommendation: "X-Content-Type-Options: nosniff ヘッダーを追加してください"
            });
        }
    }

    // ソースコードの脆弱性をチェック
    analyzeSourceCode() {
        console.log('📝 ソースコードの脆弱性をチェック中...');
        
        const frontendDir = '/Users/leadfive/Desktop/system/017_SMS/app/frontend';
        const vulnerabilities = [];

        try {
            // JavaScriptファイルをチェック
            this.checkJavaScriptVulnerabilities(frontendDir, vulnerabilities);
            
            // HTMLファイルをチェック
            this.checkHTMLVulnerabilities(frontendDir, vulnerabilities);
            
            this.results.codeAnalysis = {
                scannedFiles: 0,
                vulnerabilities: vulnerabilities
            };
            
            this.results.vulnerabilities.push(...vulnerabilities);
            
        } catch (error) {
            console.error('ソースコード分析エラー:', error.message);
        }
    }

    // JavaScript脆弱性チェック
    checkJavaScriptVulnerabilities(dir, vulnerabilities) {
        const jsFiles = this.findFiles(dir, '.js');
        
        jsFiles.forEach(filePath => {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                
                // eval() の使用をチェック
                if (content.includes('eval(')) {
                    vulnerabilities.push({
                        type: 'code',
                        severity: 'high',
                        issue: 'Use of eval() function',
                        file: filePath,
                        description: 'eval()関数の使用はコードインジェクション攻撃のリスクがあります。',
                        recommendation: 'eval()の使用を避け、安全な代替手段を使用してください'
                    });
                }

                // innerHTML の危険な使用をチェック
                if (content.match(/innerHTML\s*=\s*[^"'][^;]*[^"']/)) {
                    vulnerabilities.push({
                        type: 'code',
                        severity: 'medium',
                        issue: 'Potential XSS via innerHTML',
                        file: filePath,
                        description: 'innerHTMLの使用でXSS攻撃の可能性があります。',
                        recommendation: 'textContentやsetAttributeを使用するか、値をサニタイズしてください'
                    });
                }

                // document.write の使用をチェック
                if (content.includes('document.write')) {
                    vulnerabilities.push({
                        type: 'code',
                        severity: 'medium',
                        issue: 'Use of document.write',
                        file: filePath,
                        description: 'document.writeの使用はセキュリティリスクがあります。',
                        recommendation: 'DOM操作の安全な方法を使用してください'
                    });
                }

                // ハードコードされたAPIキーやパスワードをチェック
                const secretPatterns = [
                    /password\s*[=:]\s*["'][^"']+["']/i,
                    /api[_-]?key\s*[=:]\s*["'][^"']+["']/i,
                    /secret\s*[=:]\s*["'][^"']+["']/i,
                    /token\s*[=:]\s*["'][^"']+["']/i
                ];

                secretPatterns.forEach(pattern => {
                    if (pattern.test(content)) {
                        vulnerabilities.push({
                            type: 'code',
                            severity: 'high',
                            issue: 'Hardcoded secrets detected',
                            file: filePath,
                            description: 'ハードコードされた機密情報が検出されました。',
                            recommendation: '機密情報は環境変数や設定ファイルで管理してください'
                        });
                    }
                });

            } catch (error) {
                console.error(`Error reading ${filePath}:`, error.message);
            }
        });
    }

    // HTML脆弱性チェック
    checkHTMLVulnerabilities(dir, vulnerabilities) {
        const htmlFiles = this.findFiles(dir, '.html');
        
        htmlFiles.forEach(filePath => {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                
                // インラインJavaScriptのチェック
                if (content.includes('<script>') && !content.includes('nonce=')) {
                    vulnerabilities.push({
                        type: 'code',
                        severity: 'medium',
                        issue: 'Inline JavaScript without nonce',
                        file: filePath,
                        description: 'nonceなしのインラインJavaScriptが検出されました。',
                        recommendation: 'CSP nonceを使用するか、外部ファイルに移動してください'
                    });
                }

                // target="_blank" without rel="noopener" チェック
                if (content.includes('target="_blank"') && !content.includes('rel="noopener"')) {
                    vulnerabilities.push({
                        type: 'code',
                        severity: 'low',
                        issue: 'target="_blank" without rel="noopener"',
                        file: filePath,
                        description: 'target="_blank"にrel="noopener"がありません。',
                        recommendation: 'rel="noopener noreferrer"を追加してください'
                    });
                }

            } catch (error) {
                console.error(`Error reading ${filePath}:`, error.message);
            }
        });
    }

    // 依存関係の脆弱性をチェック
    checkDependencyVulnerabilities() {
        console.log('📦 依存関係の脆弱性をチェック中...');
        
        try {
            const packageJsonPath = '/Users/leadfive/Desktop/system/017_SMS/package.json';
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                
                // 古いバージョンやセキュリティ問題のある依存関係をチェック
                const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
                
                this.results.dependencies = {
                    total: Object.keys(dependencies).length,
                    packages: dependencies,
                    vulnerabilities: []
                };

                // 特に注意すべき古いパッケージ
                const riskPackages = {
                    'lodash': '4.17.20',
                    'axios': '0.21.0',
                    'express': '4.16.0'
                };

                Object.entries(dependencies).forEach(([pkg, version]) => {
                    if (riskPackages[pkg]) {
                        // バージョン比較は簡単に実装（本格的には semver を使用）
                        if (version.replace(/[^0-9.]/g, '') < riskPackages[pkg]) {
                            this.results.vulnerabilities.push({
                                type: 'dependency',
                                severity: 'medium',
                                issue: `Outdated package: ${pkg}`,
                                description: `${pkg} パッケージが古いバージョンです。`,
                                recommendation: `${pkg} を最新バージョンにアップデートしてください`
                            });
                        }
                    }
                });
                
            }
        } catch (error) {
            console.error('依存関係チェックエラー:', error.message);
        }
    }

    // ファイル検索ヘルパー
    findFiles(dir, extension) {
        const files = [];
        
        function walk(currentDir) {
            try {
                const items = fs.readdirSync(currentDir);
                items.forEach(item => {
                    const itemPath = path.join(currentDir, item);
                    const stat = fs.statSync(itemPath);
                    
                    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                        walk(itemPath);
                    } else if (stat.isFile() && item.endsWith(extension)) {
                        files.push(itemPath);
                    }
                });
            } catch (error) {
                // ディレクトリ読み込みエラーは無視
            }
        }
        
        walk(dir);
        return files;
    }

    // 推奨事項を生成
    generateRecommendations() {
        const recommendations = [];
        
        // 脆弱性の重要度別に推奨事項を生成
        const highVulns = this.results.vulnerabilities.filter(v => v.severity === 'high');
        const mediumVulns = this.results.vulnerabilities.filter(v => v.severity === 'medium');
        const lowVulns = this.results.vulnerabilities.filter(v => v.severity === 'low');

        if (highVulns.length > 0) {
            recommendations.push({
                priority: 'critical',
                title: '高危険度の脆弱性を即座に修正',
                description: `${highVulns.length}件の高危険度脆弱性が発見されました`,
                actions: highVulns.map(v => v.recommendation)
            });
        }

        if (mediumVulns.length > 0) {
            recommendations.push({
                priority: 'high',
                title: '中危険度の脆弱性を修正',
                description: `${mediumVulns.length}件の中危険度脆弱性が発見されました`,
                actions: mediumVulns.slice(0, 3).map(v => v.recommendation)
            });
        }

        if (lowVulns.length > 0) {
            recommendations.push({
                priority: 'medium',
                title: '低危険度の問題を改善',
                description: `${lowVulns.length}件の改善可能な問題があります`,
                actions: ['セキュリティベストプラクティスの適用を検討してください']
            });
        }

        // セキュリティヘッダーの問題
        const headerIssues = this.results.vulnerabilities.filter(v => v.type === 'header');
        if (headerIssues.length > 0) {
            recommendations.push({
                priority: 'high',
                title: 'セキュリティヘッダーの設定',
                description: 'HTTPセキュリティヘッダーが不足しています',
                actions: ['Express.jsでhelmetミドルウェアの導入を推奨']
            });
        }

        this.results.recommendations = recommendations;
    }

    // セキュリティスコアを計算
    calculateSecurityScore() {
        let score = 100;
        
        this.results.vulnerabilities.forEach(vuln => {
            switch (vuln.severity) {
                case 'high':
                    score -= 20;
                    break;
                case 'medium':
                    score -= 10;
                    break;
                case 'low':
                    score -= 5;
                    break;
            }
        });

        return Math.max(0, score);
    }

    // サマリー生成
    generateSummary() {
        const vulns = this.results.vulnerabilities;
        
        this.results.summary = {
            securityScore: this.calculateSecurityScore(),
            totalVulnerabilities: vulns.length,
            highSeverity: vulns.filter(v => v.severity === 'high').length,
            mediumSeverity: vulns.filter(v => v.severity === 'medium').length,
            lowSeverity: vulns.filter(v => v.severity === 'low').length,
            categories: {
                headers: vulns.filter(v => v.type === 'header').length,
                code: vulns.filter(v => v.type === 'code').length,
                dependencies: vulns.filter(v => v.type === 'dependency').length
            }
        };
    }

    // メイン監査実行
    async runAudit() {
        console.log('🛡️  SMS美容室管理システム - セキュリティ監査開始');
        
        await this.checkSecurityHeaders();
        this.analyzeSourceCode();
        this.checkDependencyVulnerabilities();
        this.generateRecommendations();
        this.generateSummary();
        
        console.log('✅ セキュリティ監査完了');
        return this.results;
    }

    // 結果を保存
    saveResults(outputPath = '/Users/leadfive/Desktop/system/017_SMS/tests/security_results.json') {
        fs.writeFileSync(outputPath, JSON.stringify(this.results, null, 2));
        console.log(`📄 結果をファイルに保存: ${outputPath}`);
    }

    // 結果を人間が読みやすい形式で出力
    printReadableResults() {
        console.log('\n' + '='.repeat(60));
        console.log('🛡️  SMS美容室管理システム - セキュリティ監査結果');
        console.log('='.repeat(60));
        
        const summary = this.results.summary;
        console.log(`\n🏆 セキュリティスコア: ${summary.securityScore}/100`);
        console.log(`⚠️  総脆弱性数: ${summary.totalVulnerabilities}`);
        console.log(`🔴 高危険度: ${summary.highSeverity}`);
        console.log(`🟡 中危険度: ${summary.mediumSeverity}`);
        console.log(`🟢 低危険度: ${summary.lowSeverity}`);
        
        if (this.results.vulnerabilities.length > 0) {
            console.log('\n📋 発見された脆弱性:');
            this.results.vulnerabilities.forEach((vuln, index) => {
                const severityIcon = vuln.severity === 'high' ? '🔴' : 
                                   vuln.severity === 'medium' ? '🟡' : '🟢';
                console.log(`  ${index + 1}. ${severityIcon} ${vuln.issue}`);
                console.log(`     ${vuln.description}`);
                if (vuln.file) {
                    console.log(`     ファイル: ${path.basename(vuln.file)}`);
                }
            });
        }

        if (this.results.recommendations.length > 0) {
            console.log('\n🚀 推奨事項:');
            this.results.recommendations.forEach((rec, index) => {
                const priorityIcon = rec.priority === 'critical' ? '🚨' : 
                                   rec.priority === 'high' ? '⚠️ ' : 'ℹ️ ';
                console.log(`  ${index + 1}. ${priorityIcon}${rec.title}`);
                console.log(`     ${rec.description}`);
            });
        }

        console.log('\n' + '='.repeat(60));
    }
}

// メイン実行
async function main() {
    const auditor = new SecurityAuditor();
    
    try {
        const results = await auditor.runAudit();
        auditor.printReadableResults();
        auditor.saveResults();
        
        // 高危険度の脆弱性がある場合は警告終了コード
        process.exit(results.summary.highSeverity > 0 ? 1 : 0);
    } catch (error) {
        console.error('❌ セキュリティ監査でエラーが発生しました:', error);
        process.exit(1);
    }
}

// スクリプトが直接実行された場合
if (require.main === module) {
    main();
}

module.exports = SecurityAuditor;