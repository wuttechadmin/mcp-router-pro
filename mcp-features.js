// MCP Features Module - All experimental MCP functionality
// This module can be safely loaded/unloaded without affecting core stability

class MCPFeatures {
    constructor(log) {
        this.log = log;
        this.mcpData = {
            servers: new Map(),
            tools: new Map(),
            clients: new Map(),
            stats: {
                totalRequests: 0,
                toolCalls: 0,
                serverRegistrations: 0,
                clientRegistrations: 0
            }
        };
        this.log('📦 MCP Features module initialized');
    }

    // Tool registration
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
            this.log(`🔧 Registered tool: ${name} for server: ${serverId}`);
            return true;
        } catch (error) {
            this.log(`❌ Error registering tool ${name}: ${error.message}`);
            return false;
        }
    }

    // Get tools list
    getToolsList() {
        return Array.from(this.mcpData.tools.values()).map(tool => ({
            name: tool.name,
            description: tool.description,
            serverId: tool.serverId,
            usageCount: tool.usageCount,
            lastUsed: tool.lastUsed,
            registeredAt: tool.registeredAt
        }));
    }

    // Get MCP stats
    getMCPStats() {
        return {
            servers: this.mcpData.servers.size,
            tools: this.mcpData.tools.size,
            clients: this.mcpData.clients.size,
            stats: this.mcpData.stats,
            uptime: process.uptime()
        };
    }

    // Update request stats
    updateRequestStats() {
        this.mcpData.stats.totalRequests++;
    }

    // Register sample tools
    registerSampleTools() {
        this.log('🔧 Registering sample tools...');
        this.registerTool('read_file', 'Read contents of a file', 'file-server');
        this.registerTool('write_file', 'Write content to a file', 'file-server');
        this.registerTool('list_directory', 'List directory contents', 'file-server');
        this.registerTool('fetch_url', 'Fetch content from a URL', 'web-server');
        this.registerTool('scrape_webpage', 'Scrape data from a webpage', 'web-server');
        this.registerTool('git_status', 'Get git repository status', 'git-server');
        this.registerTool('docker_ps', 'List running containers', 'docker-server');
        this.log(`✅ Registered ${this.mcpData.tools.size} sample tools`);
    }

    // JSON-RPC handler (experimental)
    handleJSONRPC(req, res) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const request = JSON.parse(body);
                this.log(`📨 JSON-RPC request: ${request.method} (ID: ${request.id})`);
                
                const response = await this.processJSONRPCRequest(request);
                
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify(response));
                this.log(`📤 JSON-RPC response sent for method: ${request.method}`);
            } catch (error) {
                this.log(`❌ JSON-RPC error: ${error.message}`);
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
            }
        });
    }

    async processJSONRPCRequest(request) {
        const { method, params, id } = request;
        
        try {
            let result;
            
            switch (method) {
                case 'tools/list':
                    result = { tools: this.getToolsList() };
                    break;
                    
                case 'tools/call':
                    this.mcpData.stats.toolCalls++;
                    // Mock tool call for now
                    result = {
                        tool: params.name,
                        result: `Mock result for ${params.name}`,
                        timestamp: new Date().toISOString()
                    };
                    this.log(`🔧 Mock tool call: ${params.name}`);
                    break;
                    
                case 'mcp/stats':
                    result = this.getMCPStats();
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
}

module.exports = MCPFeatures;
