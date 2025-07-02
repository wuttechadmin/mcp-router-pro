const http = require('http');

console.log('MCP Router starting...');

// Add process monitoring
console.log(`Process PID: ${process.pid}`);
console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform} (${process.arch})`);
console.log(`Memory usage at startup: ${JSON.stringify(process.memoryUsage())}`);

// Add periodic heartbeat to detect when the process is alive
const heartbeatInterval = setInterval(() => {
    const memUsage = process.memoryUsage();
    console.log(`💓 Heartbeat - PID: ${process.pid}, Uptime: ${Math.round(process.uptime())}s, Memory: ${Math.round(memUsage.rss/1024/1024)}MB`);
}, 15000); // Every 15 seconds

// Clear heartbeat on exit
const cleanup = () => {
    console.log('🧹 Cleanup: Clearing heartbeat interval');
    clearInterval(heartbeatInterval);
};

process.on('exit', cleanup);
process.on('beforeExit', () => {
    console.log('⚠️ beforeExit event triggered');
    cleanup();
});

const server = http.createServer((req, res) => {
    // Log each request
    console.log(`${req.method} ${req.url} from ${req.connection.remoteAddress || 'unknown'}`);
    
    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    
    if (req.url === '/health') {
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        }));
        console.log('Health check responded');
    } else {
        res.end(JSON.stringify({
            status: 'MCP Router Active',
            version: '1.0.0',
            port: 3001,
            uptime: process.uptime(),
            services: [
                'filesystem', 'git', 'memory', 'sqlite', 'postgres',
                'docker', 'brave-search', 'github', 'slack', 'prometheus',
                'jupyter', 'e2b', 'openapi', 'email'
            ]
        }));
        console.log('Main endpoint responded');
    }
});

server.listen(3001, '0.0.0.0', () => {
    console.log('✅ MCP Router HTTP server listening on port 3001');
});

// Keep the process alive
process.on('SIGTERM', () => {
    console.log('⚠️ Received SIGTERM, shutting down gracefully');
    cleanup();
    server.close();
});

process.on('SIGINT', () => {
    console.log('⚠️ Received SIGINT, shutting down gracefully');
    cleanup();
    server.close();
});

process.on('SIGHUP', () => {
    console.log('⚠️ Received SIGHUP');
});

process.on('SIGQUIT', () => {
    console.log('⚠️ Received SIGQUIT');
});

// Add error handling
process.on('uncaughtException', (err) => {
    console.log(`❌ UNCAUGHT EXCEPTION: ${err.message}`);
    console.log(`❌ Stack: ${err.stack}`);
    console.log('❌ Process will exit due to uncaught exception');
});

process.on('unhandledRejection', (reason, promise) => {
    console.log(`❌ UNHANDLED REJECTION: ${reason}`);
    console.log(`❌ Promise: ${promise}`);
});
