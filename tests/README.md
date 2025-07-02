# 🧪 MCP Router Pro Test Suite

Comprehensive test suite for MCP Router Pro including unit tests, integration tests, load testing, and validation scripts.

## 📁 Test Organization

```
tests/
├── README.md                  # This file - test documentation
├── test-suite-advanced.js     # Advanced test suite (main test runner)
├── load-test-runner.js        # Load testing and performance tests
├── test-local.js              # Local development tests
├── test-server.js             # Server functionality tests
├── test-*.json                # Test data and configuration files
├── test-mcp-integration.ps1   # PowerShell MCP integration tests
└── validate-*.ps1             # Validation and health check scripts
```

## 🚀 **Running Tests**

### Quick Test Commands
```bash
# Run all tests
npm test

# Run load tests
npm run test:load

# Run specific test file
node tests/test-suite-advanced.js

# Run PowerShell integration tests
./tests/test-mcp-integration.ps1

# Run validation scripts
./tests/validate-mcp-stack.ps1
./tests/validate-mcp-stack-wsl.ps1
```

### Test Categories

#### 🔧 **Unit Tests**
- **Server functionality** - Core server operations
- **MCP protocol** - Protocol compliance and message handling
- **Security** - Authentication, authorization, rate limiting
- **WebSocket** - Real-time communication features
- **API endpoints** - REST API functionality

#### 🌐 **Integration Tests**  
- **End-to-end workflows** - Complete request/response cycles
- **MCP server connections** - External MCP server integration
- **Database connectivity** - Data persistence and retrieval
- **Admin dashboard** - Web interface functionality

#### ⚡ **Performance Tests**
- **Load testing** - High concurrent request handling
- **Stress testing** - System limits and failure modes
- **Memory usage** - Memory leaks and optimization
- **Response times** - Latency and throughput metrics

#### ✅ **Validation Tests**
- **Health checks** - System health validation
- **Configuration** - Environment and config validation  
- **Deployment** - Post-deployment verification
- **Security** - Security configuration validation

## 📊 **Test Results & Reporting**

### Test Output
Tests generate detailed output including:
- **Pass/Fail status** for each test case
- **Performance metrics** (response times, throughput)
- **Error logs** and stack traces
- **Coverage reports** (when available)
- **Security scan results**

### Continuous Integration
Tests are automatically run in the CI/CD pipeline:
- **On every push** to main branch
- **On pull requests** 
- **Scheduled nightly** full test runs
- **Before deployments** to production

## 🔧 **Test Configuration**

### Environment Variables for Testing
```bash
# Test server configuration
TEST_PORT=3002
TEST_HOST=localhost
TEST_TIMEOUT=30000

# Test data
TEST_API_KEY=test-key-123
TEST_ADMIN_KEY=admin-test-key

# External services (optional)
TEST_MCP_SERVER_URL=http://localhost:3003
TEST_DATABASE_URL=sqlite://test.db
```

### Test Data Files
- **test-ping.json** - Basic connectivity tests
- **test-jsonrpc.json** - JSON-RPC protocol tests  
- **test-tool-call.json** - Tool execution tests
- **test-tools-list.json** - Tools listing tests

## 🧪 **Writing New Tests**

### Test Structure
```javascript
// tests/example-test.js
const { runTest, assertResult } = require('./test-framework');

async function testExample() {
    console.log('🧪 Testing example functionality...');
    
    try {
        // Test implementation
        const result = await someFunction();
        
        // Assertions
        assertResult(result.status === 'success', 'Function should return success');
        assertResult(result.data, 'Function should return data');
        
        console.log('✅ Example test passed');
        return true;
    } catch (error) {
        console.error('❌ Example test failed:', error.message);
        return false;
    }
}

// Export for test runner
module.exports = { testExample };
```

### PowerShell Test Structure
```powershell
# tests/example-test.ps1
Write-Host "🧪 Testing PowerShell functionality..." -ForegroundColor Cyan

try {
    # Test implementation
    $result = Invoke-RestMethod -Uri "http://localhost:3001/health"
    
    # Assertions
    if ($result.status -eq "healthy") {
        Write-Host "✅ Health check passed" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "❌ Health check failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Test error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
```

## 📈 **Test Metrics & Monitoring**

### Key Metrics Tracked
- **Test execution time** - How long tests take to run
- **Pass/fail rates** - Test reliability over time
- **Code coverage** - Percentage of code tested
- **Performance trends** - Response time changes
- **Error patterns** - Common failure modes

### Test Reports
Test results are available in:
- **Console output** during test runs
- **GitHub Actions** workflow logs
- **Test artifacts** (when configured)
- **Performance dashboards** (for load tests)

## 🔧 **Troubleshooting Tests**

### Common Issues
1. **Port conflicts** - Ensure test ports are available
2. **Environment setup** - Check environment variables
3. **Network connectivity** - Verify external service access
4. **Permissions** - Ensure proper file/network permissions
5. **Dependencies** - Verify all test dependencies are installed

### Debug Mode
Enable detailed test logging:
```bash
# Enable debug output
DEBUG=test:* npm test

# Run specific test with verbose output
node tests/test-suite-advanced.js --verbose
```

## 🤝 **Contributing Tests**

When adding new tests:
1. **Follow naming conventions** - Use descriptive test names
2. **Add documentation** - Document test purpose and setup
3. **Include assertions** - Verify expected outcomes
4. **Handle errors** - Graceful error handling and reporting
5. **Update this README** - Document new test categories or procedures

---

**🧪 Quality is not an accident. It is always the result of intelligent effort.**

*Comprehensive testing ensures MCP Router Pro delivers reliable, secure, and performant service.*
