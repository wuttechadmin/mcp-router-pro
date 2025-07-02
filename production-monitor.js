#!/usr/bin/env node

/**
 * Production Monitoring and Health Check Script
 * Complete validation of MCP Router Pro deployment
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');

class ProductionMonitor {
    constructor(baseUrl = 'http://localhost:3003') {
        this.baseUrl = baseUrl;
        this.checks = [];
        this.results = {
            timestamp: new Date().toISOString(),
            status: 'unknown',
            passed: 0,
            failed: 0,
            warnings: 0,
            total: 0,
            uptime: 0,
            version: 'unknown',
            errors: []
        };
    }

    /**
     * HTTP request helper
     */
    async makeRequest(method, path, data = null, headers = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                timeout: 10000
            };

            const req = http.request(url, options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        resolve({
                            status: res.statusCode,
                            headers: res.headers,
                            data: body ? JSON.parse(body) : null,
                            responseTime: Date.now() - startTime
                        });
                    } catch (error) {
                        resolve({
                            status: res.statusCode,
                            headers: res.headers,
                            data: body,
                            responseTime: Date.now() - startTime
                        });
                    }
                });
            });

            const startTime = Date.now();
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }

    /**
     * Add a health check
     */
    addCheck(name, checkFn, level = 'critical') {
        this.checks.push({ name, checkFn, level });
    }

    /**
     * Run all health checks
     */
    async runHealthChecks() {
        console.log('🏥 MCP Router Pro - Production Health Check');
        console.log('=' .repeat(60));
        console.log(`Target: ${this.baseUrl}`);
        console.log(`Time: ${new Date().toLocaleString()}`);
        console.log();

        this.results.total = this.checks.length;

        for (const check of this.checks) {
            await this.runSingleCheck(check);
        }

        // Calculate overall status
        if (this.results.failed === 0) {
            this.results.status = this.results.warnings > 0 ? 'degraded' : 'healthy';
        } else {
            this.results.status = 'unhealthy';
        }

        this.printSummary();
        await this.saveResults();

        return this.results;
    }

    /**
     * Run a single check
     */
    async runSingleCheck(check) {
        process.stdout.write(`🔍 ${check.name.padEnd(40)} `);
        
        try {
            const result = await check.checkFn();
            
            if (result.status === 'pass') {
                console.log('✅ PASS');
                this.results.passed++;
                if (result.message) {
                    console.log(`    ${result.message}`);
                }
            } else if (result.status === 'warn') {
                console.log('⚠️  WARN');
                this.results.warnings++;
                if (result.message) {
                    console.log(`    ${result.message}`);
                }
            } else {
                console.log('❌ FAIL');
                this.results.failed++;
                if (result.message) {
                    console.log(`    ${result.message}`);
                }
                this.results.errors.push({ check: check.name, error: result.message });
            }
        } catch (error) {
            console.log('❌ ERROR');
            console.log(`    ${error.message}`);
            this.results.failed++;
            this.results.errors.push({ check: check.name, error: error.message });
        }
    }

    /**
     * Print summary
     */
    printSummary() {
        console.log();
        console.log('=' .repeat(60));
        console.log('📊 Health Check Summary');
        console.log('=' .repeat(60));
        console.log(`Overall Status: ${this.getStatusEmoji()} ${this.results.status.toUpperCase()}`);
        console.log(`Total Checks: ${this.results.total}`);
        console.log(`Passed: ${this.results.passed} ✅`);
        console.log(`Warnings: ${this.results.warnings} ⚠️`);
        console.log(`Failed: ${this.results.failed} ❌`);
        console.log(`Server Uptime: ${this.formatUptime(this.results.uptime)}`);
        console.log(`Server Version: ${this.results.version}`);

        if (this.results.errors.length > 0) {
            console.log();
            console.log('❌ Failed Checks:');
            this.results.errors.forEach(error => {
                console.log(`  • ${error.check}: ${error.error}`);
            });
        }

        console.log();
        console.log('🎯 Production Readiness Assessment:');
        if (this.results.status === 'healthy') {
            console.log('  ✅ System is production-ready');
        } else if (this.results.status === 'degraded') {
            console.log('  ⚠️  System has warnings but is operational');
        } else {
            console.log('  ❌ System has critical issues - not production-ready');
        }
    }

    /**
     * Get status emoji
     */
    getStatusEmoji() {
        switch (this.results.status) {
            case 'healthy': return '💚';
            case 'degraded': return '💛';
            case 'unhealthy': return '💔';
            default: return '❓';
        }
    }

    /**
     * Format uptime
     */
    formatUptime(seconds) {
        if (!seconds) return 'Unknown';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hours}h ${minutes}m ${secs}s`;
    }

    /**
     * Save results to file
     */
    async saveResults() {
        try {
            const filename = `health-check-${Date.now()}.json`;
            await fs.writeFile(filename, JSON.stringify(this.results, null, 2));
            console.log(`💾 Results saved to ${filename}`);
        } catch (error) {
            console.log(`⚠️  Could not save results: ${error.message}`);
        }
    }

    /**
     * Setup standard production health checks
     */
    setupStandardChecks() {
        // Basic connectivity
        this.addCheck('Server Connectivity', async () => {
            try {
                const response = await this.makeRequest('GET', '/health');
                if (response.status === 200) {
                    this.results.uptime = response.data.uptime || 0;
                    this.results.version = response.data.version || 'unknown';
                    return { status: 'pass', message: `Response time: ${response.responseTime}ms` };
                }
                return { status: 'fail', message: `HTTP ${response.status}` };
            } catch (error) {
                return { status: 'fail', message: error.message };
            }
        });

        // Health endpoint validation
        this.addCheck('Health Endpoint', async () => {
            const response = await this.makeRequest('GET', '/health');
            if (response.status !== 200) {
                return { status: 'fail', message: `HTTP ${response.status}` };
            }
            if (response.data.status !== 'healthy') {
                return { status: 'fail', message: `Status: ${response.data.status}` };
            }
            return { status: 'pass', message: 'Health check passed' };
        });

        // API endpoints
        this.addCheck('API Tools Endpoint', async () => {
            const response = await this.makeRequest('GET', '/api/tools');
            if (response.status !== 200) {
                return { status: 'fail', message: `HTTP ${response.status}` };
            }
            if (!Array.isArray(response.data.tools)) {
                return { status: 'fail', message: 'Invalid tools response' };
            }
            return { status: 'pass', message: `${response.data.tools.length} tools available` };
        });

        this.addCheck('API Stats Endpoint', async () => {
            const response = await this.makeRequest('GET', '/api/stats');
            if (response.status !== 200) {
                return { status: 'fail', message: `HTTP ${response.status}` };
            }
            if (response.data.totalRequests === undefined) {
                return { status: 'fail', message: 'Invalid stats response' };
            }
            return { status: 'pass', message: `${response.data.totalRequests} total requests processed` };
        });

        // JSON-RPC protocol
        this.addCheck('JSON-RPC Protocol', async () => {
            const payload = {
                jsonrpc: '2.0',
                method: 'ping',
                id: 'health-check-ping'
            };
            const response = await this.makeRequest('POST', '/api/mcp/jsonrpc', payload);
            if (response.status !== 200) {
                return { status: 'fail', message: `HTTP ${response.status}` };
            }
            if (!response.data.result || !response.data.result.pong) {
                return { status: 'fail', message: 'Invalid JSON-RPC response' };
            }
            return { status: 'pass', message: 'JSON-RPC ping successful' };
        });

        // Tool listing
        this.addCheck('Tool Registry', async () => {
            const payload = {
                jsonrpc: '2.0',
                method: 'tools/list',
                id: 'health-check-tools'
            };
            const response = await this.makeRequest('POST', '/api/mcp/jsonrpc', payload);
            if (response.status !== 200) {
                return { status: 'fail', message: `HTTP ${response.status}` };
            }
            if (!response.data.result || !Array.isArray(response.data.result.tools)) {
                return { status: 'fail', message: 'Invalid tools list response' };
            }
            const toolCount = response.data.result.tools.length;
            if (toolCount === 0) {
                return { status: 'warn', message: 'No tools registered' };
            }
            return { status: 'pass', message: `${toolCount} tools registered` };
        });

        // Tool execution test
        this.addCheck('Tool Execution', async () => {
            const payload = {
                jsonrpc: '2.0',
                method: 'tools/call',
                params: {
                    name: 'list_directory',
                    arguments: { path: '.' }
                },
                id: 'health-check-tool-exec'
            };
            const response = await this.makeRequest('POST', '/api/mcp/jsonrpc', payload);
            if (response.status !== 200) {
                return { status: 'fail', message: `HTTP ${response.status}` };
            }
            if (response.data.error) {
                return { status: 'fail', message: response.data.error.message };
            }
            if (!response.data.result || !response.data.result.content) {
                return { status: 'fail', message: 'Invalid tool execution response' };
            }
            return { status: 'pass', message: 'Tool execution successful' };
        });

        // Performance check
        this.addCheck('Response Performance', async () => {
            const startTime = Date.now();
            const response = await this.makeRequest('GET', '/health');
            const responseTime = Date.now() - startTime;
            
            if (response.status !== 200) {
                return { status: 'fail', message: `HTTP ${response.status}` };
            }
            
            if (responseTime > 1000) {
                return { status: 'warn', message: `Slow response: ${responseTime}ms` };
            } else if (responseTime > 500) {
                return { status: 'warn', message: `Response time: ${responseTime}ms` };
            }
            
            return { status: 'pass', message: `Fast response: ${responseTime}ms` };
        });

        // Memory usage check
        this.addCheck('Memory Usage', async () => {
            const response = await this.makeRequest('GET', '/health');
            if (response.status !== 200) {
                return { status: 'fail', message: `HTTP ${response.status}` };
            }
            
            // Get memory info if available in metrics
            if (response.data.metrics && response.data.metrics.system) {
                const memoryMB = Math.round(response.data.metrics.system.memoryUsage / 1024 / 1024);
                if (memoryMB > 500) {
                    return { status: 'warn', message: `High memory usage: ${memoryMB}MB` };
                }
                return { status: 'pass', message: `Memory usage: ${memoryMB}MB` };
            }
            
            return { status: 'pass', message: 'Memory check not available' };
        });

        // WebSocket availability
        this.addCheck('WebSocket Endpoint', async () => {
            try {
                const response = await this.makeRequest('GET', '/ws', null, {
                    'Connection': 'Upgrade',
                    'Upgrade': 'websocket',
                    'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
                    'Sec-WebSocket-Version': '13'
                });
                
                // Should get upgrade response or proper WebSocket error
                if (response.status === 101 || response.status === 400 || response.status === 426) {
                    return { status: 'pass', message: 'WebSocket endpoint available' };
                }
                
                return { status: 'warn', message: `Unexpected status: ${response.status}` };
            } catch (error) {
                return { status: 'warn', message: error.message };
            }
        });
    }
}

// CLI interface
if (require.main === module) {
    const monitor = new ProductionMonitor();
    
    // Setup checks
    monitor.setupStandardChecks();
    
    // Add custom checks from command line args
    const args = process.argv.slice(2);
    if (args.includes('--extended')) {
        console.log('🔬 Running extended health checks...');
        
        // Add extended checks here
        monitor.addCheck('Load Test Sample', async () => {
            const requests = 10;
            const promises = Array(requests).fill().map(() => 
                monitor.makeRequest('GET', '/health')
            );
            
            const responses = await Promise.all(promises);
            const successful = responses.filter(r => r.status === 200).length;
            
            if (successful < requests) {
                return { status: 'fail', message: `${requests - successful} requests failed` };
            }
            
            const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / requests;
            return { status: 'pass', message: `${requests} concurrent requests, avg ${avgResponseTime.toFixed(0)}ms` };
        });
    }
    
    // Run health checks
    monitor.runHealthChecks()
        .then(results => {
            const exitCode = results.status === 'unhealthy' ? 1 : 0;
            console.log(`\n🎯 Exiting with code ${exitCode}`);
            process.exit(exitCode);
        })
        .catch(error => {
            console.error('❌ Health check failed:', error);
            process.exit(1);
        });
}

module.exports = { ProductionMonitor };
