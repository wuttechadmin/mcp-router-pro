const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello World\n');
});

server.listen(3001, '0.0.0.0', () => {
    console.log('Server running on port 3001');
});

// Keep process alive
setInterval(() => {
    console.log('Still alive:', new Date().toISOString());
}, 10000);
