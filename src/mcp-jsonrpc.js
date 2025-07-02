// MCP JSON-RPC Handler Module
// This module provides JSON-RPC functionality for the MCP Router

const fs = require('fs');

// JSON-RPC handler function
function handleJSONRPC(req, res, mcpData, log) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
        try {
            const request = JSON.parse(body);
            log(`📨 JSON-RPC request: ${request.method} (ID: ${request.id})`);
            
            const response = await processJSONRPCRequest(request, mcpData, log);
            
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify(response));
            log(`📤 JSON-RPC response sent for method: ${request.method}`);
        } catch (error) {
            log(`❌ JSON-RPC error: ${error.message}`);
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

// Process individual JSON-RPC requests
async function processJSONRPCRequest(request, mcpData, log) {
    const { method, params, id } = request;
    
    try {
        let result;
        
        switch (method) {
            case 'tools/list':
                result = { 
                    tools: Array.from(mcpData.tools.values()).map(tool => ({
                        name: tool.name,
                        description: tool.description,
                        serverId: tool.serverId,
                        usageCount: tool.usageCount,
                        lastUsed: tool.lastUsed,
                        registeredAt: tool.registeredAt
                    }))
                };
                break;
                
            case 'tools/call':
                if (!params || !params.name) {
                    throw new Error('Tool name is required');
                }
                
                mcpData.stats.toolCalls++;
                
                // Mock tool call for now - in real implementation this would route to actual servers
                result = {
                    tool: params.name,
                    arguments: params.arguments || {},
                    result: `Mock result for ${params.name} with args: ${JSON.stringify(params.arguments || {})}`,
                    timestamp: new Date().toISOString(),
                    success: true
                };
                
                // Update tool usage stats if tool exists
                if (mcpData.tools.has(params.name)) {
                    const tool = mcpData.tools.get(params.name);
                    tool.usageCount++;
                    tool.lastUsed = new Date();
                }
                
                log(`🔧 Mock tool call: ${params.name}`);
                break;
                
            case 'mcp/stats':
                result = {
                    servers: mcpData.servers.size,
                    tools: mcpData.tools.size,
                    clients: mcpData.clients.size,
                    stats: mcpData.stats,
                    uptime: process.uptime()
                };
                break;
                
            case 'ping':
                result = { 
                    pong: new Date().toISOString(),
                    uptime: process.uptime(),
                    pid: process.pid
                };
                break;
                
            case 'server/info':
                result = {
                    name: 'MCP Router',
                    version: '1.0.0',
                    protocolVersion: '2024-11-05',
                    capabilities: {
                        tools: { listChanged: true },
                        logging: {},
                        prompts: {},
                        resources: {}
                    },
                    serverInfo: {
                        name: 'mcp-router',
                        version: '1.0.0'
                    }
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

// Export the handler function
module.exports = {
    handleJSONRPC
};
