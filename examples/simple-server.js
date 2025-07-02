console.log('Simple test server starting...');

const http = require('http');

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from simple server!\n');
});

server.listen(3001, '0.0.0.0', () => {
  console.log('Simple server listening on port 3001');
});

console.log('Server setup complete');
