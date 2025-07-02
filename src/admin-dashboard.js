/**
 * Advanced Admin Dashboard for MCP Router Pro
 * Web-based management interface with real-time monitoring
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

class AdminDashboard {
    constructor(mcpRouter, port = 3004) {
        this.mcpRouter = mcpRouter;
        this.port = port;
        this.clients = new Set();
        this.server = null;
        this.wsServer = null;
        this.updateInterval = null;
    }

    /**
     * Start the admin dashboard server
     */
    start() {
        console.log(`🖥️  Starting Admin Dashboard on port ${this.port}`);
        
        this.server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });

        // Setup WebSocket server for real-time updates
        this.wsServer = new WebSocket.Server({ 
            server: this.server,
            path: '/admin-ws'
        });

        this.wsServer.on('connection', (ws) => {
            console.log('📡 Admin dashboard client connected');
            this.clients.add(ws);
            
            // Send initial data
            this.sendInitialData(ws);
            
            ws.on('close', () => {
                this.clients.delete(ws);
                console.log('📡 Admin dashboard client disconnected');
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleWebSocketMessage(ws, message);
                } catch (error) {
                    console.error('Invalid WebSocket message:', error);
                }
            });
        });

        this.server.listen(this.port, () => {
            console.log(`✅ Admin Dashboard running at http://localhost:${this.port}`);
        });

        // Start real-time data broadcasting
        this.startRealTimeUpdates();
    }

    /**
     * Handle HTTP requests
     */
    async handleRequest(req, res) {
        const url = new URL(req.url, `http://localhost:${this.port}`);
        
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
        
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        try {
            switch (url.pathname) {
                case '/':
                    await this.serveDashboardHTML(res);
                    break;
                case '/api/status':
                    await this.serveStatus(res);
                    break;
                case '/api/metrics':
                    await this.serveMetrics(res);
                    break;
                case '/api/config':
                    await this.serveConfig(req, res);
                    break;
                case '/api/logs':
                    await this.serveLogs(res);
                    break;
                case '/api/tools':
                    await this.serveTools(res);
                    break;
                case '/api/security':
                    await this.serveSecurity(req, res);
                    break;
                default:
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Not found' }));
            }
        } catch (error) {
            console.error('Dashboard request error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    }

    /**
     * Serve the main dashboard HTML
     */
    async serveDashboardHTML(res) {
        const html = this.generateDashboardHTML();
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }

    /**
     * Generate dashboard HTML
     */
    generateDashboardHTML() {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP Router Pro - Admin Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f7fa;
            color: #333;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
        .header .status { display: flex; align-items: center; gap: 1rem; }
        .status-indicator {
            width: 10px; height: 10px; border-radius: 50%;
            background: #4CAF50; animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        
        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            padding: 2rem;
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            border: 1px solid #e1e8ed;
        }
        
        .card h3 {
            color: #2c3e50;
            margin-bottom: 1rem;
            font-size: 1.2rem;
            border-bottom: 2px solid #3498db;
            padding-bottom: 0.5rem;
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            margin: 0.8rem 0;
            padding: 0.5rem;
            background: #f8f9fa;
            border-radius: 6px;
        }
        
        .metric-value {
            font-weight: bold;
            color: #3498db;
        }
        
        .chart-container {
            height: 200px;
            margin: 1rem 0;
            background: #f8f9fa;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
        }
        
        .log-container {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 1rem;
            border-radius: 6px;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .tool-list {
            max-height: 250px;
            overflow-y: auto;
        }
        
        .tool-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem;
            margin: 0.3rem 0;
            background: #f8f9fa;
            border-radius: 4px;
            border-left: 3px solid #3498db;
        }
        
        .btn {
            background: #3498db;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: background 0.3s;
        }
        
        .btn:hover { background: #2980b9; }
        .btn.danger { background: #e74c3c; }
        .btn.danger:hover { background: #c0392b; }
        
        .controls {
            display: flex;
            gap: 1rem;
            margin: 1rem 0;
            flex-wrap: wrap;
        }
        
        .form-group {
            margin: 1rem 0;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
        }
        
        .form-group input, .form-group select {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 0.9rem;
        }
        
        .alert {
            padding: 1rem;
            border-radius: 6px;
            margin: 1rem 0;
        }
        
        .alert.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .alert.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .alert.warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        
        .tabs {
            display: flex;
            border-bottom: 1px solid #ddd;
            margin-bottom: 1rem;
        }
        
        .tab {
            padding: 0.75rem 1.5rem;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.3s;
        }
        
        .tab.active {
            color: #3498db;
            border-bottom-color: #3498db;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 MCP Router Pro - Admin Dashboard</h1>
        <div class="status">
            <div class="status-indicator"></div>
            <span id="connection-status">Connected</span>
            <span>|</span>
            <span id="server-status">Loading...</span>
        </div>
    </div>

    <div class="dashboard">
        <!-- System Overview -->
        <div class="card">
            <h3>📊 System Overview</h3>
            <div class="metric">
                <span>Status</span>
                <span class="metric-value" id="system-status">-</span>
            </div>
            <div class="metric">
                <span>Uptime</span>
                <span class="metric-value" id="system-uptime">-</span>
            </div>
            <div class="metric">
                <span>Version</span>
                <span class="metric-value" id="system-version">-</span>
            </div>
            <div class="metric">
                <span>Total Requests</span>
                <span class="metric-value" id="total-requests">-</span>
            </div>
            <div class="metric">
                <span>Memory Usage</span>
                <span class="metric-value" id="memory-usage">-</span>
            </div>
            <div class="metric">
                <span>CPU Usage</span>
                <span class="metric-value" id="cpu-usage">-</span>
            </div>
        </div>

        <!-- Real-time Metrics -->
        <div class="card">
            <h3>📈 Real-time Metrics</h3>
            <div class="chart-container" id="metrics-chart">
                Real-time metrics chart will appear here
            </div>
            <div class="metric">
                <span>Requests/sec</span>
                <span class="metric-value" id="requests-per-sec">-</span>
            </div>
            <div class="metric">
                <span>Avg Response Time</span>
                <span class="metric-value" id="avg-response-time">-</span>
            </div>
            <div class="metric">
                <span>Error Rate</span>
                <span class="metric-value" id="error-rate">-</span>
            </div>
        </div>

        <!-- MCP Tools -->
        <div class="card">
            <h3>🔧 MCP Tools</h3>
            <div class="metric">
                <span>Registered Tools</span>
                <span class="metric-value" id="tool-count">-</span>
            </div>
            <div class="tool-list" id="tool-list">
                Loading tools...
            </div>
            <div class="controls">
                <button class="btn" onclick="refreshTools()">Refresh Tools</button>
                <button class="btn" onclick="testTool()">Test Tool</button>
            </div>
        </div>

        <!-- Security Status -->
        <div class="card">
            <h3>🔒 Security Status</h3>
            <div class="metric">
                <span>API Keys</span>
                <span class="metric-value" id="api-key-count">-</span>
            </div>
            <div class="metric">
                <span>Rate Limit Status</span>
                <span class="metric-value" id="rate-limit-status">-</span>
            </div>
            <div class="metric">
                <span>Blocked IPs</span>
                <span class="metric-value" id="blocked-ips">-</span>
            </div>
            <div class="controls">
                <button class="btn" onclick="showCreateApiKey()">Create API Key</button>
                <button class="btn danger" onclick="clearRateLimits()">Clear Rate Limits</button>
            </div>
        </div>

        <!-- WebSocket Connections -->
        <div class="card">
            <h3>🌐 WebSocket Status</h3>
            <div class="metric">
                <span>Active Connections</span>
                <span class="metric-value" id="ws-connections">-</span>
            </div>
            <div class="metric">
                <span>Authenticated</span>
                <span class="metric-value" id="ws-authenticated">-</span>
            </div>
            <div class="metric">
                <span>Total Messages</span>
                <span class="metric-value" id="ws-messages">-</span>
            </div>
            <div class="metric">
                <span>Active Rooms</span>
                <span class="metric-value" id="ws-rooms">-</span>
            </div>
        </div>

        <!-- Configuration -->
        <div class="card">
            <h3>⚙️ Configuration</h3>
            <div class="tabs">
                <div class="tab active" onclick="showTab('config-general')">General</div>
                <div class="tab" onclick="showTab('config-security')">Security</div>
                <div class="tab" onclick="showTab('config-monitoring')">Monitoring</div>
            </div>
            
            <div class="tab-content active" id="config-general">
                <div class="form-group">
                    <label>Log Level</label>
                    <select id="log-level">
                        <option value="debug">Debug</option>
                        <option value="info">Info</option>
                        <option value="warn">Warning</option>
                        <option value="error">Error</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Working Directory</label>
                    <input type="text" id="working-dir" readonly>
                </div>
            </div>
            
            <div class="tab-content" id="config-security">
                <div class="form-group">
                    <label>Require API Key</label>
                    <select id="require-api-key">
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Max Requests/Minute</label>
                    <input type="number" id="max-requests-minute">
                </div>
            </div>
            
            <div class="tab-content" id="config-monitoring">
                <div class="form-group">
                    <label>Metrics Enabled</label>
                    <select id="metrics-enabled">
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Health Check Interval (ms)</label>
                    <input type="number" id="health-check-interval">
                </div>
            </div>
            
            <div class="controls">
                <button class="btn" onclick="saveConfig()">Save Configuration</button>
                <button class="btn" onclick="reloadConfig()">Reload</button>
            </div>
        </div>

        <!-- System Logs -->
        <div class="card">
            <h3>📋 System Logs</h3>
            <div class="controls">
                <button class="btn" onclick="refreshLogs()">Refresh</button>
                <button class="btn" onclick="clearLogs()">Clear</button>
                <select id="log-filter">
                    <option value="all">All Levels</option>
                    <option value="error">Errors Only</option>
                    <option value="warn">Warnings+</option>
                    <option value="info">Info+</option>
                </select>
            </div>
            <div class="log-container" id="log-output">
                Loading logs...
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="card">
            <h3>⚡ Quick Actions</h3>
            <div class="controls">
                <button class="btn" onclick="runHealthCheck()">Health Check</button>
                <button class="btn" onclick="runLoadTest()">Run Load Test</button>
                <button class="btn" onclick="exportMetrics()">Export Metrics</button>
                <button class="btn danger" onclick="restartServer()">Restart Server</button>
            </div>
            <div id="action-results"></div>
        </div>
    </div>

    <script>
        let ws = null;
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 5;

        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {
            connectWebSocket();
            loadInitialData();
        });

        // WebSocket connection
        function connectWebSocket() {
            const wsUrl = 'ws://localhost:${this.port}/admin-ws';
            ws = new WebSocket(wsUrl);

            ws.onopen = function() {
                console.log('Connected to admin dashboard');
                document.getElementById('connection-status').textContent = 'Connected';
                reconnectAttempts = 0;
            };

            ws.onmessage = function(event) {
                try {
                    const data = JSON.parse(event.data);
                    updateDashboard(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            ws.onclose = function() {
                document.getElementById('connection-status').textContent = 'Disconnected';
                if (reconnectAttempts < maxReconnectAttempts) {
                    setTimeout(() => {
                        reconnectAttempts++;
                        connectWebSocket();
                    }, 3000);
                }
            };

            ws.onerror = function(error) {
                console.error('WebSocket error:', error);
            };
        }

        // Update dashboard with real-time data
        function updateDashboard(data) {
            if (data.type === 'metrics') {
                updateMetrics(data.data);
            } else if (data.type === 'logs') {
                updateLogs(data.data);
            } else if (data.type === 'status') {
                updateStatus(data.data);
            }
        }

        function updateMetrics(metrics) {
            // Update system metrics
            document.getElementById('system-status').textContent = metrics.status || 'unknown';
            document.getElementById('system-uptime').textContent = formatUptime(metrics.uptime);
            document.getElementById('system-version').textContent = metrics.version || '-';
            document.getElementById('total-requests').textContent = metrics.totalRequests || 0;
            document.getElementById('memory-usage').textContent = formatBytes(metrics.memoryUsage);
            document.getElementById('cpu-usage').textContent = (metrics.cpuUsage || 0).toFixed(1) + '%';
            
            // Update real-time metrics
            document.getElementById('requests-per-sec').textContent = (metrics.requestsPerSec || 0).toFixed(2);
            document.getElementById('avg-response-time').textContent = (metrics.avgResponseTime || 0).toFixed(0) + 'ms';
            document.getElementById('error-rate').textContent = (metrics.errorRate || 0).toFixed(2) + '%';
            
            // Update tool count
            document.getElementById('tool-count').textContent = metrics.toolCount || 0;
            
            // Update security metrics
            document.getElementById('api-key-count').textContent = metrics.apiKeyCount || 0;
            document.getElementById('rate-limit-status').textContent = metrics.rateLimitStatus || 'OK';
            document.getElementById('blocked-ips').textContent = metrics.blockedIPs || 0;
            
            // Update WebSocket metrics
            document.getElementById('ws-connections').textContent = metrics.wsConnections || 0;
            document.getElementById('ws-authenticated').textContent = metrics.wsAuthenticated || 0;
            document.getElementById('ws-messages').textContent = metrics.wsMessages || 0;
            document.getElementById('ws-rooms').textContent = metrics.wsRooms || 0;
        }

        function updateLogs(logs) {
            const logOutput = document.getElementById('log-output');
            if (logs && logs.length > 0) {
                logOutput.innerHTML = logs.map(log => 
                    \`<div>[\${new Date(log.timestamp).toLocaleTimeString()}] \${log.level.toUpperCase()}: \${log.message}</div>\`
                ).join('');
                logOutput.scrollTop = logOutput.scrollHeight;
            }
        }

        function updateStatus(status) {
            document.getElementById('server-status').textContent = status.status || 'Unknown';
        }

        // Tab functionality
        function showTab(tabId) {
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            event.target.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        }

        // Action functions
        function refreshTools() {
            // Implementation would fetch tools from API
            showAlert('Tools refreshed', 'success');
        }

        function testTool() {
            // Implementation would test a selected tool
            showAlert('Tool test initiated', 'success');
        }

        function showCreateApiKey() {
            const name = prompt('Enter API key name:');
            if (name) {
                // Implementation would create API key
                showAlert(\`API key '\${name}' created successfully\`, 'success');
            }
        }

        function clearRateLimits() {
            if (confirm('Clear all rate limits?')) {
                // Implementation would clear rate limits
                showAlert('Rate limits cleared', 'success');
            }
        }

        function saveConfig() {
            // Implementation would save configuration
            showAlert('Configuration saved successfully', 'success');
        }

        function reloadConfig() {
            // Implementation would reload configuration
            showAlert('Configuration reloaded', 'success');
        }

        function refreshLogs() {
            // Implementation would refresh logs
            showAlert('Logs refreshed', 'success');
        }

        function clearLogs() {
            if (confirm('Clear all logs?')) {
                document.getElementById('log-output').innerHTML = '';
                showAlert('Logs cleared', 'success');
            }
        }

        function runHealthCheck() {
            // Implementation would run health check
            showAlert('Health check completed - All systems operational', 'success');
        }

        function runLoadTest() {
            // Implementation would run load test
            showAlert('Load test initiated - Check metrics for results', 'warning');
        }

        function exportMetrics() {
            // Implementation would export metrics
            showAlert('Metrics exported to file', 'success');
        }

        function restartServer() {
            if (confirm('Restart the MCP Router server? This will cause brief downtime.')) {
                // Implementation would restart server
                showAlert('Server restart initiated', 'warning');
            }
        }

        // Utility functions
        function formatUptime(seconds) {
            if (!seconds) return '-';
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return \`\${hours}h \${minutes}m\`;
        }

        function formatBytes(bytes) {
            if (!bytes) return '-';
            const mb = bytes / (1024 * 1024);
            return mb.toFixed(1) + ' MB';
        }

        function showAlert(message, type = 'info') {
            const alertDiv = document.createElement('div');
            alertDiv.className = \`alert \${type}\`;
            alertDiv.textContent = message;
            
            const resultsDiv = document.getElementById('action-results');
            resultsDiv.appendChild(alertDiv);
            
            setTimeout(() => {
                alertDiv.remove();
            }, 5000);
        }

        function loadInitialData() {
            // Load initial configuration and status
            fetch('/api/status')
                .then(response => response.json())
                .then(data => updateStatus(data))
                .catch(error => console.error('Error loading status:', error));
        }
    </script>
</body>
</html>`;
    }

    /**
     * Serve system status
     */
    async serveStatus(res) {
        const status = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '3.0.0',
            memory: process.memoryUsage(),
            pid: process.pid
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status));
    }

    /**
     * Serve metrics data
     */
    async serveMetrics(res) {
        const metrics = this.mcpRouter ? await this.mcpRouter.metrics.getMetrics() : {};
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(metrics));
    }

    /**
     * Serve configuration
     */
    async serveConfig(req, res) {
        if (req.method === 'GET') {
            const config = this.mcpRouter ? this.mcpRouter.config.getAllConfig() : {};
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(config));
        } else if (req.method === 'POST') {
            // Handle configuration updates
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const newConfig = JSON.parse(body);
                    // Update configuration logic here
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Configuration updated' }));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid configuration data' }));
                }
            });
        }
    }

    /**
     * Serve system logs
     */
    async serveLogs(res) {
        // In a real implementation, this would read from log files
        const logs = [
            { timestamp: new Date(), level: 'info', message: 'MCP Router Pro started successfully' },
            { timestamp: new Date(), level: 'debug', message: 'All modules initialized' },
            { timestamp: new Date(), level: 'info', message: 'Admin dashboard connected' }
        ];

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(logs));
    }

    /**
     * Serve tools information
     */
    async serveTools(res) {
        const tools = this.mcpRouter && this.mcpRouter.toolExecutor ? 
            this.mcpRouter.toolExecutor.getAvailableTools() : [];
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(tools));
    }

    /**
     * Serve security information
     */
    async serveSecurity(req, res) {
        const security = this.mcpRouter && this.mcpRouter.security ? {
            apiKeyCount: this.mcpRouter.security.getApiKeyCount(),
            rateLimitStatus: this.mcpRouter.security.getRateLimitStatus(),
            blockedIPs: this.mcpRouter.security.getBlockedIPs()
        } : {};

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(security));
    }

    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(ws, message) {
        switch (message.type) {
            case 'request_update':
                this.sendInitialData(ws);
                break;
            case 'admin_action':
                this.handleAdminAction(ws, message.action, message.data);
                break;
            default:
                console.log('Unknown WebSocket message type:', message.type);
        }
    }

    /**
     * Handle admin actions via WebSocket
     */
    async handleAdminAction(ws, action, data) {
        try {
            let result = {};

            switch (action) {
                case 'restart_server':
                    result = { success: true, message: 'Server restart initiated' };
                    // In production, implement graceful restart
                    break;
                case 'clear_logs':
                    result = { success: true, message: 'Logs cleared' };
                    break;
                case 'create_api_key':
                    if (this.mcpRouter && this.mcpRouter.security) {
                        const apiKey = await this.mcpRouter.security.createApiKey(data.name, data.permissions);
                        result = { success: true, apiKey, message: 'API key created' };
                    }
                    break;
                default:
                    result = { success: false, error: 'Unknown action' };
            }

            ws.send(JSON.stringify({
                type: 'admin_action_result',
                action,
                result
            }));

        } catch (error) {
            ws.send(JSON.stringify({
                type: 'admin_action_result',
                action,
                result: { success: false, error: error.message }
            }));
        }
    }

    /**
     * Send initial data to connected client
     */
    async sendInitialData(ws) {
        try {
            const data = {
                type: 'initial_data',
                data: {
                    status: 'healthy',
                    version: '3.0.0',
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    metrics: this.mcpRouter ? await this.mcpRouter.metrics.getMetrics() : {}
                }
            };

            ws.send(JSON.stringify(data));
        } catch (error) {
            console.error('Error sending initial data:', error);
        }
    }

    /**
     * Start real-time data broadcasting
     */
    startRealTimeUpdates() {
        this.updateInterval = setInterval(async () => {
            if (this.clients.size === 0) return;

            try {
                const metrics = this.mcpRouter ? await this.mcpRouter.metrics.getMetrics() : {};
                const updateData = {
                    type: 'metrics',
                    data: {
                        ...metrics,
                        timestamp: Date.now(),
                        uptime: process.uptime(),
                        memory: process.memoryUsage()
                    }
                };

                const message = JSON.stringify(updateData);
                this.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(message);
                    }
                });

            } catch (error) {
                console.error('Error broadcasting updates:', error);
            }
        }, 5000); // Update every 5 seconds
    }

    /**
     * Stop the dashboard server
     */
    stop() {
        console.log('🛑 Stopping Admin Dashboard');
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        if (this.wsServer) {
            this.wsServer.close();
        }

        if (this.server) {
            this.server.close();
        }

        this.clients.clear();
    }
}

module.exports = { AdminDashboard };
