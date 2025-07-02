const http = require('http');

console.log('🚀 MCP Router with WebSocket starting...');
console.log(`Process PID: ${process.pid}`);
console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform} (${process.arch})`);

// Simple request counter
let requestCount = 0;
let wsConnections = new Set();

// Add periodic heartbeat
const heartbeatInterval = setInterval(() => {
    const memUsage = process.memoryUsage();
    console.log(`💓 Heartbeat - PID: ${process.pid}, Uptime: ${Math.round(process.uptime())}s, Memory: ${Math.round(memUsage.rss/1024/1024)}MB, Requests: ${requestCount}, WS: ${wsConnections.size}`);
}, 10000);

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
        console.log(`🔧 Registered tool: ${name} for server: ${serverId}`);
        
        // Broadcast tool registration to WebSocket clients
        broadcastToWebSockets({
            type: 'tool_registered',
            tool: { name, description, serverId },
            timestamp: new Date().toISOString()
        });
        
        return true;
    } catch (error) {
        console.log(`❌ Error registering tool ${name}: ${error.message}`);
        mcpData.stats.errors++;
        return false;
    }
}

// Get tools list
function getToolsList() {
    return Array.from(mcpData.tools.values());
}

// Simple WebSocket implementation (basic handshake)
function handleWebSocketUpgrade(req, socket, head) {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        return;
    }
    
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
    console.log(`🔌 WebSocket connection established (${wsConnections.size} total)`);
    
    // Send welcome message
    sendWebSocketMessage(socket, {
        type: 'welcome',
        message: 'Connected to MCP Router',
        tools: mcpData.tools.size,
        timestamp: new Date().toISOString()
    });
    
    // Handle messages (basic frame parsing)
    socket.on('data', (buffer) => {
        try {
            mcpData.stats.wsMessages++;
            // Basic WebSocket frame parsing (simplified)
            if (buffer.length > 2) {
                const payloadLength = buffer[1] & 0x7F;
                const maskStart = 2;
                const dataStart = maskStart + 4;
                
                if (buffer.length >= dataStart + payloadLength) {
                    const mask = buffer.slice(maskStart, dataStart);
                    const payload = buffer.slice(dataStart, dataStart + payloadLength);
                    
                    // Unmask the payload
                    for (let i = 0; i < payload.length; i++) {
                        payload[i] ^= mask[i % 4];
                    }
                    
                    const message = JSON.parse(payload.toString());
                    console.log(`📨 WebSocket message: ${message.type || 'unknown'}`);
                    
                    // Echo back for now
                    sendWebSocketMessage(socket, {
                        type: 'echo',
                        original: message,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        } catch (error) {
            console.log(`❌ WebSocket message error: ${error.message}`);
            mcpData.stats.errors++;
        }
    });
    
    socket.on('close', () => {
        wsConnections.delete(socket);
        console.log(`🔌 WebSocket connection closed (${wsConnections.size} remaining)`);
    });
    
    socket.on('error', (error) => {
        console.log(`❌ WebSocket error: ${error.message}`);
        wsConnections.delete(socket);
        mcpData.stats.errors++;
    });
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
        console.log(`❌ WebSocket send error: ${error.message}`);
        mcpData.stats.errors++;
    }
}

// Broadcast to all WebSocket connections
function broadcastToWebSockets(message) {
    wsConnections.forEach(socket => {
        sendWebSocketMessage(socket, message);
    });
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
                console.log(`📨 JSON-RPC request: ${request.method} (ID: ${request.id})`);
                
                const response = await processJSONRPCRequest(request);
                
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify(response));
                console.log(`📤 JSON-RPC response sent for method: ${request.method}`);
                resolve();
                
            } catch (error) {
                console.log(`❌ JSON-RPC error: ${error.message}`);
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
                
                // Mock tool execution
                result = {
                    content: [
                        {
                            type: 'text',
                            text: `Mock execution of tool '${params.name}' with arguments: ${JSON.stringify(params.arguments || {})}`
                        }
                    ],
                    isError: false
                };
                console.log(`🔧 Executed tool: ${params.name}`);
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
        console.log(`❌ JSON-RPC method error: ${error.message}`);
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

// HTTP server
const server = http.createServer(async (req, res) => {
    requestCount++;
    mcpData.stats.totalRequests++;
    console.log(`📨 ${req.method} ${req.url} (Request #${requestCount})`);
    
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
        console.log('✅ Health check responded');
        
    } else if (req.url === '/api/tools') {
        const tools = getToolsList();
        res.end(JSON.stringify({
            tools: tools,
            count: tools.length,
            timestamp: new Date().toISOString()
        }));
        console.log(`🔧 Tools endpoint responded with ${tools.length} tools`);
        
    } else if (req.url === '/api/stats') {
        res.end(JSON.stringify({
            stats: mcpData.stats,
            websockets: wsConnections.size,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        }));
        console.log('📊 Stats endpoint responded');
        
    } else {
        // Main endpoint
        res.end(JSON.stringify({
            status: 'MCP Router Active',
            version: '1.2.0',
            port: 3001,
            uptime: process.uptime(),
            requests: requestCount,
            endpoints: [
                'GET /health - Health check with MCP stats',
                'GET /api/tools - List all registered tools',
                'GET /api/stats - Get MCP router statistics',
                'POST /api/mcp/* - JSON-RPC MCP protocol endpoints',
                'WebSocket /ws - Real-time MCP communication'
            ],
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
        console.log('📋 Main endpoint responded');
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
    console.log('✅ MCP Router HTTP server listening on port 3001');
    console.log('🔌 WebSocket server ready at ws://localhost:3001/ws');
    
    // Register sample tools after startup
    setTimeout(() => {
        console.log('🔧 Registering sample tools...');
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
        console.log(`✅ Registered ${mcpData.tools.size} sample tools`);
    }, 2000);
});

// Signal handling
process.on('SIGTERM', () => {
    console.log('⚠️ Received SIGTERM, shutting down gracefully');
    clearInterval(heartbeatInterval);
    wsConnections.forEach(socket => socket.close());
    server.close();
});

process.on('SIGINT', () => {
    console.log('⚠️ Received SIGINT, shutting down gracefully');
    clearInterval(heartbeatInterval);
    wsConnections.forEach(socket => socket.close());
    server.close();
});

// Error handling
process.on('uncaughtException', (err) => {
    console.log(`❌ UNCAUGHT EXCEPTION: ${err.message}`);
    console.log(`❌ Stack: ${err.stack}`);
    mcpData.stats.errors++;
});

process.on('unhandledRejection', (reason, promise) => {
    console.log(`❌ UNHANDLED REJECTION: ${reason}`);
    mcpData.stats.errors++;
});

console.log('🎯 MCP Router with JSON-RPC and WebSocket support initialized and ready');
