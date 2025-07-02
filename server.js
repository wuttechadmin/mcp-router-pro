const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('🚀 MCP Router starting...');
console.log(`Process PID: ${process.pid}`);
console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform} (${process.arch})`);

// Setup file logging (optional, can be disabled for stability)
const ENABLE_FILE_LOGGING = process.env.ENABLE_FILE_LOGGING === 'true';
let logFile = null;

if (ENABLE_FILE_LOGGING) {
    const logDir = '/app/logs';
    logFile = path.join(logDir, 'mcp-router.log');
    
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
}

// Logging function that writes to console and optionally to file
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    // Always write to console
    console.log(logMessage);
    
    // Optionally write to file
    if (ENABLE_FILE_LOGGING && logFile) {
        try {
            fs.appendFileSync(logFile, logMessage + '\n');
        } catch (err) {
            console.error('Failed to write to log file:', err.message);
        }
    }
}

// Request counter and WebSocket connections
let requestCount = 0;
let wsConnections = new Set();

// Add periodic heartbeat
const heartbeatInterval = setInterval(() => {
    const memUsage = process.memoryUsage();
    log(`💓 Heartbeat - PID: ${process.pid}, Uptime: ${Math.round(process.uptime())}s, Memory: ${Math.round(memUsage.rss/1024/1024)}MB, Requests: ${requestCount}, WS: ${wsConnections.size}`);
}, 15000); // Every 15 seconds

// Clear heartbeat on exit
const cleanup = () => {
    log('🧹 Cleanup: Clearing heartbeat interval');
    clearInterval(heartbeatInterval);
    wsConnections.forEach(socket => {
        try {
            socket.close();
        } catch (e) {
            // Ignore errors during cleanup
        }
    });
};

// Basic MCP data structures
const mcpData = {
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
        errors: 0
    }
};

// Tool registration function
function registerTool(name, description, serverId = 'default-server') {
    try {
        mcpData.tools.set(name, {
            name: name,
            description: description,
            serverId: serverId,
            registeredAt: new Date(),
            usageCount: 0,
            lastUsed: null
        });
        mcpData.stats.serverRegistrations++;
        log(`🔧 Registered tool: ${name} for server: ${serverId}`);
        
        // Broadcast tool registration to WebSocket clients
        broadcastToWebSockets({
            type: 'tool_registered',
            tool: { name, description, serverId },
            timestamp: new Date().toISOString()
        });
        
        return true;
    } catch (error) {
        log(`❌ Error registering tool ${name}: ${error.message}`);
        mcpData.stats.errors++;
        return false;
    }
}

// Get tools list
function getToolsList() {
    return Array.from(mcpData.tools.values());
}

// JSON-RPC handler
async function handleJSONRPC(req, res) {
    return new Promise((resolve) => {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                mcpData.stats.jsonRpcRequests++;
                const request = JSON.parse(body);
                log(`📨 JSON-RPC request: ${request.method} (ID: ${request.id})`);
                
                const response = await processJSONRPCRequest(request);
                
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify(response));
                log(`📤 JSON-RPC response sent for method: ${request.method}`);
                resolve();
                
            } catch (error) {
                log(`❌ JSON-RPC error: ${error.message}`);
                mcpData.stats.errors++;
                
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

// Process JSON-RPC requests
async function processJSONRPCRequest(request) {
    const { method, params, id } = request;
    
    try {
        let result;
        
        switch (method) {
            case 'tools/list':
                result = { 
                    tools: getToolsList().map(tool => ({
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
                
                const tool = mcpData.tools.get(params.name);
                if (!tool) {
                    throw new Error(`Tool '${params.name}' not found`);
                }
                
                // Update tool usage
                tool.usageCount++;
                tool.lastUsed = new Date();
                mcpData.stats.toolCalls++;
                
                // Broadcast tool execution to WebSocket clients
                broadcastToWebSockets({
                    type: 'tool_executed',
                    tool: params.name,
                    arguments: params.arguments || {},
                    timestamp: new Date().toISOString()
                });
                
                // Mock tool execution for now
                result = {
                    content: [
                        {
                            type: 'text',
                            text: `Mock execution of tool '${params.name}' with arguments: ${JSON.stringify(params.arguments || {})}`
                        }
                    ],
                    isError: false
                };
                log(`� Executed tool: ${params.name}`);
                break;
                
            case 'mcp/stats':
                result = {
                    servers: mcpData.servers.size,
                    tools: mcpData.tools.size,
                    clients: mcpData.clients.size,
                    websockets: wsConnections.size,
                    stats: mcpData.stats,
                    uptime: process.uptime()
                };
                break;
                
            case 'ping':
                result = { 
                    pong: new Date().toISOString(),
                    uptime: process.uptime(),
                    websockets: wsConnections.size
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
        log(`❌ JSON-RPC method error: ${error.message}`);
        mcpData.stats.errors++;
        
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

// Simple WebSocket implementation
function handleWebSocketUpgrade(req, socket, head) {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        return;
    }
    
    try {
        // WebSocket handshake
        const crypto = require('crypto');
        const acceptKey = crypto
            .createHash('sha1')
            .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
            .digest('base64');
        
        const responseHeaders = [
            'HTTP/1.1 101 Switching Protocols',
            'Upgrade: websocket',
            'Connection: Upgrade',
            `Sec-WebSocket-Accept: ${acceptKey}`,
            '\r\n'
        ].join('\r\n');
        
        socket.write(responseHeaders);
        
        // Add to connections
        wsConnections.add(socket);
        mcpData.stats.wsConnections++;
        log(`🔌 WebSocket connection established (${wsConnections.size} total)`);
        
        // Send welcome message
        sendWebSocketMessage(socket, {
            type: 'welcome',
            message: 'Connected to MCP Router',
            tools: mcpData.tools.size,
            timestamp: new Date().toISOString()
        });
        
        socket.on('close', () => {
            wsConnections.delete(socket);
            log(`🔌 WebSocket connection closed (${wsConnections.size} remaining)`);
        });
        
        socket.on('error', (error) => {
            log(`❌ WebSocket error: ${error.message}`);
            wsConnections.delete(socket);
            mcpData.stats.errors++;
        });
        
    } catch (error) {
        log(`❌ WebSocket handshake error: ${error.message}`);
        socket.end('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        mcpData.stats.errors++;
    }
}

// Send message to WebSocket client
function sendWebSocketMessage(socket, message) {
    try {
        const payload = JSON.stringify(message);
        const payloadBuffer = Buffer.from(payload);
        const frame = Buffer.allocUnsafe(2 + payloadBuffer.length);
        
        frame[0] = 0x81; // FIN + text frame
        frame[1] = payloadBuffer.length; // payload length
        payloadBuffer.copy(frame, 2);
        
        socket.write(frame);
    } catch (error) {
        log(`❌ WebSocket send error: ${error.message}`);
        mcpData.stats.errors++;
    }
}

// Broadcast to all WebSocket connections
function broadcastToWebSockets(message) {
    wsConnections.forEach(socket => {
        try {
            sendWebSocketMessage(socket, message);
        } catch (error) {
            // Remove failed connections
            wsConnections.delete(socket);
        }
    });
}

const server = http.createServer(async (req, res) => {
    requestCount++;
    mcpData.stats.totalRequests++;
    log(`📨 ${req.method} ${req.url} (Request #${requestCount})`);
    
    // Handle JSON-RPC requests
    if (req.url.startsWith('/api/mcp/') && req.method === 'POST') {
        await handleJSONRPC(req, res);
        return;
    }
    
    // Handle regular HTTP requests
    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    
    if (req.url === '/health') {
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            requests: requestCount,
            mcp: {
                tools: mcpData.tools.size,
                servers: mcpData.servers.size,
                clients: mcpData.clients.size,
                websockets: wsConnections.size,
                stats: mcpData.stats
            }
        }));
        log('✅ Health check responded');
        
    } else if (req.url === '/logs' && ENABLE_FILE_LOGGING && logFile) {
        // Add endpoint to view recent logs (only if file logging enabled)
        try {
            const logs = fs.readFileSync(logFile, 'utf8').split('\n').slice(-50).join('\n');
            res.end(JSON.stringify({ 
                logs: logs,
                logFile: logFile,
                timestamp: new Date().toISOString()
            }));
            log('Log endpoint accessed');
        } catch (err) {
            res.end(JSON.stringify({ error: 'Could not read logs', message: err.message }));
            log(`Error reading logs: ${err.message}`);
        }
        
    } else if (req.url === '/api/tools') {
        const tools = getToolsList();
        res.end(JSON.stringify({
            tools: tools,
            count: tools.length,
            timestamp: new Date().toISOString()
        }));
        log(`🔧 Tools endpoint responded with ${tools.length} tools`);
        
    } else if (req.url === '/api/stats') {
        res.end(JSON.stringify({
            stats: mcpData.stats,
            websockets: wsConnections.size,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        }));
        log('📊 Stats endpoint responded');
        
    } else {
        // Main endpoint
        const endpoints = [
            'GET /health - Health check with MCP stats',
            'GET /api/tools - List all registered tools',
            'GET /api/stats - Get MCP router statistics',
            'POST /api/mcp/* - JSON-RPC MCP protocol endpoints',
            'WebSocket /ws - Real-time MCP communication'
        ];
        
        if (ENABLE_FILE_LOGGING) {
            endpoints.splice(1, 0, 'GET /logs - View recent log entries');
        }
        
        res.end(JSON.stringify({
            status: 'MCP Router Active',
            version: '2.0.0',
            port: 3001,
            uptime: process.uptime(),
            requests: requestCount,
            logFile: ENABLE_FILE_LOGGING ? logFile : 'disabled',
            endpoints: endpoints,
            mcp: {
                tools: mcpData.tools.size,
                servers: mcpData.servers.size,
                clients: mcpData.clients.size,
                websockets: wsConnections.size,
                stats: mcpData.stats
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
                endpoint: 'ws://localhost:3001/ws',
                features: [
                    'Real-time tool execution notifications',
                    'Live statistics updates',
                    'Tool registration events'
                ]
            },
            services: [
                'filesystem', 'git', 'memory', 'sqlite', 'postgres',
                'docker', 'brave-search', 'github', 'slack', 'prometheus',
                'jupyter', 'e2b', 'openapi', 'email'
            ]
        }));
        log('📋 Main endpoint responded');
    }
});

// Handle WebSocket upgrade
server.on('upgrade', (req, socket, head) => {
    if (req.url === '/ws') {
        handleWebSocketUpgrade(req, socket, head);
    } else {
        socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
    }
});

server.listen(3001, '0.0.0.0', () => {
    log('✅ MCP Router HTTP server listening on port 3001');
    log('🔌 WebSocket server ready at ws://localhost:3001/ws');
    if (ENABLE_FILE_LOGGING && logFile) {
        log('Log file location: ' + logFile);
    } else {
        log('File logging disabled - using console only');
    }
    
    // Register sample tools after startup
    setTimeout(() => {
        log('🔧 Registering sample tools...');
        registerTool('read_file', 'Read contents of a file', 'file-server');
        registerTool('write_file', 'Write content to a file', 'file-server');
        registerTool('list_directory', 'List directory contents', 'file-server');
        registerTool('fetch_url', 'Fetch content from a URL', 'web-server');
        registerTool('git_status', 'Get git repository status', 'git-server');
        registerTool('docker_ps', 'List running containers', 'docker-server');
        registerTool('search_files', 'Search for files by pattern', 'search-server');
        registerTool('execute_command', 'Execute a shell command', 'system-server');
        registerTool('sql_query', 'Execute SQL query', 'database-server');
        registerTool('api_call', 'Make HTTP API call', 'http-server');
        log(`✅ Registered ${mcpData.tools.size} sample tools`);
    }, 2000);
});

process.on('exit', cleanup);
process.on('beforeExit', () => {
    log('⚠️ beforeExit event triggered');
    cleanup();
});

// Keep the process alive
process.on('SIGTERM', () => {
    log('⚠️ Received SIGTERM, shutting down gracefully');
    cleanup();
    server.close();
});

process.on('SIGINT', () => {
    log('⚠️ Received SIGINT, shutting down gracefully');
    cleanup();
    server.close();
});

process.on('SIGHUP', () => {
    log('⚠️ Received SIGHUP');
});

process.on('SIGQUIT', () => {
    log('⚠️ Received SIGQUIT');
});

// Add error handling
process.on('uncaughtException', (err) => {
    log(`❌ UNCAUGHT EXCEPTION: ${err.message}`);
    log(`❌ Stack: ${err.stack}`);
    log('❌ Process will exit due to uncaught exception');
    mcpData.stats.errors++;
});

process.on('unhandledRejection', (reason, promise) => {
    log(`❌ UNHANDLED REJECTION: ${reason}`);
    log(`❌ Promise: ${promise}`);
    mcpData.stats.errors++;
});

log('🎯 MCP Router with full protocol support initialized and ready');
