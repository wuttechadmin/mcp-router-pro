const http = require('http');
const fs = require('fs');
const path = require('path');

// Import our enhanced modules
const { RealToolExecutor } = require('./mcp-real-tools');
const { SecurityManager } = require('./mcp-security');
const { ConfigManager } = require('./mcp-config');
const { MetricsCollector } = require('./mcp-metrics');
const { EnhancedWebSocketHandler } = require('./mcp-websocket-enhanced');

/**
 * Production-Ready MCP Router with Enhanced Features
 * Version 3.0.0 - Full Production Implementation
 */

class MCPRouterPro {
    constructor() {
        console.log('🚀 MCP Router Pro v3.0.0 starting...');
        console.log(`Process PID: ${process.pid}`);
        console.log(`Node.js version: ${process.version}`);
        console.log(`Platform: ${process.platform} (${process.arch})`);

        // Initialize configuration
        this.config = new ConfigManager();
        
        // Initialize security
        this.security = new SecurityManager({
            requireApiKey: this.config.getConfigValue('security.requireApiKey'),
            maxRequestsPerMinute: this.config.getConfigValue('security.maxRequestsPerMinute'),
            maxRequestsPerHour: this.config.getConfigValue('security.maxRequestsPerHour'),
            maxPayloadSize: this.config.getConfigValue('security.maxPayloadSize'),
            allowedOrigins: this.config.getConfigValue('security.allowedOrigins'),
            adminKey: process.env.MCP_ADMIN_KEY
        });

        // Initialize metrics
        this.metrics = new MetricsCollector({
            enabled: this.config.getConfigValue('monitoring.enabled'),
            collectInterval: this.config.getConfigValue('monitoring.healthCheckInterval')
        });

        // Initialize real tools
        this.toolExecutor = new RealToolExecutor({
            workingDir: this.config.getConfigValue('tools.workingDir'),
            timeout: this.config.getConfigValue('tools.timeout'),
            maxOutputSize: this.config.getConfigValue('tools.maxOutputSize'),
            allowedCommands: this.config.getConfigValue('tools.allowedCommands')
        });

        // Initialize enhanced WebSocket handler
        this.wsHandler = new EnhancedWebSocketHandler({
            maxConnections: this.config.getConfigValue('websocket.maxConnections'),
            pingInterval: this.config.getConfigValue('websocket.pingInterval'),
            requireAuth: this.config.getConfigValue('security.requireApiKey'),
            allowedOrigins: this.config.getConfigValue('security.allowedOrigins'),
            authHandler: (message, connection) => this.authenticateWebSocket(message, connection)
        });

        // MCP data structures
        this.mcpData = {
            tools: new Map(),
            servers: new Map(),
            clients: new Map(),
            stats: {
                totalRequests: 0,
                toolCalls: 0,
                serverRegistrations: 0,
                jsonRpcRequests: 0,
                wsConnections: 0,
                wsMessages: 0,
                errors: 0,
                startTime: new Date()
            }
        };

        // Request counter
        this.requestCount = 0;

        // Setup logging
        this.setupLogging();

        // Setup WebSocket message handlers
        this.setupWebSocketHandlers();

        // Setup metrics event handlers
        this.setupMetricsHandlers();

        // Initialize server
        this.setupServer();

        // Setup cleanup handlers
        this.setupCleanupHandlers();
    }

    /**
     * Setup logging with configurable levels and outputs
     */
    setupLogging() {
        const logLevel = this.config.getConfigValue('logging.level', 'info');
        const enableFile = this.config.getConfigValue('logging.enableFile', false);
        const enableConsole = this.config.getConfigValue('logging.enableConsole', true);
        const logDir = this.config.getConfigValue('logging.logDir', '/app/logs');

        this.logFile = null;
        if (enableFile) {
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            this.logFile = path.join(logDir, 'mcp-router-pro.log');
        }

        this.logLevel = logLevel;
        this.enableConsole = enableConsole;
        this.enableFile = enableFile;
    }

    /**
     * Enhanced logging function with levels
     */
    log(level, message, ...args) {
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        const currentLevel = levels[this.logLevel] || 1;
        const messageLevel = levels[level] || 1;

        if (messageLevel < currentLevel) return;

        const timestamp = new Date().toISOString();
        const levelEmoji = { debug: '🔍', info: '📋', warn: '⚠️', error: '❌' };
        const logMessage = `[${timestamp}] ${levelEmoji[level] || '📋'} ${message}`;

        // Console logging
        if (this.enableConsole) {
            console.log(logMessage, ...args);
        }

        // File logging
        if (this.enableFile && this.logFile) {
            try {
                const fileMessage = args.length > 0 
                    ? `${logMessage} ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')}`
                    : logMessage;
                fs.appendFileSync(this.logFile, fileMessage + '\n');
            } catch (err) {
                console.error('Failed to write to log file:', err.message);
            }
        }
    }

    /**
     * Setup WebSocket message handlers
     */
    setupWebSocketHandlers() {
        // Tool execution via WebSocket
        this.wsHandler.onMessage('execute_tool', async (data, connection) => {
            const { toolName, arguments: args } = data;
            
            if (!toolName) {
                throw new Error('Tool name is required');
            }

            // Record metrics
            const startTime = Date.now();
            
            try {
                const result = await this.toolExecutor.executeTool(toolName, args);
                const duration = Date.now() - startTime;
                
                this.metrics.recordToolExecution(toolName, !result.isError, duration);
                this.mcpData.stats.toolCalls++;

                // Broadcast to subscribers
                this.wsHandler.broadcastToRoom('tool-executions', {
                    type: 'tool-executed',
                    toolName,
                    success: !result.isError,
                    duration,
                    timestamp: new Date().toISOString()
                });

                return {
                    type: 'tool-result',
                    toolName,
                    result,
                    duration,
                    timestamp: new Date().toISOString()
                };
                
            } catch (error) {
                const duration = Date.now() - startTime;
                this.metrics.recordToolExecution(toolName, false, duration, error);
                this.mcpData.stats.errors++;
                throw error;
            }
        });

        // Real-time metrics subscription
        this.wsHandler.onMessage('subscribe_metrics', async (data, connection) => {
            this.wsHandler.joinRoom(connection.id, 'metrics');
            return {
                type: 'metrics-subscribed',
                message: 'Subscribed to real-time metrics',
                timestamp: new Date().toISOString()
            };
        });

        // API key management via WebSocket (admin only)
        this.wsHandler.onMessage('manage_api_key', async (data, connection) => {
            // Check if user has admin permissions
            if (!connection.user || !connection.user.permissions.includes('admin')) {
                throw new Error('Admin permissions required');
            }

            const { action, keyName, permissions } = data;
            
            switch (action) {
                case 'create':
                    const key = this.security.createApiKey(keyName, permissions);
                    return {
                        type: 'api-key-created',
                        keyName,
                        key,
                        timestamp: new Date().toISOString()
                    };
                    
                case 'list':
                    return {
                        type: 'api-keys-list',
                        keys: this.security.listApiKeys(),
                        timestamp: new Date().toISOString()
                    };
                    
                case 'revoke':
                    const success = this.security.revokeApiKey(data.key);
                    return {
                        type: 'api-key-revoked',
                        success,
                        timestamp: new Date().toISOString()
                    };
                    
                default:
                    throw new Error(`Unknown API key action: ${action}`);
            }
        });
    }

    /**
     * Setup metrics event handlers
     */
    setupMetricsHandlers() {
        // Broadcast metrics to WebSocket subscribers
        this.metrics.on('metrics-collected', (data) => {
            this.wsHandler.broadcastToRoom('metrics', {
                type: 'metrics-update',
                ...data
            });
        });

        // Handle alerts
        this.metrics.on('alert', (alert) => {
            this.log('warn', 'Metrics alert:', alert);
            
            // Broadcast alert to WebSocket subscribers
            this.wsHandler.broadcast({
                type: 'alert',
                alert,
                timestamp: new Date().toISOString()
            }, (connection) => connection.user && connection.user.permissions.includes('admin'));
        });
    }

    /**
     * Authenticate WebSocket connection
     */
    async authenticateWebSocket(message, connection) {
        const { apiKey } = message;
        
        if (!apiKey) {
            return { authenticated: false, error: 'API key required' };
        }

        const validation = this.security.validateApiKey(apiKey, 'read');
        if (!validation.valid) {
            return { authenticated: false, error: validation.error };
        }

        return {
            authenticated: true,
            user: {
                name: validation.keyData.name,
                permissions: validation.keyData.permissions,
                apiKey
            }
        };
    }

    /**
     * Setup HTTP server
     */
    setupServer() {
        this.server = http.createServer(async (req, res) => {
            const startTime = Date.now();
            this.requestCount++;
            this.mcpData.stats.totalRequests++;

            // Extract pathname for route checking
            const url = new URL(req.url, `http://${req.headers.host}`);
            const pathname = url.pathname;

            // Skip authentication for health endpoint (for container health probes)
            let authResult;
            if (pathname === '/health') {
                authResult = { allowed: true, clientIp: req.connection.remoteAddress || 'unknown' };
            } else {
                // Authentication and security check for all other endpoints
                authResult = this.security.authenticate(req);
                if (!authResult.allowed) {
                    this.handleSecurityRejection(res, authResult);
                    const duration = Date.now() - startTime;
                    this.metrics.recordRequest(req.method, req.url, authResult.status, duration, new Error(authResult.error));
                    return;
                }
            }

            try {
                this.log('debug', `${req.method} ${req.url} from ${authResult.clientIp} (Request #${this.requestCount})`);

                // Handle different routes
                const handled = await this.handleRequest(req, res, authResult);
                
                if (!handled) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Not found' }));
                }

                const duration = Date.now() - startTime;
                this.metrics.recordRequest(req.method, req.url, res.statusCode, duration);
                
            } catch (error) {
                this.log('error', 'Request handling error:', error);
                this.mcpData.stats.errors++;
                
                const duration = Date.now() - startTime;
                this.metrics.recordRequest(req.method, req.url, 500, duration, error);
                
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            }
        });

        // Handle WebSocket upgrades
        this.server.on('upgrade', (req, socket, head) => {
            if (req.url === '/ws') {
                this.wsHandler.handleUpgrade(req, socket, head);
            } else {
                socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
            }
        });

        // Start server
        const port = this.config.getConfigValue('server.port', 3001);
        const host = this.config.getConfigValue('server.host', '0.0.0.0');
        
        this.server.listen(port, host, () => {
            this.log('info', `✅ MCP Router Pro listening on ${host}:${port}`);
            this.log('info', `🔌 WebSocket server ready at ws://${host}:${port}/ws`);
            this.log('info', `📊 Metrics available at http://${host}:${port}/metrics`);
            this.log('info', `🔐 Admin API Key: ${this.security.config.adminKey}`);
            
            // Register sample tools
            this.registerSampleTools();
        });
    }

    /**
     * Handle security rejection
     */
    handleSecurityRejection(res, authResult) {
        const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        };

        if (authResult.retryAfter) {
            headers['Retry-After'] = Math.ceil(authResult.retryAfter);
        }

        res.writeHead(authResult.status, headers);
        res.end(JSON.stringify({
            error: authResult.error,
            retryAfter: authResult.retryAfter
        }));

        this.log('warn', `Security rejection: ${authResult.error}`);
    }

    /**
     * Handle HTTP requests
     */
    async handleRequest(req, res, authResult) {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return true;
        }

        // JSON-RPC endpoints
        if (req.url.startsWith('/api/mcp/') && req.method === 'POST') {
            await this.handleJSONRPC(req, res);
            return true;
        }

        // Set JSON content type for API endpoints
        res.setHeader('Content-Type', 'application/json');

        // Route handling - extract pathname without query parameters
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;
        
        switch (pathname) {
            case '/health':
                return this.handleHealthCheck(res);
                
            case '/api/tools':
                return this.handleToolsList(res);
                
            case '/api/stats':
                return this.handleStats(res);
                
            case '/metrics':
                return this.handleMetrics(res);
                
            case '/metrics/prometheus':
                return this.handlePrometheusMetrics(res);
                
            case '/api/security/stats':
                return this.handleSecurityStats(res, authResult);
                
            case '/config':
                if (this.hasAdminPermission(authResult)) {
                    return this.handleConfigEndpoint(req, res);
                } else {
                    res.writeHead(403);
                    res.end(JSON.stringify({ error: 'Admin permission required' }));
                    return true;
                }
                
            case '/admin/status':
                if (this.hasAdminPermission(authResult)) {
                    return this.handleAdminStatus(res);
                } else {
                    res.writeHead(403);
                    res.end(JSON.stringify({ error: 'Admin permission required' }));
                    return true;
                }
                
            case '/logs':
                if (this.enableFile && this.logFile) {
                    return this.handleLogsEndpoint(res);
                }
                return false;
                
            case '/':
                return this.handleRootEndpoint(res);
                
            default:
                return false;
        }
    }

    /**
     * Check if request has admin permission
     */
    hasAdminPermission(authResult) {
        return authResult.keyData && authResult.keyData.permissions.includes('*');
    }

    /**
     * Handle health check
     */
    handleHealthCheck(res) {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '3.0.0',
            requests: this.requestCount,
            metrics: this.metrics.getSnapshot(),
            mcp: {
                tools: this.mcpData.tools.size,
                servers: this.mcpData.servers.size,
                clients: this.mcpData.clients.size,
                websockets: this.wsHandler.connections.size,
                stats: this.mcpData.stats
            },
            security: this.security.getStats(),
            websocket: this.wsHandler.getStats()
        };

        res.writeHead(200);
        res.end(JSON.stringify(health, null, 2));
        this.log('debug', 'Health check responded');
        return true;
    }

    /**
     * Handle tools list
     */
    handleToolsList(res) {
        const tools = Array.from(this.mcpData.tools.values());
        
        res.writeHead(200);
        res.end(JSON.stringify({
            tools: tools,
            count: tools.length,
            timestamp: new Date().toISOString()
        }, null, 2));
        
        this.log('debug', `Tools endpoint responded with ${tools.length} tools`);
        return true;
    }

    /**
     * Handle stats endpoint
     */
    handleStats(res) {
        const stats = {
            ...this.mcpData.stats,
            websockets: this.wsHandler.connections.size,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            metrics: this.metrics.getSnapshot()
        };

        res.writeHead(200);
        res.end(JSON.stringify(stats, null, 2));
        this.log('debug', 'Stats endpoint responded');
        return true;
    }

    /**
     * Handle metrics endpoint
     */
    handleMetrics(res) {
        const metrics = this.metrics.getSnapshot();
        
        res.writeHead(200);
        res.end(JSON.stringify(metrics, null, 2));
        return true;
    }

    /**
     * Handle Prometheus metrics
     */
    handlePrometheusMetrics(res) {
        const prometheusMetrics = this.metrics.getPrometheusMetrics();
        
        res.setHeader('Content-Type', 'text/plain');
        res.writeHead(200);
        res.end(prometheusMetrics);
        return true;
    }

    /**
     * Handle security stats
     */
    handleSecurityStats(res, authResult) {
        const stats = this.security.getStats();
        
        res.writeHead(200);
        res.end(JSON.stringify(stats, null, 2));
        return true;
    }

    /**
     * Handle configuration endpoint
     */
    handleConfigEndpoint(req, res) {
        if (req.method === 'GET') {
            res.writeHead(200);
            res.end(JSON.stringify(this.config.getConfig(), null, 2));
        } else if (req.method === 'POST') {
            // Handle config updates
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const updates = JSON.parse(body);
                    // Apply configuration updates
                    let success = true;
                    const results = {};
                    
                    for (const [path, value] of Object.entries(updates)) {
                        results[path] = this.config.updateConfig(path, value);
                        if (!results[path]) success = false;
                    }
                    
                    res.writeHead(success ? 200 : 400);
                    res.end(JSON.stringify({ success, results }));
                } catch (error) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
        }
        return true;
    }

    /**
     * Handle admin status endpoint
     */
    handleAdminStatus(res) {
        const adminStatus = {
            status: 'admin-authenticated',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '3.0.0',
            environment: process.env.NODE_ENV || 'development',
            pid: process.pid,
            nodeVersion: process.version,
            platform: `${process.platform} (${process.arch})`,
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            requests: this.requestCount,
            
            // Administrative insights
            admin: {
                securityEnabled: this.security.config.requireApiKey,
                metricsEnabled: this.metrics.config.enabled,
                logLevel: this.config.getConfigValue('logging.level'),
                maxPayloadSize: this.config.getConfigValue('security.maxPayloadSize'),
                allowedOrigins: this.config.getConfigValue('security.allowedOrigins'),
                rateLimits: {
                    perMinute: this.config.getConfigValue('security.maxRequestsPerMinute'),
                    perHour: this.config.getConfigValue('security.maxRequestsPerHour')
                }
            },
            
            // Current service metrics
            services: {
                mcp: {
                    tools: this.mcpData.tools.size,
                    servers: this.mcpData.servers.size,
                    clients: this.mcpData.clients.size,
                    websockets: this.wsHandler.connections.size,
                    stats: this.mcpData.stats
                },
                security: this.security.getStats(),
                websocket: this.wsHandler.getStats(),
                metrics: this.metrics.getSnapshot()
            },
            
            // Health status
            health: {
                healthy: true,
                checks: {
                    memory: process.memoryUsage().heapUsed < (process.memoryUsage().heapTotal * 0.9),
                    uptime: process.uptime() > 0,
                    websockets: this.wsHandler.connections.size >= 0,
                    tools: this.mcpData.tools.size >= 0
                }
            }
        };

        res.writeHead(200);
        res.end(JSON.stringify(adminStatus, null, 2));
        this.log('info', 'Admin status endpoint accessed');
        return true;
    }

    /**
     * Handle logs endpoint
     */
    handleLogsEndpoint(res) {
        try {
            const logs = fs.readFileSync(this.logFile, 'utf8').split('\n').slice(-100).join('\n');
            res.writeHead(200);
            res.end(JSON.stringify({
                logs: logs,
                logFile: this.logFile,
                timestamp: new Date().toISOString()
            }));
            this.log('debug', 'Logs endpoint accessed');
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Could not read logs', message: err.message }));
        }
        return true;
    }

    /**
     * Handle root endpoint
     */
    handleRootEndpoint(res) {
        const endpoints = [
            'GET /health - Health check with comprehensive stats',
            'GET /api/tools - List all registered tools',
            'GET /api/stats - Get MCP router statistics',
            'GET /metrics - Get metrics snapshot',
            'GET /metrics/prometheus - Get Prometheus format metrics',
            'GET /api/security/stats - Get security statistics',
            'POST /api/mcp/* - JSON-RPC MCP protocol endpoints',
            'WebSocket /ws - Real-time MCP communication',
            'GET /config - Configuration management (admin)',
            'POST /config - Update configuration (admin)',
            'GET /admin/status - Administrative status and insights (admin)'
        ];

        if (this.enableFile) {
            endpoints.push('GET /logs - View recent log entries');
        }

        const info = {
            name: 'MCP Router Pro',
            version: '3.0.0',
            status: 'Production Ready',
            port: this.config.getConfigValue('server.port'),
            uptime: process.uptime(),
            requests: this.requestCount,
            features: [
                'Real Tool Execution',
                'Authentication & Authorization', 
                'Rate Limiting',
                'Advanced Metrics & Monitoring',
                'Enhanced WebSocket Communication',
                'Configuration Management',
                'Security Management',
                'Prometheus Integration',
                'Real-time Alerting'
            ],
            endpoints: endpoints,
            mcp: {
                tools: this.mcpData.tools.size,
                servers: this.mcpData.servers.size,
                clients: this.mcpData.clients.size,
                websockets: this.wsHandler.connections.size,
                stats: this.mcpData.stats
            },
            jsonrpc: {
                version: '2.0',
                methods: [
                    'tools/list - List all available tools',
                    'tools/call - Execute a tool',
                    'mcp/stats - Get MCP statistics',
                    'ping - Health check'
                ]
            },
            websocket: {
                endpoint: `ws://localhost:${this.config.getConfigValue('server.port')}/ws`,
                features: [
                    'Real-time tool execution',
                    'Metrics subscriptions',
                    'Room-based messaging',
                    'Authentication required',
                    'Admin API key management'
                ]
            },
            configuration: {
                security: {
                    requireApiKey: this.config.getConfigValue('security.requireApiKey'),
                    rateLimiting: true,
                    maxRequestsPerMinute: this.config.getConfigValue('security.maxRequestsPerMinute')
                },
                logging: {
                    level: this.logLevel,
                    fileLogging: this.enableFile,
                    consoleLogging: this.enableConsole
                },
                monitoring: {
                    enabled: this.config.getConfigValue('monitoring.enabled'),
                    metricsCollection: true,
                    alerting: true
                }
            }
        };

        res.writeHead(200);
        res.end(JSON.stringify(info, null, 2));
        this.log('debug', 'Root endpoint responded');
        return true;
    }

    /**
     * Handle JSON-RPC requests
     */
    async handleJSONRPC(req, res) {
        return new Promise((resolve) => {
            let body = '';
            
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                try {
                    this.mcpData.stats.jsonRpcRequests++;
                    const request = JSON.parse(body);
                    this.log('debug', `JSON-RPC request: ${request.method} (ID: ${request.id})`);
                    
                    const response = await this.processJSONRPCRequest(request);
                    
                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(JSON.stringify(response));
                    this.log('debug', `JSON-RPC response sent for method: ${request.method}`);
                    resolve();
                    
                } catch (error) {
                    this.log('error', 'JSON-RPC error:', error);
                    this.mcpData.stats.errors++;
                    
                    const errorResponse = {
                        jsonrpc: '2.0',
                        error: {
                            code: -32600,
                            message: 'Invalid Request',
                            data: error.message
                        },
                        id: null
                    };
                    
                    res.writeHead(400, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(JSON.stringify(errorResponse));
                    resolve();
                }
            });
        });
    }

    /**
     * Process JSON-RPC requests
     */
    async processJSONRPCRequest(request) {
        const { method, params, id } = request;
        
        try {
            let result;
            
            switch (method) {
                case 'tools/list':
                    result = { 
                        tools: Array.from(this.mcpData.tools.values()).map(tool => ({
                            name: tool.name,
                            description: tool.description,
                            inputSchema: {
                                type: 'object',
                                properties: {},
                                required: []
                            }
                        }))
                    };
                    break;
                    
                case 'tools/call':
                    if (!params || !params.name) {
                        throw new Error('Tool name is required');
                    }
                    
                    const tool = this.mcpData.tools.get(params.name);
                    if (!tool) {
                        throw new Error(`Tool '${params.name}' not found`);
                    }
                    
                    // Execute real tool
                    const startTime = Date.now();
                    const toolResult = await this.toolExecutor.executeTool(params.name, params.arguments || {});
                    const duration = Date.now() - startTime;
                    
                    // Update tool usage
                    tool.usageCount++;
                    tool.lastUsed = new Date();
                    this.mcpData.stats.toolCalls++;
                    
                    // Record metrics
                    this.metrics.recordToolExecution(params.name, !toolResult.isError, duration);
                    
                    // Broadcast to WebSocket clients
                    this.wsHandler.broadcastToRoom('tool-executions', {
                        type: 'tool_executed',
                        tool: params.name,
                        arguments: params.arguments || {},
                        success: !toolResult.isError,
                        duration,
                        timestamp: new Date().toISOString()
                    });
                    
                    result = toolResult;
                    this.log('info', `🔧 Executed tool: ${params.name} (${duration}ms)`);
                    break;
                    
                case 'mcp/stats':
                    result = {
                        servers: this.mcpData.servers.size,
                        tools: this.mcpData.tools.size,
                        clients: this.mcpData.clients.size,
                        websockets: this.wsHandler.connections.size,
                        stats: this.mcpData.stats,
                        uptime: process.uptime(),
                        metrics: this.metrics.getSnapshot()
                    };
                    break;
                    
                case 'ping':
                    result = { 
                        pong: new Date().toISOString(),
                        uptime: process.uptime(),
                        websockets: this.wsHandler.connections.size,
                        version: '3.0.0'
                    };
                    break;
                    
                default:
                    throw new Error(`Unknown method: ${method}`);
            }
            
            return {
                jsonrpc: '2.0',
                result,
                id
            };
            
        } catch (error) {
            this.log('error', 'JSON-RPC method error:', error);
            this.mcpData.stats.errors++;
            
            return {
                jsonrpc: '2.0',
                error: {
                    code: -32601,
                    message: 'Method not found',
                    data: error.message
                },
                id
            };
        }
    }

    /**
     * Register sample tools
     */
    registerSampleTools() {
        setTimeout(() => {
            this.log('info', '🔧 Registering sample tools...');
            
            const sampleTools = [
                { name: 'read_file', description: 'Read contents of a file', serverId: 'file-server' },
                { name: 'write_file', description: 'Write content to a file', serverId: 'file-server' },
                { name: 'list_directory', description: 'List directory contents', serverId: 'file-server' },
                { name: 'fetch_url', description: 'Fetch content from a URL', serverId: 'web-server' },
                { name: 'git_status', description: 'Get git repository status', serverId: 'git-server' },
                { name: 'docker_ps', description: 'List running containers', serverId: 'docker-server' },
                { name: 'search_files', description: 'Search for files by pattern', serverId: 'search-server' },
                { name: 'execute_command', description: 'Execute a shell command', serverId: 'system-server' },
                { name: 'sql_query', description: 'Execute SQL query', serverId: 'database-server' },
                { name: 'api_call', description: 'Make HTTP API call', serverId: 'http-server' }
            ];

            for (const toolConfig of sampleTools) {
                this.registerTool(toolConfig.name, toolConfig.description, toolConfig.serverId);
            }
            
            this.log('info', `✅ Registered ${this.mcpData.tools.size} sample tools`);
        }, 2000);
    }

    /**
     * Register tool
     */
    registerTool(name, description, serverId = 'default-server') {
        try {
            this.mcpData.tools.set(name, {
                name: name,
                description: description,
                serverId: serverId,
                registeredAt: new Date(),
                usageCount: 0,
                lastUsed: null
            });
            this.mcpData.stats.serverRegistrations++;
            this.log('debug', `🔧 Registered tool: ${name} for server: ${serverId}`);
            
            // Broadcast tool registration to WebSocket clients
            this.wsHandler.broadcast({
                type: 'tool_registered',
                tool: { name, description, serverId },
                timestamp: new Date().toISOString()
            });
            
            return true;
        } catch (error) {
            this.log('error', `Error registering tool ${name}:`, error);
            this.mcpData.stats.errors++;
            return false;
        }
    }

    /**
     * Setup cleanup handlers
     */
    setupCleanupHandlers() {
        const cleanup = () => {
            this.log('info', '🧹 Shutting down MCP Router Pro...');
            
            // Stop metrics collection
            this.metrics.stopCollection();
            
            // Close WebSocket handler
            this.wsHandler.destroy();
            
            // Close HTTP server
            if (this.server) {
                this.server.close();
            }
            
            // Stop configuration watching
            this.config.stopWatching();
            
            this.log('info', '✅ MCP Router Pro shutdown complete');
        };

        process.on('exit', cleanup);
        process.on('beforeExit', () => {
            this.log('warn', '⚠️ beforeExit event triggered');
            cleanup();
        });

        process.on('SIGTERM', () => {
            this.log('warn', '⚠️ Received SIGTERM, shutting down gracefully');
            cleanup();
            process.exit(0);
        });

        process.on('SIGINT', () => {
            this.log('warn', '⚠️ Received SIGINT, shutting down gracefully');
            cleanup();
            process.exit(0);
        });

        process.on('SIGHUP', () => {
            this.log('warn', '⚠️ Received SIGHUP');
        });

        process.on('SIGQUIT', () => {
            this.log('warn', '⚠️ Received SIGQUIT');
        });

        process.on('uncaughtException', (err) => {
            this.log('error', 'UNCAUGHT EXCEPTION:', err);
            this.mcpData.stats.errors++;
            // Don't exit on uncaught exceptions in production
        });

        process.on('unhandledRejection', (reason, promise) => {
            this.log('error', 'UNHANDLED REJECTION:', reason);
            this.mcpData.stats.errors++;
        });
    }
}

// Initialize and start the production MCP Router
const mcpRouter = new MCPRouterPro();

// Export for testing
module.exports = { MCPRouterPro };
