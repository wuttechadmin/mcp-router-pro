# MCP Router Pro - Production Deployment Guide

## 🚀 **MCP Router Pro v3.0.0 - Complete Production Implementation**

The MCP Router has been fully enhanced with enterprise-grade features and is now production-ready with comprehensive security, monitoring, and real tool execution capabilities.

---

## 📋 **Table of Contents**

1. [Overview](#overview)
2. [Features](#features)
3. [Quick Start](#quick-start)
4. [Configuration](#configuration)
5. [Security Setup](#security-setup)
6. [Monitoring & Metrics](#monitoring--metrics)
7. [API Documentation](#api-documentation)
8. [WebSocket API](#websocket-api)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 **Overview**

MCP Router Pro is a production-ready Model Context Protocol (MCP) router that provides:

- **Real Tool Execution** - Actual filesystem, git, docker, and web operations
- **Enterprise Security** - API key authentication, rate limiting, CORS protection
- **Advanced Monitoring** - Real-time metrics, Prometheus integration, alerting
- **Enhanced WebSockets** - Secure real-time communication with room subscriptions
- **Configuration Management** - Runtime configuration updates and validation
- **Production Logging** - Configurable log levels with file and console output

---

## ✨ **Features**

### 🔧 **Real Tool Integration**
- **File Operations**: read_file, write_file, list_directory
- **Web Operations**: fetch_url, api_call
- **System Operations**: execute_command (with security restrictions)
- **Git Operations**: git_status
- **Docker Operations**: docker_ps
- **Search Operations**: search_files
- **Database Operations**: sql_query (configurable)

### 🔒 **Security & Authentication**
- **API Key Management** - Create, revoke, and manage API keys
- **Rate Limiting** - Configurable per-minute and per-hour limits
- **CORS Protection** - Configurable allowed origins
- **Payload Size Limits** - Prevent oversized requests
- **IP Blacklisting** - Block malicious IPs
- **Admin Permissions** - Granular permission system

### 📊 **Monitoring & Metrics**
- **Real-time Metrics** - CPU, memory, request counts, error rates
- **Prometheus Integration** - Standard metrics format
- **Health Checks** - Comprehensive health monitoring
- **Alerting** - Configurable thresholds and notifications
- **Historical Data** - Metric retention and aggregation

### 🔌 **Enhanced WebSocket Communication**
- **Secure Connections** - Authentication required for sensitive operations
- **Room Subscriptions** - Subscribe to metrics, tool executions, alerts
- **Message Validation** - Proper frame parsing and validation
- **Ping/Pong Heartbeat** - Connection health monitoring
- **Real-time Notifications** - Live updates for all MCP activities

---

## 🚀 **Quick Start**

### **Option 1: Docker (Recommended)**
```bash
# Navigate to project directory
cd c:\Development\droid-builder

# Run production server in Docker
wsl docker run --rm -p 3001:3001 \
  -v /mnt/c/Development/droid-builder:/app \
  -w /app \
  -e MCP_LOG_LEVEL=info \
  -e MCP_REQUIRE_API_KEY=true \
  -e MCP_ENABLE_REAL_TOOLS=true \
  node:20-alpine node server-pro.js
```

### **Option 2: Direct Node.js**
```bash
# Set environment variables
export MCP_LOG_LEVEL=info
export MCP_REQUIRE_API_KEY=true
export MCP_ENABLE_REAL_TOOLS=true

# Run the server
node server-pro.js
```

### **Option 3: Development Mode**
```bash
# Run without authentication (development only)
export MCP_REQUIRE_API_KEY=false
export MCP_LOG_LEVEL=debug
node server-pro.js
```

---

## ⚙️ **Configuration**

### **Environment Variables**

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_PORT` | Server port | `3001` |
| `MCP_HOST` | Server host | `0.0.0.0` |
| `MCP_LOG_LEVEL` | Log level (debug/info/warn/error) | `info` |
| `MCP_LOG_FILE` | Enable file logging | `false` |
| `MCP_LOG_CONSOLE` | Enable console logging | `true` |
| `MCP_REQUIRE_API_KEY` | Require API key authentication | `false` |
| `MCP_MAX_REQUESTS_PER_MINUTE` | Rate limit per minute | `100` |
| `MCP_MAX_REQUESTS_PER_HOUR` | Rate limit per hour | `1000` |
| `MCP_ENABLE_REAL_TOOLS` | Enable real tool execution | `true` |
| `MCP_WORKING_DIR` | Tool execution directory | `/app` |
| `MCP_ADMIN_KEY` | Admin API key | auto-generated |

### **Configuration File**

Create `/app/config/mcp-router.json`:
```json
{
  "server": {
    "port": 3001,
    "host": "0.0.0.0",
    "timeout": 30000
  },
  "security": {
    "requireApiKey": true,
    "maxRequestsPerMinute": 100,
    "maxRequestsPerHour": 1000,
    "allowedOrigins": ["*"]
  },
  "logging": {
    "level": "info",
    "enableFile": true,
    "enableConsole": true,
    "logDir": "/app/logs"
  },
  "tools": {
    "enableReal": true,
    "workingDir": "/app",
    "timeout": 30000,
    "allowedCommands": ["ls", "cat", "head", "tail", "grep", "find", "git", "docker"]
  },
  "monitoring": {
    "enabled": true,
    "healthCheckInterval": 15000
  }
}
```

---

## 🔐 **Security Setup**

### **1. API Key Authentication**

When `MCP_REQUIRE_API_KEY=true`, all requests require authentication:

```bash
# Get admin API key from startup logs
# Admin API Key: mcp_abc123...

# Use API key in requests
curl -H "Authorization: Bearer mcp_abc123..." http://localhost:3001/api/tools
curl -H "X-API-Key: mcp_abc123..." http://localhost:3001/health
curl "http://localhost:3001/health?api_key=mcp_abc123..."
```

### **2. Create Additional API Keys**

```bash
# Create read-only API key
curl -X POST http://localhost:3001/config \
  -H "Authorization: Bearer ADMIN_KEY" \
  -d '{"security.createApiKey": {"name": "readonly", "permissions": ["read"]}}'

# Create admin API key
curl -X POST http://localhost:3001/config \
  -H "Authorization: Bearer ADMIN_KEY" \
  -d '{"security.createApiKey": {"name": "admin2", "permissions": ["*"]}}'
```

### **3. Rate Limiting**

Configure rate limits in environment or config:
```bash
export MCP_MAX_REQUESTS_PER_MINUTE=50
export MCP_MAX_REQUESTS_PER_HOUR=500
```

---

## 📊 **Monitoring & Metrics**

### **Health Check Endpoint**
```bash
curl http://localhost:3001/health
```

Response includes:
- System health status
- Memory and CPU usage
- Request statistics
- MCP tool information
- WebSocket connections
- Security statistics

### **Metrics Endpoints**

**JSON Metrics:**
```bash
curl http://localhost:3001/metrics
```

**Prometheus Metrics:**
```bash
curl http://localhost:3001/metrics/prometheus
```

**Real-time Metrics via WebSocket:**
```javascript
const ws = new WebSocket('ws://localhost:3001/ws');
ws.send(JSON.stringify({
  type: 'auth',
  apiKey: 'your-api-key'
}));
ws.send(JSON.stringify({
  type: 'subscribe_metrics'
}));
```

### **Alerting**

The system automatically generates alerts for:
- High memory usage (>90%)
- High error rate (>10%)
- High CPU usage (>80%)
- Long response times (>5s)

Alerts are broadcast to WebSocket subscribers and logged.

---

## 🌐 **API Documentation**

### **HTTP Endpoints**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check with full statistics | No |
| GET | `/api/tools` | List all registered tools | Optional |
| GET | `/api/stats` | Get MCP router statistics | Optional |
| GET | `/metrics` | Get metrics snapshot | Optional |
| GET | `/metrics/prometheus` | Get Prometheus format metrics | Optional |
| GET | `/api/security/stats` | Get security statistics | Yes |
| GET | `/config` | Get current configuration | Admin |
| POST | `/config` | Update configuration | Admin |
| GET | `/logs` | View recent log entries | Optional |
| POST | `/api/mcp/jsonrpc` | JSON-RPC MCP protocol | Optional |
| WebSocket | `/ws` | Real-time communication | Yes* |

*WebSocket authentication required if `MCP_REQUIRE_API_KEY=true`

### **JSON-RPC Methods**

**List Tools:**
```bash
curl -X POST http://localhost:3001/api/mcp/jsonrpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": "1"
  }'
```

**Execute Tool:**
```bash
curl -X POST http://localhost:3001/api/mcp/jsonrpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "list_directory",
      "arguments": {"path": ".", "recursive": false}
    },
    "id": "2"
  }'
```

**Get Statistics:**
```bash
curl -X POST http://localhost:3001/api/mcp/jsonrpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "mcp/stats",
    "params": {},
    "id": "3"
  }'
```

**Ping:**
```bash
curl -X POST http://localhost:3001/api/mcp/jsonrpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "ping",
    "params": {},
    "id": "4"
  }'
```

---

## 🔌 **WebSocket API**

### **Connection & Authentication**
```javascript
const ws = new WebSocket('ws://localhost:3001/ws');

// Authenticate (if required)
ws.send(JSON.stringify({
  type: 'auth',
  apiKey: 'your-api-key'
}));

// Subscribe to metrics
ws.send(JSON.stringify({
  type: 'subscribe_metrics'
}));

// Subscribe to tool executions
ws.send(JSON.stringify({
  type: 'subscribe',
  room: 'tool-executions'
}));

// Execute tool via WebSocket
ws.send(JSON.stringify({
  type: 'execute_tool',
  toolName: 'list_directory',
  arguments: { path: '.' }
}));
```

### **WebSocket Message Types**

**Incoming Messages:**
- `auth` - Authenticate connection
- `subscribe` - Subscribe to room
- `unsubscribe` - Unsubscribe from room
- `execute_tool` - Execute a tool
- `subscribe_metrics` - Subscribe to metrics updates
- `manage_api_key` - Manage API keys (admin only)

**Outgoing Messages:**
- `welcome` - Connection established
- `tool_executed` - Tool execution completed
- `metrics-update` - Real-time metrics
- `alert` - System alert
- `error` - Error message

---

## 🏭 **Production Deployment**

### **Docker Production Setup**

**1. Create Production Dockerfile:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy application files
COPY *.js ./
COPY package*.json ./

# Install dependencies (if any)
# RUN npm install --production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mcpuser -u 1001

# Create directories
RUN mkdir -p /app/logs /app/config
RUN chown -R mcpuser:nodejs /app

USER mcpuser

EXPOSE 3001

CMD ["node", "server-pro.js"]
```

**2. Build and Run:**
```bash
docker build -t mcp-router-pro .

docker run -d \
  --name mcp-router-pro \
  -p 3001:3001 \
  -v /host/config:/app/config \
  -v /host/logs:/app/logs \
  -e MCP_REQUIRE_API_KEY=true \
  -e MCP_LOG_LEVEL=info \
  -e MCP_LOG_FILE=true \
  --restart unless-stopped \
  mcp-router-pro
```

### **Docker Compose Production Setup**

**docker-compose.prod.yml:**
```yaml
version: '3.8'

services:
  mcp-router-pro:
    build: .
    container_name: mcp-router-pro
    ports:
      - "3001:3001"
    volumes:
      - ./config:/app/config
      - ./logs:/app/logs
      - ./data:/app/data
    environment:
      - MCP_REQUIRE_API_KEY=true
      - MCP_LOG_LEVEL=info
      - MCP_LOG_FILE=true
      - MCP_MAX_REQUESTS_PER_MINUTE=100
      - MCP_MAX_REQUESTS_PER_HOUR=1000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    depends_on:
      - mcp-router-pro

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana
    depends_on:
      - prometheus

volumes:
  grafana-storage:
```

**prometheus.yml:**
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'mcp-router-pro'
    static_configs:
      - targets: ['mcp-router-pro:3001']
    metrics_path: '/metrics/prometheus'
```

### **Kubernetes Deployment**

**mcp-router-pro.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-router-pro
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mcp-router-pro
  template:
    metadata:
      labels:
        app: mcp-router-pro
    spec:
      containers:
      - name: mcp-router-pro
        image: mcp-router-pro:latest
        ports:
        - containerPort: 3001
        env:
        - name: MCP_REQUIRE_API_KEY
          value: "true"
        - name: MCP_LOG_LEVEL
          value: "info"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: mcp-router-pro-service
spec:
  selector:
    app: mcp-router-pro
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3001
  type: LoadBalancer
```

---

## 🔧 **Tool Security Configuration**

The real tool executor includes security restrictions:

### **Allowed Commands**
By default, only these commands are allowed:
- `ls`, `cat`, `head`, `tail`, `grep`, `find`
- `git` (for git operations)
- `docker` (for docker operations)
- `curl`, `ping` (for network operations)

### **Path Traversal Protection**
All file operations are restricted to the working directory (`/app` by default).

### **Resource Limits**
- Maximum output size: 1MB
- Command timeout: 30 seconds
- File size limits for read operations

### **Customize Security**
```bash
# Allow additional commands
export MCP_ALLOWED_COMMANDS="ls,cat,head,tail,grep,find,git,docker,curl,ping,ps,df"

# Change working directory
export MCP_WORKING_DIR="/safe/directory"

# Adjust timeouts
export MCP_TOOL_TIMEOUT=60000
```

---

## 🐛 **Troubleshooting**

### **Common Issues**

**1. Port Already in Use**
```bash
# Check what's using the port
netstat -ano | findstr :3001

# Kill the process or use a different port
export MCP_PORT=3002
```

**2. Permission Denied (Docker)**
```bash
# Ensure proper volume permissions
sudo chown -R 1001:1001 /host/logs /host/config
```

**3. API Key Authentication Issues**
```bash
# Check admin key in logs
docker logs mcp-router-pro | grep "Admin API Key"

# Test without authentication
export MCP_REQUIRE_API_KEY=false
```

**4. WebSocket Connection Issues**
```bash
# Check WebSocket endpoint
curl -H "Upgrade: websocket" http://localhost:3001/ws

# Verify authentication if required
```

### **Debug Mode**
```bash
# Enable debug logging
export MCP_LOG_LEVEL=debug

# Monitor logs
docker logs -f mcp-router-pro
```

### **Health Check**
```bash
# Comprehensive health check
curl -s http://localhost:3001/health | jq .

# Check specific metrics
curl -s http://localhost:3001/metrics | jq .
```

---

## 📈 **Performance Optimization**

### **Recommended Production Settings**
```bash
# Production environment variables
export MCP_LOG_LEVEL=warn
export MCP_MAX_REQUESTS_PER_MINUTE=200
export MCP_MAX_REQUESTS_PER_HOUR=5000
export MCP_WS_MAX_CONNECTIONS=200
export MCP_TOOL_TIMEOUT=60000
```

### **Resource Monitoring**
- Monitor `/health` endpoint for system metrics
- Set up Prometheus + Grafana for visualization
- Configure alerts for high memory/CPU usage
- Monitor error rates and response times

### **Scaling Considerations**
- Run multiple instances behind a load balancer
- Use Redis for shared session storage (if needed)
- Consider database backend for tool results
- Implement request queuing for high loads

---

## 🎉 **Success! Production-Ready MCP Router**

Your MCP Router Pro is now fully equipped with:

✅ **Real Tool Execution** - Actual filesystem, git, docker operations  
✅ **Enterprise Security** - API keys, rate limiting, CORS protection  
✅ **Advanced Monitoring** - Real-time metrics, alerts, Prometheus  
✅ **Enhanced WebSockets** - Secure real-time communication  
✅ **Configuration Management** - Runtime updates and validation  
✅ **Production Logging** - Configurable levels and outputs  
✅ **Comprehensive Documentation** - Complete deployment guide  

**Next Steps:**
1. Deploy in your production environment
2. Set up monitoring dashboards
3. Configure alerting
4. Add custom tools as needed
5. Scale horizontally as required

The MCP Router is now **enterprise-ready** and **production-hardened**! 🚀
