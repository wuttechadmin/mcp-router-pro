// Helper function to add timestamps to logs
function logWithTimestamp(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

const http = require('http');
const fs = require('fs');
const path = require('path');

// Setup file logging
const logDir = '/app/logs';
const logFile = path.join(logDir, 'mcp-router.log');

// Create logs directory if it doesn't exist
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Enhanced logging function that writes to both console and file
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    // Write to console
    console.log(logMessage);
    
    // Write to file (append)
    try {
        fs.appendFileSync(logFile, logMessage + '\n');
    } catch (err) {
        console.error('Failed to write to log file:', err.message);
    }
}

// Log startup with unique identifier
const startupId = Math.random().toString(36).substr(2, 9);

log(`🚀 MCP Router starting... (ID: ${startupId})`);
log(`📊 Process PID: ${process.pid}`);
log(`Log file location: ${logFile}`);

// Basic server configuration
const serverConfig = {
  port: process.env.MCP_ROUTER_PORT || 3001,
  host: process.env.MCP_ROUTER_HOST || '0.0.0.0'
};

// Track basic server state
const serverState = {
  startupId: startupId,
  startTime: new Date(),
  status: 'starting',
  requestCount: 0
};

// Add error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
  logWithTimestamp(`❌ UNCAUGHT EXCEPTION (ID: ${startupId}): ${err.message}`);
  logWithTimestamp(`❌ Stack: ${err.stack}`);
  // Don't exit - keep the process running
});

process.on('unhandledRejection', (reason, promise) => {
  logWithTimestamp(`❌ UNHANDLED REJECTION (ID: ${startupId}): ${reason}`);
  // Don't exit - keep the process running
});

// Simple HTTP request handler
function handleRequest(req, res) {
  try {
    serverState.requestCount++;
    
    log(`📥 ${req.method} ${req.url} from ${req.connection.remoteAddress || 'unknown'} (ID: ${startupId})`);

    // Simple health endpoint
    if (req.url === '/' || req.url === '/health') {
      const uptimeSeconds = process.uptime();
      const data = {
        status: serverState.status,
        service: 'MCP Router (Basic)',
        startupId: serverState.startupId,
        timestamp: new Date().toISOString(),
        uptime: Math.round(uptimeSeconds * 100) / 100,
        requests: serverState.requestCount,
        startTime: serverState.startTime.toISOString(),
        logFile: logFile
      };

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(data, null, 2));
      log(`✅ Health check responded (ID: ${startupId})`);
    } else if (req.url === '/api/tools') {
      // Phase 1: Simple static tools response (no Map operations)
      const staticTools = [
        { name: 'read_file', description: 'Read contents of a file', serverId: 'file-server' },
        { name: 'write_file', description: 'Write content to a file', serverId: 'file-server' }
      ];
      
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ tools: staticTools, count: staticTools.length }, null, 2));
      log(`✅ Tools endpoint responded (ID: ${startupId})`);
    } else if (req.url === '/logs') {
      // Add endpoint to view recent logs
      try {
        const logs = fs.readFileSync(logFile, 'utf8').split('\n').slice(-50).join('\n');
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ 
          logs: logs,
          logFile: logFile,
          timestamp: new Date().toISOString()
        }));
        log(`✅ Logs endpoint accessed (ID: ${startupId})`);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Could not read logs', message: err.message }));
        log(`❌ Error reading logs: ${err.message} (ID: ${startupId})`);
      }
    } else {
      // Simple 404
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }, null, 2));
      log(`⚠️  404 response for ${req.url} (ID: ${startupId})`);
    }
  } catch (error) {
    log(`❌ REQUEST ERROR (ID: ${startupId}): ${error.message}`);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }, null, 2));
  }
}

// Create basic HTTP server
const server = http.createServer(handleRequest);

// Add error handling for the server
server.on('error', (err) => {
  logWithTimestamp(`❌ SERVER ERROR (ID: ${startupId}): ${err.message}`);
  logWithTimestamp(`❌ Server Error Stack: ${err.stack}`);
});

server.on('close', () => {
  logWithTimestamp(`🔒 Server closed (ID: ${startupId})`);
});

server.listen(serverConfig.port, serverConfig.host, () => {
  log(`✅ Basic MCP Router listening on ${serverConfig.host}:${serverConfig.port} (ID: ${startupId})`);
  serverState.status = 'running';
});

// Basic signal handlers
process.on('SIGTERM', () => {
  log(`⚠️  Received SIGTERM (ID: ${startupId})`);
  server.close(() => {
    log(`👋 Server closed gracefully (ID: ${startupId})`);
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log(`⚠️  Received SIGINT (ID: ${startupId})`);
  server.close(() => {
    log(`👋 Server closed gracefully (ID: ${startupId})`);
    process.exit(0);
  });
});

process.on('exit', (code) => {
  log(`🏁 Process exiting with code ${code} (ID: ${startupId})`);
});

// Enhanced error handling
process.on('uncaughtException', (err) => {
  log(`❌ UNCAUGHT EXCEPTION (ID: ${startupId}): ${err.message}`);
  log(`❌ Stack: ${err.stack}`);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`❌ UNHANDLED REJECTION (ID: ${startupId}): ${reason}`);
});

log(`🟢 Basic server ready (ID: ${startupId})`);

// COMMENTED OUT: All MCP-related functionality to achieve stability
// Once stable, we'll incrementally reintroduce these features

/*
// MCP Protocol Handler
class MCPRouter {
  constructor() {
    this.servers = mcpConfig.servers;
    this.clients = mcpConfig.clients;
    this.tools = mcpConfig.tools;
    this.routingTable = mcpConfig.routingTable;
  }

  // Register an MCP server
  registerServer(serverId, serverConfig) {
    logWithTimestamp(`📝 Registering MCP server: ${serverId} (ID: ${startupId})`);
    this.servers.set(serverId, {
      id: serverId,
      ...serverConfig,
      status: 'registered',
      registeredAt: new Date(),
      lastHealthCheck: null,
      tools: []
    });
    serverState.mcpServers = this.servers.size;
    return true;
  }

  // Register an MCP client
  registerClient(clientId, clientConfig) {
    logWithTimestamp(`📝 Registering MCP client: ${clientId} (ID: ${startupId})`);
    this.clients.set(clientId, {
      id: clientId,
      ...clientConfig,
      status: 'registered',
      registeredAt: new Date(),
      lastRequest: null
    });
    serverState.mcpClients = this.clients.size;
    return true;
  }

  // Register a tool
  registerTool(toolName, toolConfig, serverId) {
    logWithTimestamp(`🔧 Registering tool: ${toolName} from server ${serverId} (ID: ${startupId})`);
    this.tools.set(toolName, {
      name: toolName,
      serverId: serverId,
      ...toolConfig,
      registeredAt: new Date(),
      usageCount: 0
    });
    
    // Add tool to server's tool list
    if (this.servers.has(serverId)) {
      const server = this.servers.get(serverId);
      server.tools.push(toolName);
    }
    
    serverState.registeredTools = this.tools.size;
    return true;
  }

  // Route a tool call to the appropriate server
  async routeToolCall(toolName, params, clientId) {
    if (!this.tools.has(toolName)) {
      throw new Error(`Tool '${toolName}' not found`);
    }

    const tool = this.tools.get(toolName);
    const serverId = tool.serverId;

    if (!this.servers.has(serverId)) {
      throw new Error(`Server '${serverId}' for tool '${toolName}' not available`);
    }

    const server = this.servers.get(serverId);
    logWithTimestamp(`🔄 Routing tool call '${toolName}' from client '${clientId}' to server '${serverId}' (ID: ${startupId})`);

    // Update usage statistics
    tool.usageCount++;
    tool.lastUsed = new Date();
    server.lastRequest = new Date();

    // This would normally make an HTTP request to the actual server
    // For now, return a mock response
    return {
      tool: toolName,
      server: serverId,
      client: clientId,
      result: `Mock response for ${toolName} with params: ${JSON.stringify(params)}`,
      timestamp: new Date().toISOString()
    };
  }

  // Get server health status
  getServerHealth(serverId) {
    if (!this.servers.has(serverId)) {
      return null;
    }
    const server = this.servers.get(serverId);
    // This would normally ping the actual server
    server.lastHealthCheck = new Date();
    server.status = 'healthy';
    return server;
  }

  // List all available tools
  listTools() {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      serverId: tool.serverId,
      description: tool.description || 'No description available',
      usageCount: tool.usageCount,
      lastUsed: tool.lastUsed
    }));
  }

  // Get routing statistics
  getStats() {
    return {
      servers: this.servers.size,
      clients: this.clients.size,
      tools: this.tools.size,
      totalRequests: serverState.requestCount,
      uptime: process.uptime()
    };
  }
}

// Initialize MCP Router
const mcpRouter = new MCPRouter();

// Load configuration if available
function loadMCPConfig() {
  try {
    const configPath = '/app/mcp-router.json';
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      logWithTimestamp(`📄 Loading MCP configuration from ${configPath} (ID: ${startupId})`);
      
      // Register servers from config
      if (config.servers) {
        Object.entries(config.servers).forEach(([serverId, serverConfig]) => {
          mcpRouter.registerServer(serverId, serverConfig);
          
          // Register tools for each server
          if (serverConfig.tools) {
            serverConfig.tools.forEach(tool => {
              mcpRouter.registerTool(tool.name, tool, serverId);
            });
          }
        });
      }
      
      logWithTimestamp(`✅ MCP configuration loaded successfully (ID: ${startupId})`);
    } else {
      logWithTimestamp(`⚠️  No MCP configuration file found at ${configPath}, using defaults (ID: ${startupId})`);
    }
  } catch (error) {
    logWithTimestamp(`❌ Error loading MCP configuration: ${error.message} (ID: ${startupId})`);
  }
}

// Helper function to format uptime
function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
}

// Helper function to get memory usage in MB
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
    external: Math.round(usage.external / 1024 / 1024 * 100) / 100
  };
}

// HTTP Request handler with MCP routing
async function handleRequest(req, res) {
  serverState.requestCount++;
  serverState.lastRequestTime = new Date();
  
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;
  
  logWithTimestamp(`📥 ${method} ${pathname} from ${req.connection.remoteAddress || 'unknown'} (ID: ${startupId})`);

  // Handle different endpoints
  try {
    if (pathname === '/' || pathname === '/health') {
      await handleHealthEndpoint(req, res);
    } else if (pathname === '/api/mcp/tools') {
      await handleToolsEndpoint(req, res);
    } else if (pathname === '/api/mcp/servers') {
      await handleServersEndpoint(req, res);
    } else if (pathname === '/api/mcp/clients') {
      await handleClientsEndpoint(req, res);
    } else if (pathname === '/api/mcp/route') {
      await handleRouteEndpoint(req, res);
    } else if (pathname === '/api/mcp/stats') {
      await handleStatsEndpoint(req, res);
    } else if (pathname.startsWith('/api/mcp/')) {
      await handleMCPProtocol(req, res);
    } else {
      // 404 Not Found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }, null, 2));
    }
  } catch (error) {
    logWithTimestamp(`❌ Error handling request: ${error.message} (ID: ${startupId})`);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error', message: error.message }, null, 2));
  }
}

// Health endpoint handler
async function handleHealthEndpoint(req, res) {
  const uptimeSeconds = process.uptime();
  const data = {
    status: serverState.status,
    service: serverState.service,
    version: serverState.version,
    startupId: serverState.startupId,
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.round(uptimeSeconds * 100) / 100,
      formatted: formatUptime(uptimeSeconds),
      startTime: serverState.startTime.toISOString()
    },
    requests: {
      total: serverState.requestCount,
      lastRequest: serverState.lastRequestTime ? serverState.lastRequestTime.toISOString() : null
    },
    mcp: {
      servers: serverState.mcpServers,
      clients: serverState.mcpClients,
      tools: serverState.registeredTools,
      stats: mcpRouter.getStats()
    },
    system: {
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      pid: process.pid,
      memory: getMemoryUsage()
    },
    health: uptimeSeconds > 5 ? 'healthy' : 'warming_up'
  };

  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data, null, 2));
}

// Tools endpoint handler
async function handleToolsEndpoint(req, res) {
  if (req.method === 'GET') {
    const tools = mcpRouter.listTools();
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ tools }, null, 2));
  } else {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }, null, 2));
  }
}

// Servers endpoint handler
async function handleServersEndpoint(req, res) {
  if (req.method === 'GET') {
    const servers = Array.from(mcpRouter.servers.values());
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ servers }, null, 2));
  } else {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }, null, 2));
  }
}

// Clients endpoint handler
async function handleClientsEndpoint(req, res) {
  if (req.method === 'GET') {
    const clients = Array.from(mcpRouter.clients.values());
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ clients }, null, 2));
  } else {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }, null, 2));
  }
}

// Route endpoint handler for tool calls
async function handleRouteEndpoint(req, res) {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { tool, params, clientId } = JSON.parse(body);
        const result = await mcpRouter.routeToolCall(tool, params, clientId || 'anonymous');
        
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ success: true, result }, null, 2));
      } catch (error) {
        res.writeHead(400, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ error: error.message }, null, 2));
      }
    });
  } else {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }, null, 2));
  }
}

// Stats endpoint handler
async function handleStatsEndpoint(req, res) {
  const stats = mcpRouter.getStats();
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify({ stats }, null, 2));
}

// MCP Protocol handler (JSON-RPC over HTTP)
async function handleMCPProtocol(req, res) {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const jsonRpcRequest = JSON.parse(body);
        const response = await processMCPRequest(jsonRpcRequest);
        
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(response, null, 2));
      } catch (error) {
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
        res.end(JSON.stringify(errorResponse, null, 2));
      }
    });
  } else {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }, null, 2));
  }
}

// Process MCP JSON-RPC request
async function processMCPRequest(request) {
  const { method, params, id } = request;
  
  logWithTimestamp(`🔄 Processing MCP request: ${method} (ID: ${startupId})`);
  
  try {
    let result;
    
    switch (method) {
      case 'tools/list':
        result = { tools: mcpRouter.listTools() };
        break;
        
      case 'tools/call':
        result = await mcpRouter.routeToolCall(params.name, params.arguments, params.clientId);
        break;
        
      case 'servers/list':
        result = { servers: Array.from(mcpRouter.servers.values()) };
        break;
        
      case 'servers/register':
        mcpRouter.registerServer(params.id, params.config);
        result = { success: true };
        break;
        
      case 'ping':
        result = { pong: new Date().toISOString() };
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

// Create HTTP server with MCP Router
const server = http.createServer(handleRequest);

// Load MCP configuration on startup
loadMCPConfig();

// Register some sample servers and tools for demonstration
function initializeSampleData() {
  logWithTimestamp(`🔧 Initializing sample MCP data (ID: ${startupId})`);
  
  // Register sample servers
  mcpRouter.registerServer('file-server', {
    name: 'File Operations Server',
    description: 'Provides file system operations',
    endpoint: 'http://localhost:3002',
    status: 'active'
  });
  
  mcpRouter.registerServer('web-server', {
    name: 'Web Operations Server', 
    description: 'Provides web scraping and HTTP operations',
    endpoint: 'http://localhost:3003',
    status: 'active'
  });
  
  mcpRouter.registerServer('data-server', {
    name: 'Data Processing Server',
    description: 'Provides data analysis and processing tools',
    endpoint: 'http://localhost:3004', 
    status: 'active'
  });
  
  // Register sample tools
  mcpRouter.registerTool('read_file', {
    description: 'Read contents of a file',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to read' }
      },
      required: ['path']
    }
  }, 'file-server');
  
  mcpRouter.registerTool('write_file', {
    description: 'Write content to a file',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to write' },
        content: { type: 'string', description: 'Content to write to the file' }
      },
      required: ['path', 'content']
    }
  }, 'file-server');
  
  mcpRouter.registerTool('list_directory', {
    description: 'List contents of a directory',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the directory to list' }
      },
      required: ['path']
    }
  }, 'file-server');
  
  mcpRouter.registerTool('fetch_url', {
    description: 'Fetch content from a URL',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to fetch' },
        method: { type: 'string', description: 'HTTP method', enum: ['GET', 'POST'] }
      },
      required: ['url']
    }
  }, 'web-server');
  
  mcpRouter.registerTool('scrape_webpage', {
    description: 'Scrape and extract data from a webpage',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL of the webpage to scrape' },
        selector: { type: 'string', description: 'CSS selector for elements to extract' }
      },
      required: ['url']
    }
  }, 'web-server');
  
  mcpRouter.registerTool('analyze_data', {
    description: 'Analyze and process data',
    parameters: {
      type: 'object',
      properties: {
        data: { type: 'array', description: 'Data to analyze' },
        operation: { type: 'string', description: 'Analysis operation', enum: ['mean', 'median', 'mode', 'sum'] }
      },
      required: ['data', 'operation']
    }
  }, 'data-server');
  
  mcpRouter.registerTool('transform_data', {
    description: 'Transform data using specified operations',
    parameters: {
      type: 'object',
      properties: {
        data: { type: 'array', description: 'Data to transform' },
        transformations: { type: 'array', description: 'List of transformations to apply' }
      },
      required: ['data', 'transformations']
    }
  }, 'data-server');
  
  // Register a sample client
  mcpRouter.registerClient('web-client', {
    name: 'Web Client',
    description: 'Browser-based MCP client',
    type: 'web',
    userAgent: 'Mozilla/5.0 MCP Client'
  });
  
  logWithTimestamp(`✅ Sample MCP data initialized: ${mcpRouter.servers.size} servers, ${mcpRouter.tools.size} tools, ${mcpRouter.clients.size} clients (ID: ${startupId})`);
}

server.listen(mcpConfig.port, mcpConfig.host, () => {
  logWithTimestamp(`✅ MCP Router HTTP server listening on ${mcpConfig.host}:${mcpConfig.port} (ID: ${startupId})`);
  logWithTimestamp(`🌐 Server accessible at http://localhost:${mcpConfig.port} (ID: ${startupId})`);
  logWithTimestamp(`📋 Available endpoints:`);
  logWithTimestamp(`   GET  /health - Health check and status`);
  logWithTimestamp(`   GET  /api/mcp/tools - List all available tools`);
  logWithTimestamp(`   GET  /api/mcp/servers - List all registered servers`);
  logWithTimestamp(`   GET  /api/mcp/clients - List all registered clients`);
  logWithTimestamp(`   POST /api/mcp/route - Route tool calls`);
  logWithTimestamp(`   GET  /api/mcp/stats - Get routing statistics`);
  logWithTimestamp(`   POST /api/mcp/* - MCP JSON-RPC protocol endpoints`);
  serverState.status = 'running';
  
  // Initialize sample data after server starts
  initializeSampleData();
});

// Enhanced signal handlers with timestamps and IDs
process.on('SIGTERM', () => {
  logWithTimestamp(`⚠️  Received SIGTERM, shutting down gracefully... (ID: ${startupId})`);
  serverState.status = 'shutting_down';
  server.close(() => {
    logWithTimestamp(`👋 Server closed gracefully (ID: ${startupId})`);
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logWithTimestamp(`⚠️  Received SIGINT, shutting down gracefully... (ID: ${startupId})`);
  serverState.status = 'shutting_down';
  server.close(() => {
    logWithTimestamp(`👋 Server closed gracefully (ID: ${startupId})`);
    process.exit(0);
  });
});

// Enhanced error handling with timestamps and IDs
process.on('uncaughtException', (error) => {
  logWithTimestamp(`❌ Uncaught Exception (ID: ${startupId}): ${error.message}`);
  logWithTimestamp(`Stack: ${error.stack}`);
  serverState.status = 'error';
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logWithTimestamp(`❌ Unhandled Rejection (ID: ${startupId}): ${reason}`);
  logWithTimestamp(`Promise: ${promise}`);
  serverState.status = 'error';
});

process.on('exit', (code) => {
  logWithTimestamp(`🏁 Process exiting with code ${code} (ID: ${startupId})`);
});

logWithTimestamp(`🟢 Server process ready, waiting for requests... (ID: ${startupId})`);

// Basic server is now ready - all MCP functionality commented out for stability testing
*/
