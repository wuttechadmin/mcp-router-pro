const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

/**
 * Advanced Metrics and Monitoring Module for MCP Router
 * Provides real-time metrics collection, health checks, and monitoring dashboard
 */

class MetricsCollector extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            enabled: options.enabled !== false,
            collectInterval: options.collectInterval || 5000, // 5 seconds
            retentionPeriod: options.retentionPeriod || 24 * 60 * 60 * 1000, // 24 hours
            maxDataPoints: options.maxDataPoints || 1000,
            enableDisk: options.enableDisk !== false,
            enableNetwork: options.enableNetwork !== false,
            enableCustom: options.enableCustom !== false
        };

        // Metrics storage
        this.metrics = {
            system: {
                cpu: [],
                memory: [],
                disk: [],
                network: []
            },
            application: {
                requests: [],
                responses: [],
                errors: [],
                latency: [],
                connections: []
            },
            mcp: {
                tools: [],
                jsonrpc: [],
                websockets: [],
                servers: []
            },
            custom: new Map()
        };

        // Counters and gauges
        this.counters = {
            totalRequests: 0,
            totalErrors: 0,
            totalToolCalls: 0,
            totalJsonRpcRequests: 0,
            totalWsConnections: 0,
            totalWsMessages: 0
        };

        this.gauges = {
            currentConnections: 0,
            currentWsConnections: 0,
            memoryUsage: 0,
            cpuUsage: 0
        };

        // Health status
        this.healthStatus = {
            status: 'healthy',
            checks: {},
            lastCheck: new Date(),
            uptime: 0
        };

        // Alerts
        this.alerts = [];
        this.alertThresholds = {
            memoryUsage: 0.9, // 90%
            cpuUsage: 0.8,    // 80%
            errorRate: 0.1,   // 10%
            responseTime: 5000 // 5 seconds
        };

        if (this.config.enabled) {
            this.startCollection();
        }
    }

    /**
     * Start metrics collection
     */
    startCollection() {
        this.collectionInterval = setInterval(() => {
            this.collectMetrics();
        }, this.config.collectInterval);

        console.log('📊 Metrics collection started');
    }

    /**
     * Stop metrics collection
     */
    stopCollection() {
        if (this.collectionInterval) {
            clearInterval(this.collectionInterval);
            this.collectionInterval = null;
        }
        console.log('📊 Metrics collection stopped');
    }

    /**
     * Collect all metrics
     */
    collectMetrics() {
        const timestamp = Date.now();

        try {
            // System metrics
            this.collectSystemMetrics(timestamp);
            
            // Application metrics
            this.collectApplicationMetrics(timestamp);
            
            // MCP metrics
            this.collectMcpMetrics(timestamp);
            
            // Health checks
            this.performHealthChecks();
            
            // Check alerts
            this.checkAlerts();
            
            // Cleanup old data
            this.cleanupOldData();

            this.emit('metrics-collected', {
                timestamp,
                metrics: this.getSnapshot()
            });

        } catch (error) {
            console.error('❌ Error collecting metrics:', error.message);
        }
    }

    /**
     * Collect system metrics
     */
    collectSystemMetrics(timestamp) {
        // Memory usage
        const memUsage = process.memoryUsage();
        const totalMemory = require('os').totalmem();
        const memoryUsagePercent = memUsage.rss / totalMemory;

        this.addMetric('system', 'memory', {
            timestamp,
            rss: memUsage.rss,
            heapTotal: memUsage.heapTotal,
            heapUsed: memUsage.heapUsed,
            external: memUsage.external,
            arrayBuffers: memUsage.arrayBuffers,
            usage: memoryUsagePercent
        });

        this.gauges.memoryUsage = memoryUsagePercent;

        // CPU usage (approximate)
        const cpuUsage = process.cpuUsage();
        this.addMetric('system', 'cpu', {
            timestamp,
            user: cpuUsage.user,
            system: cpuUsage.system,
            usage: (cpuUsage.user + cpuUsage.system) / 1000000 // Convert to seconds
        });

        // Disk usage (if enabled)
        if (this.config.enableDisk) {
            try {
                const stats = fs.statSync('/app');
                this.addMetric('system', 'disk', {
                    timestamp,
                    accessible: true,
                    directory: '/app'
                });
            } catch (error) {
                this.addMetric('system', 'disk', {
                    timestamp,
                    accessible: false,
                    error: error.message
                });
            }
        }
    }

    /**
     * Collect application metrics
     */
    collectApplicationMetrics(timestamp) {
        // Process info
        this.addMetric('application', 'process', {
            timestamp,
            pid: process.pid,
            uptime: process.uptime(),
            version: process.version,
            platform: process.platform
        });

        // Current connections
        this.addMetric('application', 'connections', {
            timestamp,
            current: this.gauges.currentConnections,
            websockets: this.gauges.currentWsConnections
        });
    }

    /**
     * Collect MCP-specific metrics
     */
    collectMcpMetrics(timestamp) {
        // Tool metrics
        this.addMetric('mcp', 'tools', {
            timestamp,
            totalCalls: this.counters.totalToolCalls,
            registered: this.counters.registeredTools || 0
        });

        // JSON-RPC metrics
        this.addMetric('mcp', 'jsonrpc', {
            timestamp,
            totalRequests: this.counters.totalJsonRpcRequests
        });

        // WebSocket metrics
        this.addMetric('mcp', 'websockets', {
            timestamp,
            totalConnections: this.counters.totalWsConnections,
            currentConnections: this.gauges.currentWsConnections,
            totalMessages: this.counters.totalWsMessages
        });
    }

    /**
     * Add a metric data point
     */
    addMetric(category, type, data) {
        if (!this.metrics[category]) {
            this.metrics[category] = {};
        }
        if (!this.metrics[category][type]) {
            this.metrics[category][type] = [];
        }

        this.metrics[category][type].push(data);

        // Maintain max data points
        if (this.metrics[category][type].length > this.config.maxDataPoints) {
            this.metrics[category][type] = this.metrics[category][type].slice(-this.config.maxDataPoints);
        }
    }

    /**
     * Record request metrics
     */
    recordRequest(method, url, statusCode, responseTime, error = null) {
        const timestamp = Date.now();
        
        this.counters.totalRequests++;
        if (error || statusCode >= 400) {
            this.counters.totalErrors++;
        }

        this.addMetric('application', 'requests', {
            timestamp,
            method,
            url,
            statusCode,
            responseTime,
            error: error?.message || null
        });

        this.addMetric('application', 'latency', {
            timestamp,
            responseTime
        });

        // Update gauges
        this.gauges.currentConnections = this.counters.totalRequests;
    }

    /**
     * Record tool execution
     */
    recordToolExecution(toolName, success, duration, error = null) {
        const timestamp = Date.now();
        
        this.counters.totalToolCalls++;

        this.addMetric('mcp', 'tool-execution', {
            timestamp,
            toolName,
            success,
            duration,
            error: error?.message || null
        });
    }

    /**
     * Record WebSocket activity
     */
    recordWebSocketActivity(event, connectionCount = null) {
        const timestamp = Date.now();

        switch (event) {
            case 'connection':
                this.counters.totalWsConnections++;
                if (connectionCount !== null) {
                    this.gauges.currentWsConnections = connectionCount;
                }
                break;
            case 'disconnection':
                if (connectionCount !== null) {
                    this.gauges.currentWsConnections = connectionCount;
                }
                break;
            case 'message':
                this.counters.totalWsMessages++;
                break;
        }

        this.addMetric('mcp', 'websocket-activity', {
            timestamp,
            event,
            currentConnections: this.gauges.currentWsConnections
        });
    }

    /**
     * Perform health checks
     */
    performHealthChecks() {
        const checks = {};
        let overallStatus = 'healthy';

        // Memory check
        const memoryThreshold = this.alertThresholds.memoryUsage;
        checks.memory = {
            status: this.gauges.memoryUsage < memoryThreshold ? 'healthy' : 'unhealthy',
            value: this.gauges.memoryUsage,
            threshold: memoryThreshold,
            message: this.gauges.memoryUsage < memoryThreshold 
                ? 'Memory usage within limits' 
                : `High memory usage: ${(this.gauges.memoryUsage * 100).toFixed(1)}%`
        };

        // Error rate check
        const errorRate = this.counters.totalRequests > 0 
            ? this.counters.totalErrors / this.counters.totalRequests 
            : 0;
        
        checks.errorRate = {
            status: errorRate < this.alertThresholds.errorRate ? 'healthy' : 'unhealthy',
            value: errorRate,
            threshold: this.alertThresholds.errorRate,
            message: errorRate < this.alertThresholds.errorRate
                ? 'Error rate within limits'
                : `High error rate: ${(errorRate * 100).toFixed(1)}%`
        };

        // Disk check
        checks.disk = {
            status: fs.existsSync('/app') ? 'healthy' : 'unhealthy',
            message: fs.existsSync('/app') ? 'Disk accessible' : 'Disk access issues'
        };

        // Process check
        checks.process = {
            status: 'healthy',
            uptime: process.uptime(),
            message: `Process running for ${Math.round(process.uptime())} seconds`
        };

        // Determine overall status
        for (const check of Object.values(checks)) {
            if (check.status === 'unhealthy') {
                overallStatus = 'unhealthy';
                break;
            }
        }

        this.healthStatus = {
            status: overallStatus,
            checks,
            lastCheck: new Date(),
            uptime: process.uptime()
        };
    }

    /**
     * Check for alert conditions
     */
    checkAlerts() {
        const alerts = [];

        // Memory alert
        if (this.gauges.memoryUsage > this.alertThresholds.memoryUsage) {
            alerts.push({
                type: 'memory',
                severity: 'warning',
                message: `High memory usage: ${(this.gauges.memoryUsage * 100).toFixed(1)}%`,
                value: this.gauges.memoryUsage,
                threshold: this.alertThresholds.memoryUsage,
                timestamp: new Date()
            });
        }

        // Error rate alert
        const errorRate = this.counters.totalRequests > 0 
            ? this.counters.totalErrors / this.counters.totalRequests 
            : 0;

        if (errorRate > this.alertThresholds.errorRate) {
            alerts.push({
                type: 'error_rate',
                severity: 'critical',
                message: `High error rate: ${(errorRate * 100).toFixed(1)}%`,
                value: errorRate,
                threshold: this.alertThresholds.errorRate,
                timestamp: new Date()
            });
        }

        // Add new alerts
        for (const alert of alerts) {
            // Check if we already have this alert recently
            const recentAlert = this.alerts.find(a => 
                a.type === alert.type && 
                (Date.now() - a.timestamp.getTime()) < 300000 // 5 minutes
            );

            if (!recentAlert) {
                this.alerts.push(alert);
                this.emit('alert', alert);
            }
        }

        // Cleanup old alerts (keep last 100)
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(-100);
        }
    }

    /**
     * Clean up old data
     */
    cleanupOldData() {
        const cutoff = Date.now() - this.config.retentionPeriod;

        for (const category of Object.values(this.metrics)) {
            for (const type of Object.values(category)) {
                if (Array.isArray(type)) {
                    // Remove old data points
                    const filtered = type.filter(item => item.timestamp > cutoff);
                    type.length = 0;
                    type.push(...filtered);
                }
            }
        }
    }

    /**
     * Get current metrics snapshot
     */
    getSnapshot() {
        return {
            timestamp: Date.now(),
            counters: { ...this.counters },
            gauges: { ...this.gauges },
            health: { ...this.healthStatus },
            alerts: this.alerts.slice(-10), // Last 10 alerts
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: process.version,
                platform: process.platform
            }
        };
    }

    /**
     * Get historical metrics
     */
    getHistoricalMetrics(category, type, timeRange = 3600000) { // 1 hour default
        const cutoff = Date.now() - timeRange;
        
        if (!this.metrics[category] || !this.metrics[category][type]) {
            return [];
        }

        return this.metrics[category][type].filter(item => item.timestamp > cutoff);
    }

    /**
     * Get aggregated metrics
     */
    getAggregatedMetrics(category, type, timeRange = 3600000) {
        const data = this.getHistoricalMetrics(category, type, timeRange);
        
        if (data.length === 0) {
            return null;
        }

        // Calculate basic statistics
        let sum = 0;
        let min = Infinity;
        let max = -Infinity;
        let count = data.length;

        for (const item of data) {
            const value = typeof item.value === 'number' ? item.value : 0;
            sum += value;
            min = Math.min(min, value);
            max = Math.max(max, value);
        }

        return {
            count,
            sum,
            average: sum / count,
            min,
            max,
            timeRange,
            startTime: data[0].timestamp,
            endTime: data[data.length - 1].timestamp
        };
    }

    /**
     * Export metrics to file
     */
    exportMetrics(filename) {
        try {
            const data = {
                exported: new Date().toISOString(),
                snapshot: this.getSnapshot(),
                metrics: this.metrics
            };

            fs.writeFileSync(filename, JSON.stringify(data, null, 2));
            console.log(`📊 Metrics exported to ${filename}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to export metrics: ${error.message}`);
            return false;
        }
    }

    /**
     * Set custom metric
     */
    setCustomMetric(name, value, tags = {}) {
        const timestamp = Date.now();
        
        if (!this.metrics.custom.has(name)) {
            this.metrics.custom.set(name, []);
        }

        this.metrics.custom.get(name).push({
            timestamp,
            value,
            tags
        });

        // Maintain max data points
        const data = this.metrics.custom.get(name);
        if (data.length > this.config.maxDataPoints) {
            this.metrics.custom.set(name, data.slice(-this.config.maxDataPoints));
        }
    }

    /**
     * Get Prometheus-style metrics
     */
    getPrometheusMetrics() {
        const metrics = [];
        const snapshot = this.getSnapshot();

        // Counters
        metrics.push(`# HELP mcp_requests_total Total number of HTTP requests`);
        metrics.push(`# TYPE mcp_requests_total counter`);
        metrics.push(`mcp_requests_total ${snapshot.counters.totalRequests}`);

        metrics.push(`# HELP mcp_errors_total Total number of errors`);
        metrics.push(`# TYPE mcp_errors_total counter`);
        metrics.push(`mcp_errors_total ${snapshot.counters.totalErrors}`);

        metrics.push(`# HELP mcp_tool_calls_total Total number of tool calls`);
        metrics.push(`# TYPE mcp_tool_calls_total counter`);
        metrics.push(`mcp_tool_calls_total ${snapshot.counters.totalToolCalls}`);

        // Gauges
        metrics.push(`# HELP mcp_memory_usage Memory usage ratio`);
        metrics.push(`# TYPE mcp_memory_usage gauge`);
        metrics.push(`mcp_memory_usage ${snapshot.gauges.memoryUsage}`);

        metrics.push(`# HELP mcp_connections_current Current number of connections`);
        metrics.push(`# TYPE mcp_connections_current gauge`);
        metrics.push(`mcp_connections_current ${snapshot.gauges.currentConnections}`);

        metrics.push(`# HELP mcp_websocket_connections Current WebSocket connections`);
        metrics.push(`# TYPE mcp_websocket_connections gauge`);
        metrics.push(`mcp_websocket_connections ${snapshot.gauges.currentWsConnections}`);

        return metrics.join('\n');
    }
}

module.exports = { MetricsCollector };
