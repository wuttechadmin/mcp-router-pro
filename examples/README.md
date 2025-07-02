# 🎯 MCP Router Pro Examples

Collection of examples demonstrating various MCP Router Pro features and integration patterns.

## 📁 Examples Organization

```
examples/
├── README.md                  # This file - examples documentation
├── 🚀 Server Examples/
│   ├── basic-server.js        # Simple MCP server implementation
│   ├── minimal-server.js      # Minimal server with core features
│   ├── simple-server.js       # Basic server with authentication
│   ├── enhanced-server.js     # Enhanced server with WebSocket
│   ├── stable-server.js       # Stable server with error handling
│   ├── server-advanced.js     # Advanced server with full features
│   ├── websocket-server.js    # WebSocket-focused server
│   └── jsonrpc-server.js      # JSON-RPC protocol server
├── 🔌 Client Examples/
│   └── (to be added)          # Client integration examples
├── 🛠️ Integration Examples/
│   └── run_memvid_example.bat # Memvid integration example
└── 📚 Documentation/
    └── (example-specific docs) # Individual example documentation
```

## 🚀 **Server Examples**

### 1. **Basic Server** (`basic-server.js`)
Simple MCP server with minimal features.
```bash
node examples/basic-server.js
# Runs on http://localhost:3001
```
**Features**: Basic HTTP server, simple routing, health check

### 2. **Minimal Server** (`minimal-server.js`)  
Lightweight server focusing on core MCP functionality.
```bash
node examples/minimal-server.js
# Runs on http://localhost:3001
```
**Features**: MCP protocol support, minimal dependencies

### 3. **Simple Server** (`simple-server.js`)
Basic server with authentication and security.
```bash
node examples/simple-server.js
# Runs on http://localhost:3001
```
**Features**: API key authentication, basic security, CORS

### 4. **Enhanced Server** (`enhanced-server.js`)
Server with WebSocket support and advanced features.
```bash
node examples/enhanced-server.js
# Runs on http://localhost:3001
```
**Features**: WebSocket support, real-time messaging, enhanced routing

### 5. **Stable Server** (`stable-server.js`)
Production-like server with comprehensive error handling.
```bash
node examples/stable-server.js
# Runs on http://localhost:3001
```
**Features**: Error handling, logging, graceful shutdown, monitoring

### 6. **Advanced Server** (`server-advanced.js`)
Full-featured server with all advanced capabilities.
```bash
node examples/server-advanced.js
# Runs on http://localhost:3001
```
**Features**: Full MCP protocol, WebSocket, metrics, admin dashboard

### 7. **WebSocket Server** (`websocket-server.js`)
Specialized server focusing on WebSocket communication.
```bash
node examples/websocket-server.js
# Runs on http://localhost:3001
```
**Features**: WebSocket-first design, real-time communication, message routing

### 8. **JSON-RPC Server** (`jsonrpc-server.js`)
Server implementing JSON-RPC protocol specifically.
```bash
node examples/jsonrpc-server.js
# Runs on http://localhost:3001
```
**Features**: JSON-RPC 2.0 compliance, batch requests, notification support

## 🔧 **Running Examples**

### Prerequisites
```bash
# Install dependencies (from project root)
npm install

# Ensure ports are available
netstat -an | findstr :3001
```

### Quick Start
```bash
# Run any example server
node examples/basic-server.js

# Test the server
curl http://localhost:3001/health

# Test with authentication (for servers that require it)
curl -H "X-API-Key: demo-key" http://localhost:3001/api/tools
```

### Development Mode
```bash
# Run with automatic restart on changes (if nodemon is installed)
npx nodemon examples/enhanced-server.js

# Run with debug output
DEBUG=mcp:* node examples/server-advanced.js
```

## 🎯 **Example Use Cases**

### 1. **Learning MCP Protocol**
Start with `basic-server.js` to understand:
- HTTP request handling
- Basic routing
- Health check implementation
- Simple response formatting

### 2. **Adding Authentication**
Move to `simple-server.js` to learn:
- API key validation
- Request authentication
- Security headers
- CORS configuration

### 3. **Real-time Features**
Use `websocket-server.js` to explore:
- WebSocket connections
- Real-time messaging
- Connection management
- Event broadcasting

### 4. **Production Deployment**
Study `stable-server.js` for:
- Error handling patterns
- Logging strategies
- Graceful shutdown
- Health monitoring

### 5. **Full Integration**
Reference `server-advanced.js` for:
- Complete MCP implementation
- Admin dashboard
- Metrics collection
- Production features

## 🔌 **Integration Examples**

### Memvid Integration (`run_memvid_example.bat`)
Demonstrates integration with Memvid for AI memory capabilities.
```bash
# Windows
./examples/run_memvid_example.bat

# PowerShell
powershell -ExecutionPolicy Bypass -File examples/run_memvid_example.bat
```

## 📚 **Example Documentation**

Each example includes:
- **Purpose** - What the example demonstrates
- **Features** - List of implemented features
- **Usage** - How to run and test the example
- **Code comments** - Inline explanations
- **Curl commands** - Test commands for verification

## 🧪 **Testing Examples**

### Manual Testing
```bash
# Health check (all servers)
curl http://localhost:3001/health

# API tools (authenticated servers)
curl -H "X-API-Key: demo-key" http://localhost:3001/api/tools

# WebSocket test (WebSocket servers)
# Use browser console or WebSocket client tool
```

### Automated Testing
```bash
# Test all examples (if test script exists)
npm run test:examples

# Test specific example
node tests/test-example.js basic-server
```

## 🔄 **Progression Path**

**Recommended learning progression**:

1. **🟢 Start**: `basic-server.js` - Learn fundamentals
2. **🟡 Security**: `simple-server.js` - Add authentication  
3. **🔵 Real-time**: `websocket-server.js` - WebSocket features
4. **🟠 Reliability**: `stable-server.js` - Error handling
5. **🔴 Production**: `server-advanced.js` - Full features

## 🤝 **Contributing Examples**

When adding new examples:

1. **Follow naming convention** - Use descriptive, hyphenated names
2. **Include documentation** - Add purpose and usage instructions
3. **Add comments** - Explain key concepts in code
4. **Provide test commands** - Include curl commands for testing
5. **Update this README** - Document the new example

### Example Template
```javascript
// examples/my-example.js
/**
 * My Example Server
 * 
 * Purpose: Demonstrate [specific feature]
 * Features: [list key features]
 * Usage: node examples/my-example.js
 * Test: curl http://localhost:3001/[endpoint]
 */

const http = require('http');

// Server implementation
const server = http.createServer((req, res) => {
    // Example logic
});

server.listen(3001, () => {
    console.log('🚀 My Example server running on http://localhost:3001');
});
```

---

**🎯 Examples are the best teachers. Learn by doing, understand by building.**

*These examples provide hands-on experience with MCP Router Pro features and integration patterns.*
