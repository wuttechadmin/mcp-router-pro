const http = require('http');

console.log('Minimal MCP Router starting...');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    }));
});

server.listen(3001, '0.0.0.0', () => {
    console.log('✅ Minimal server listening on port 3001');
});

// Basic signal handling
process.on('SIGTERM', () => {
    console.log('Received SIGTERM');
    server.close();
});

process.on('SIGINT', () => {
    console.log('Received SIGINT');
    server.close();
});
