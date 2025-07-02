const http = require('http');

console.log('MCP Router starting...');

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    
    if (req.url === '/health') {
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString()
        }));
    } else {
        res.end(JSON.stringify({
            status: 'MCP Router Active',
            version: '1.0.0',
            port: 3001,
            timestamp: new Date().toISOString(),
            endpoints: {
                health: '/health',
                status: '/'
            }
        }));
    }
});

const PORT = process.env.MCP_ROUTER_PORT || 3001;
const HOST = process.env.MCP_ROUTER_HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`MCP Router listening on http://${HOST}:${PORT}`);
    console.log('Health check available at: /health');
});

server.on('error', (err) => {
    console.error('Server error:', err);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});
