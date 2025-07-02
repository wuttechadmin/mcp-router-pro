/**
 * Load Testing and Performance Analysis for MCP Router Pro
 * Comprehensive stress testing with detailed metrics
 */

const http = require('http');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs').promises;
const path = require('path');

class LoadTestRunner {
    constructor(baseUrl = 'http://localhost:3003') {
        this.baseUrl = baseUrl;
        this.results = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            responseTimes: [],
            errorsByType: {},
            throughput: 0,
            avgResponseTime: 0,
            minResponseTime: Infinity,
            maxResponseTime: 0,
            percentiles: {},
            startTime: null,
            endTime: null
        };
    }

    /**
     * HTTP request helper with timing
     */
    async makeTimedRequest(method, path, data = null, headers = {}) {
        const startTime = Date.now();
        
        return new Promise((resolve) => {
            const url = new URL(path, this.baseUrl);
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                timeout: 10000 // 10 second timeout
            };

            const req = http.request(url, options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    const endTime = Date.now();
                    const responseTime = endTime - startTime;
                    
                    resolve({
                        status: res.statusCode,
                        responseTime,
                        success: res.statusCode < 400,
                        error: null,
                        size: Buffer.byteLength(body)
                    });
                });
            });

            req.on('error', (error) => {
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                
                resolve({
                    status: 0,
                    responseTime,
                    success: false,
                    error: error.message,
                    size: 0
                });
            });

            req.on('timeout', () => {
                req.destroy();
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                
                resolve({
                    status: 0,
                    responseTime,
                    success: false,
                    error: 'Request timeout',
                    size: 0
                });
            });

            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }

    /**
     * Run concurrent requests using worker threads
     */
    async runConcurrentLoad(scenario) {
        const { concurrent, requests, endpoint, method = 'GET', payload = null } = scenario;
        
        console.log(`🚀 Running load test: ${concurrent} concurrent users, ${requests} requests each`);
        console.log(`📍 Endpoint: ${method} ${endpoint}`);
        
        this.results.startTime = Date.now();
        
        // Create worker promises
        const workerPromises = [];
        const requestsPerWorker = Math.ceil(requests / concurrent);
        
        for (let i = 0; i < concurrent; i++) {
            const workerPromise = new Promise((resolve, reject) => {
                const worker = new Worker(__filename, {
                    workerData: {
                        baseUrl: this.baseUrl,
                        endpoint,
                        method,
                        payload,
                        requests: requestsPerWorker
                    }
                });
                
                worker.on('message', resolve);
                worker.on('error', reject);
                worker.on('exit', (code) => {
                    if (code !== 0) {
                        reject(new Error(`Worker stopped with exit code ${code}`));
                    }
                });
            });
            
            workerPromises.push(workerPromise);
        }
        
        // Wait for all workers to complete
        const workerResults = await Promise.all(workerPromises);
        
        this.results.endTime = Date.now();
        
        // Aggregate results
        this.aggregateResults(workerResults);
        
        return this.results;
    }

    /**
     * Aggregate results from all workers
     */
    aggregateResults(workerResults) {
        let allResponseTimes = [];
        
        for (const result of workerResults) {
            this.results.totalRequests += result.totalRequests;
            this.results.successfulRequests += result.successfulRequests;
            this.results.failedRequests += result.failedRequests;
            allResponseTimes = allResponseTimes.concat(result.responseTimes);
            
            // Aggregate errors
            for (const [errorType, count] of Object.entries(result.errorsByType)) {
                this.results.errorsByType[errorType] = (this.results.errorsByType[errorType] || 0) + count;
            }
        }
        
        // Calculate metrics
        const duration = this.results.endTime - this.results.startTime;
        this.results.throughput = (this.results.totalRequests / duration) * 1000; // requests per second
        
        if (allResponseTimes.length > 0) {
            this.results.responseTimes = allResponseTimes;
            this.results.avgResponseTime = allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length;
            this.results.minResponseTime = Math.min(...allResponseTimes);
            this.results.maxResponseTime = Math.max(...allResponseTimes);
            
            // Calculate percentiles
            const sorted = allResponseTimes.sort((a, b) => a - b);
            this.results.percentiles = {
                p50: this.getPercentile(sorted, 50),
                p75: this.getPercentile(sorted, 75),
                p90: this.getPercentile(sorted, 90),
                p95: this.getPercentile(sorted, 95),
                p99: this.getPercentile(sorted, 99)
            };
        }
    }

    /**
     * Calculate percentile value
     */
    getPercentile(sortedArray, percentile) {
        const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
        return sortedArray[index];
    }

    /**
     * Run predefined load test scenarios
     */
    async runLoadTestSuites() {
        console.log('🔥 Starting MCP Router Pro Load Testing Suite');
        console.log('=' .repeat(60));

        const scenarios = [
            {
                name: 'Light Load - Health Check',
                concurrent: 5,
                requests: 100,
                endpoint: '/health',
                method: 'GET'
            },
            {
                name: 'Medium Load - API Tools',
                concurrent: 10,
                requests: 500,
                endpoint: '/api/tools',
                method: 'GET'
            },
            {
                name: 'Heavy Load - JSON-RPC Ping',
                concurrent: 20,
                requests: 1000,
                endpoint: '/api/mcp/jsonrpc',
                method: 'POST',
                payload: {
                    jsonrpc: '2.0',
                    method: 'ping',
                    id: 'load-test-ping'
                }
            },
            {
                name: 'Stress Test - JSON-RPC Tools List',
                concurrent: 50,
                requests: 2000,
                endpoint: '/api/mcp/jsonrpc',
                method: 'POST',
                payload: {
                    jsonrpc: '2.0',
                    method: 'tools/list',
                    id: 'load-test-tools'
                }
            }
        ];

        const allResults = [];

        for (const scenario of scenarios) {
            console.log(`\n🎯 Running scenario: ${scenario.name}`);
            console.log('-'.repeat(40));
            
            try {
                const results = await this.runConcurrentLoad(scenario);
                results.scenarioName = scenario.name;
                allResults.push(results);
                
                this.printScenarioResults(results);
                
                // Reset results for next scenario
                this.results = {
                    totalRequests: 0,
                    successfulRequests: 0,
                    failedRequests: 0,
                    responseTimes: [],
                    errorsByType: {},
                    throughput: 0,
                    avgResponseTime: 0,
                    minResponseTime: Infinity,
                    maxResponseTime: 0,
                    percentiles: {},
                    startTime: null,
                    endTime: null
                };
                
                // Brief pause between scenarios
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.log(`❌ Scenario failed: ${error.message}`);
            }
        }

        // Save comprehensive results
        await this.saveLoadTestResults(allResults);
        
        return allResults;
    }

    /**
     * Print scenario results
     */
    printScenarioResults(results) {
        const duration = results.endTime - results.startTime;
        const successRate = (results.successfulRequests / results.totalRequests) * 100;
        
        console.log(`📊 Results:`);
        console.log(`   Total Requests: ${results.totalRequests}`);
        console.log(`   Successful: ${results.successfulRequests} (${successRate.toFixed(2)}%)`);
        console.log(`   Failed: ${results.failedRequests}`);
        console.log(`   Duration: ${duration}ms`);
        console.log(`   Throughput: ${results.throughput.toFixed(2)} req/sec`);
        console.log(`   Avg Response Time: ${results.avgResponseTime.toFixed(2)}ms`);
        console.log(`   Min Response Time: ${results.minResponseTime}ms`);
        console.log(`   Max Response Time: ${results.maxResponseTime}ms`);
        
        if (results.percentiles.p50) {
            console.log(`   Response Time Percentiles:`);
            console.log(`     50th: ${results.percentiles.p50}ms`);
            console.log(`     75th: ${results.percentiles.p75}ms`);
            console.log(`     90th: ${results.percentiles.p90}ms`);
            console.log(`     95th: ${results.percentiles.p95}ms`);
            console.log(`     99th: ${results.percentiles.p99}ms`);
        }
        
        if (Object.keys(results.errorsByType).length > 0) {
            console.log(`   Errors by Type:`);
            for (const [errorType, count] of Object.entries(results.errorsByType)) {
                console.log(`     ${errorType}: ${count}`);
            }
        }
    }

    /**
     * Save load test results
     */
    async saveLoadTestResults(allResults) {
        const report = {
            timestamp: new Date().toISOString(),
            totalScenarios: allResults.length,
            scenarios: allResults,
            summary: {
                totalRequests: allResults.reduce((sum, r) => sum + r.totalRequests, 0),
                totalSuccessful: allResults.reduce((sum, r) => sum + r.successfulRequests, 0),
                totalFailed: allResults.reduce((sum, r) => sum + r.failedRequests, 0),
                avgThroughput: allResults.reduce((sum, r) => sum + r.throughput, 0) / allResults.length
            }
        };

        try {
            await fs.writeFile(
                path.join(__dirname, 'load-test-results.json'),
                JSON.stringify(report, null, 2)
            );
            console.log('\n💾 Load test results saved to load-test-results.json');
        } catch (error) {
            console.log(`⚠️  Could not save load test results: ${error.message}`);
        }
    }
}

// Worker thread logic
if (!isMainThread) {
    (async () => {
        const { baseUrl, endpoint, method, payload, requests } = workerData;
        
        const results = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            responseTimes: [],
            errorsByType: {}
        };
        
        // Make requests
        for (let i = 0; i < requests; i++) {
            const startTime = Date.now();
            
            try {
                const url = new URL(endpoint, baseUrl);
                const options = {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 5000
                };

                const result = await new Promise((resolve) => {
                    const req = http.request(url, options, (res) => {
                        let body = '';
                        res.on('data', chunk => body += chunk);
                        res.on('end', () => {
                            const endTime = Date.now();
                            resolve({
                                status: res.statusCode,
                                responseTime: endTime - startTime,
                                success: res.statusCode < 400
                            });
                        });
                    });

                    req.on('error', (error) => {
                        const endTime = Date.now();
                        resolve({
                            status: 0,
                            responseTime: endTime - startTime,
                            success: false,
                            error: error.message
                        });
                    });

                    req.on('timeout', () => {
                        req.destroy();
                        const endTime = Date.now();
                        resolve({
                            status: 0,
                            responseTime: endTime - startTime,
                            success: false,
                            error: 'timeout'
                        });
                    });

                    if (payload) {
                        req.write(JSON.stringify(payload));
                    }
                    req.end();
                });

                results.totalRequests++;
                results.responseTimes.push(result.responseTime);
                
                if (result.success) {
                    results.successfulRequests++;
                } else {
                    results.failedRequests++;
                    const errorType = result.error || `HTTP ${result.status}`;
                    results.errorsByType[errorType] = (results.errorsByType[errorType] || 0) + 1;
                }
                
            } catch (error) {
                results.totalRequests++;
                results.failedRequests++;
                const errorType = error.message || 'Unknown error';
                results.errorsByType[errorType] = (results.errorsByType[errorType] || 0) + 1;
                results.responseTimes.push(Date.now() - startTime);
            }
        }
        
        parentPort.postMessage(results);
    })();
}

// Run load tests if called directly
if (require.main === module && isMainThread) {
    const loadTester = new LoadTestRunner();
    loadTester.runLoadTestSuites()
        .then(() => {
            console.log('\n✅ Load testing completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('Load testing failed:', error);
            process.exit(1);
        });
}

module.exports = { LoadTestRunner };
