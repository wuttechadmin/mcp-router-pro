const http = require('http');
const fs = require('fs');
const path = require('path');

// Setup file logging
const logDir = './logs';
const logFile = path.join(logDir, 'mcp-router-local.log');

// Create logs directory if it doesn't exist
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Logging function that writes to both console and file
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

log('MCP Router starting locally...');

const server = http.createServer((req, res) => {
    // Log each request
    log(`${req.method} ${req.url} from ${req.connection.remoteAddress || 'unknown'}`);
    
    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    
    if (req.url === '/health') {
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString()
        }));
        log('Health check responded');
    } else if (req.url === '/logs') {
        // Add endpoint to view recent logs
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
    } else {
        res.end(JSON.stringify({
            status: 'MCP Router Active (Local Test)',
            version: '1.0.0',
            port: 3002,
            logFile: logFile,
            services: [
                'filesystem', 'git', 'memory', 'sqlite', 'postgres',
                'docker', 'brave-search', 'github', 'slack', 'prometheus',
                'jupyter', 'e2b', 'openapi', 'email'
            ]
        }));
        log('Main endpoint responded');
    }
});

server.listen(3002, '0.0.0.0', () => {
    log('✅ MCP Router HTTP server listening on port 3002');
    log('Log file location: ' + logFile);
});

// Keep the process alive
process.on('SIGTERM', () => {
    log('Received SIGTERM, shutting down gracefully');
    server.close();
});

process.on('SIGINT', () => {
    log('Received SIGINT, shutting down gracefully');
    server.close();
});

// Add error handling
process.on('uncaughtException', (err) => {
    log(`UNCAUGHT EXCEPTION: ${err.message}`);
    log(`Stack: ${err.stack}`);
});

process.on('unhandledRejection', (reason, promise) => {
    log(`UNHANDLED REJECTION: ${reason}`);
});
