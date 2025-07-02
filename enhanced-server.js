const http = require('http');

console.log('🚀 MCP Router starting...');
console.log(`Process PID: ${process.pid}`);
console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform} (${process.arch})`);

// Simple request counter
let requestCount = 0;

// Add periodic heartbeat
const heartbeatInterval = setInterval(() => {
    const memUsage = process.memoryUsage();
    console.log(`💓 Heartbeat - PID: ${process.pid}, Uptime: ${Math.round(process.uptime())}s, Memory: ${Math.round(memUsage.rss/1024/1024)}MB, Requests: ${requestCount}`);
}, 10000); // Every 10 seconds

// Basic MCP data structures
const mcpData = {
    tools: new Map(),
    servers: new Map(),
    stats: {
        totalRequests: 0,
        toolCalls: 0,
        serverRegistrations: 0
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
            usageCount: 0
        });
        mcpData.stats.serverRegistrations++;
        console.log(`🔧 Registered tool: ${name} for server: ${serverId}`);
        return true;
    } catch (error) {
        console.log(`❌ Error registering tool ${name}: ${error.message}`);
        return false;
    }
}

// Get tools list
function getToolsList() {
    return Array.from(mcpData.tools.values());
}

// HTTP server
const server = http.createServer((req, res) => {
    requestCount++;
    mcpData.stats.totalRequests++;
    console.log(`📨 ${req.method} ${req.url} (Request #${requestCount})`);
    
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
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        }));
        console.log('📊 Stats endpoint responded');
        
    } else {
        // Main endpoint
        res.end(JSON.stringify({
            status: 'MCP Router Active',
            version: '1.0.0',
            port: 3001,
            uptime: process.uptime(),
            requests: requestCount,
            endpoints: [
                'GET /health - Health check with MCP stats',
                'GET /api/tools - List all registered tools',
                'GET /api/stats - Get MCP router statistics'
            ],
            mcp: {
                tools: mcpData.tools.size,
                servers: mcpData.servers.size,
                stats: mcpData.stats
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

server.listen(3001, '0.0.0.0', () => {
    console.log('✅ MCP Router HTTP server listening on port 3001');
    
    // Register some sample tools after startup
    setTimeout(() => {
        console.log('🔧 Registering sample tools...');
        registerTool('read_file', 'Read contents of a file', 'file-server');
        registerTool('write_file', 'Write content to a file', 'file-server');
        registerTool('list_directory', 'List directory contents', 'file-server');
        registerTool('fetch_url', 'Fetch content from a URL', 'web-server');
        registerTool('git_status', 'Get git repository status', 'git-server');
        registerTool('docker_ps', 'List running containers', 'docker-server');
        console.log(`✅ Registered ${mcpData.tools.size} sample tools`);
    }, 2000);
});

// Signal handling
process.on('SIGTERM', () => {
    console.log('⚠️ Received SIGTERM, shutting down gracefully');
    clearInterval(heartbeatInterval);
    server.close();
});

process.on('SIGINT', () => {
    console.log('⚠️ Received SIGINT, shutting down gracefully');
    clearInterval(heartbeatInterval);
    server.close();
});

// Error handling
process.on('uncaughtException', (err) => {
    console.log(`❌ UNCAUGHT EXCEPTION: ${err.message}`);
    console.log(`❌ Stack: ${err.stack}`);
});

process.on('unhandledRejection', (reason, promise) => {
    console.log(`❌ UNHANDLED REJECTION: ${reason}`);
});

console.log('🎯 MCP Router initialized and ready for connections');
