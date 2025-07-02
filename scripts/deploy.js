#!/usr/bin/env node

/**
 * MCP Router Pro - Deployment Script
 * Automated deployment for different environments
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DeploymentManager {
    constructor() {
        this.environments = {
            local: {
                name: 'Local Development',
                port: 3001,
                image: 'mcp-router-pro:local',
                healthUrl: 'http://localhost:3001'
            },
            staging: {
                name: 'Staging Environment',
                port: 3002,
                image: 'mcp-router-pro:staging',
                healthUrl: 'http://localhost:3002'
            },
            production: {
                name: 'Production Environment',
                port: 3003,
                image: 'mcp-router-pro:production',
                healthUrl: 'http://localhost:3003'
            }
        };
        
        this.currentStep = 0;
        this.totalSteps = 0;
    }

    /**
     * Log with step counter
     */
    log(message, isStep = false) {
        if (isStep) {
            this.currentStep++;
            console.log(`\n[${this.currentStep}/${this.totalSteps}] ${message}`);
        } else {
            console.log(`    ${message}`);
        }
    }

    /**
     * Execute command with error handling
     */
    exec(command, options = {}) {
        try {
            const result = execSync(command, { 
                encoding: 'utf8', 
                stdio: 'pipe',
                ...options 
            });
            return result.trim();
        } catch (error) {
            throw new Error(`Command failed: ${command}\n${error.message}`);
        }
    }

    /**
     * Check if Docker is available
     */
    checkDocker() {
        try {
            this.exec('docker --version');
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if WSL is available
     */
    checkWSL() {
        try {
            this.exec('wsl --version');
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Build Docker image
     */
    buildImage(environment) {
        const env = this.environments[environment];
        
        this.log(`Building Docker image: ${env.image}`, true);
        
        // Create Dockerfile if it doesn't exist
        if (!fs.existsSync('Dockerfile')) {
            this.createDockerfile();
        }

        // Build the image
        this.exec(`docker build -t ${env.image} .`);
        this.log(`✅ Image built successfully: ${env.image}`);
    }

    /**
     * Create Dockerfile
     */
    createDockerfile() {
        const dockerfile = `
# MCP Router Pro - Production Dockerfile
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY server-pro.js ./
COPY mcp-*.js ./
COPY *.json ./

# Create logs directory
RUN mkdir -p /app/logs

# Expose port
EXPOSE 3001

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3001/health || exit 1

# Run as non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Start the application
CMD ["node", "server-pro.js"]
`;
        
        fs.writeFileSync('Dockerfile', dockerfile.trim());
        this.log('📄 Created Dockerfile');
    }

    /**
     * Deploy to environment
     */
    async deploy(environment) {
        if (!this.environments[environment]) {
            throw new Error(`Unknown environment: ${environment}`);
        }

        const env = this.environments[environment];
        
        console.log(`🚀 Deploying MCP Router Pro to ${env.name}`);
        console.log(`Target: ${env.healthUrl}`);
        console.log(`Port: ${env.port}`);
        console.log('=' .repeat(60));

        // Set total steps
        this.totalSteps = 8;
        this.currentStep = 0;

        // Pre-deployment checks
        this.log('Running pre-deployment checks', true);
        
        if (!this.checkDocker()) {
            throw new Error('Docker is not available. Please install Docker.');
        }
        this.log('✅ Docker is available');

        // Stop existing container
        this.log('Stopping existing containers', true);
        try {
            this.exec(`docker stop mcp-router-${environment}`);
            this.exec(`docker rm mcp-router-${environment}`);
            this.log('✅ Stopped existing container');
        } catch (error) {
            this.log('ℹ️  No existing container to stop');
        }

        // Build new image
        this.buildImage(environment);

        // Run new container
        this.log(`Starting new container`, true);
        const dockerCommand = `docker run -d --name mcp-router-${environment} ` +
                             `-p ${env.port}:3001 ` +
                             `-e NODE_ENV=${environment} ` +
                             `-e MCP_ADMIN_KEY=${process.env.MCP_ADMIN_KEY || 'admin-key-123'} ` +
                             `-v ${process.cwd()}/logs:/app/logs ` +
                             `${env.image}`;
        
        const containerId = this.exec(dockerCommand);
        this.log(`✅ Container started: ${containerId.substring(0, 12)}`);

        // Wait for startup
        this.log('Waiting for service to start', true);
        await this.waitForService(env.healthUrl);
        this.log('✅ Service is responding');

        // Run health checks
        this.log('Running health checks', true);
        await this.runHealthChecks(env.healthUrl);
        this.log('✅ Health checks passed');

        // Run smoke tests
        this.log('Running smoke tests', true);
        await this.runSmokeTests(env.healthUrl);
        this.log('✅ Smoke tests passed');

        // Final status
        this.log('Deployment completed successfully', true);
        this.log(`🎯 Service is running at: ${env.healthUrl}`);
        this.log(`📊 Admin dashboard: ${env.healthUrl.replace('3001', '3004')}`);
        this.log(`🔍 Container logs: docker logs mcp-router-${environment}`);
        
        return { success: true, url: env.healthUrl, containerId };
    }

    /**
     * Wait for service to be ready
     */
    async waitForService(url, maxAttempts = 30) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const response = await fetch(url + '/health');
                if (response.ok) {
                    return;
                }
            } catch (error) {
                // Service not ready yet
            }
            
            this.log(`Waiting for service... (${attempt}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        throw new Error('Service failed to start within timeout period');
    }

    /**
     * Run health checks
     */
    async runHealthChecks(baseUrl) {
        const { ProductionMonitor } = require('./production-monitor');
        const monitor = new ProductionMonitor(baseUrl);
        monitor.setupStandardChecks();
        
        const results = await monitor.runHealthChecks();
        
        if (results.status === 'unhealthy') {
            throw new Error(`Health checks failed: ${results.failed} failures`);
        }
        
        if (results.status === 'degraded') {
            this.log(`⚠️  Service has warnings but is operational`);
        }
    }

    /**
     * Run smoke tests
     */
    async runSmokeTests(baseUrl) {
        const tests = [
            { name: 'Health endpoint', url: '/health' },
            { name: 'API tools', url: '/api/tools' },
            { name: 'API stats', url: '/api/stats' }
        ];
        
        for (const test of tests) {
            const response = await fetch(baseUrl + test.url);
            if (!response.ok) {
                throw new Error(`Smoke test failed: ${test.name} returned ${response.status}`);
            }
        }
        
        // Test JSON-RPC
        const rpcResponse = await fetch(baseUrl + '/api/mcp/jsonrpc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'ping',
                id: 'smoke-test'
            })
        });
        
        if (!rpcResponse.ok) {
            throw new Error(`JSON-RPC smoke test failed: ${rpcResponse.status}`);
        }
    }

    /**
     * List running deployments
     */
    listDeployments() {
        console.log('🔍 MCP Router Pro - Active Deployments');
        console.log('=' .repeat(60));
        
        try {
            const containers = this.exec('docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}" --filter "name=mcp-router"');
            console.log(containers);
        } catch (error) {
            console.log('No active deployments found');
        }
    }

    /**
     * Stop deployment
     */
    stopDeployment(environment) {
        console.log(`🛑 Stopping MCP Router Pro deployment: ${environment}`);
        
        try {
            this.exec(`docker stop mcp-router-${environment}`);
            this.exec(`docker rm mcp-router-${environment}`);
            console.log(`✅ Stopped deployment: ${environment}`);
        } catch (error) {
            console.log(`❌ Failed to stop deployment: ${error.message}`);
        }
    }

    /**
     * View logs
     */
    viewLogs(environment, follow = false) {
        const followFlag = follow ? '-f' : '';
        try {
            this.exec(`docker logs ${followFlag} mcp-router-${environment}`, { stdio: 'inherit' });
        } catch (error) {
            console.log(`❌ Failed to view logs: ${error.message}`);
        }
    }

    /**
     * Cleanup old images
     */
    cleanup() {
        console.log('🧹 Cleaning up old Docker images');
        
        try {
            this.exec('docker image prune -f');
            this.exec('docker container prune -f');
            console.log('✅ Cleanup completed');
        } catch (error) {
            console.log(`❌ Cleanup failed: ${error.message}`);
        }
    }
}

// CLI interface
if (require.main === module) {
    const deployment = new DeploymentManager();
    const args = process.argv.slice(2);
    const command = args[0];
    const environment = args[1];

    // Add fetch polyfill for Node.js < 18
    if (!global.fetch) {
        global.fetch = require('node-fetch');
    }

    async function main() {
        try {
            switch (command) {
                case 'deploy':
                    if (!environment) {
                        console.log('Usage: node deploy.js deploy <environment>');
                        console.log('Environments: local, staging, production');
                        process.exit(1);
                    }
                    await deployment.deploy(environment);
                    break;

                case 'list':
                    deployment.listDeployments();
                    break;

                case 'stop':
                    if (!environment) {
                        console.log('Usage: node deploy.js stop <environment>');
                        process.exit(1);
                    }
                    deployment.stopDeployment(environment);
                    break;

                case 'logs':
                    if (!environment) {
                        console.log('Usage: node deploy.js logs <environment> [--follow]');
                        process.exit(1);
                    }
                    const follow = args.includes('--follow');
                    deployment.viewLogs(environment, follow);
                    break;

                case 'cleanup':
                    deployment.cleanup();
                    break;

                default:
                    console.log('MCP Router Pro - Deployment Manager');
                    console.log('');
                    console.log('Usage:');
                    console.log('  node deploy.js deploy <environment>  - Deploy to environment');
                    console.log('  node deploy.js list                  - List active deployments');
                    console.log('  node deploy.js stop <environment>    - Stop deployment');
                    console.log('  node deploy.js logs <environment>    - View logs');
                    console.log('  node deploy.js cleanup              - Cleanup old images');
                    console.log('');
                    console.log('Environments: local, staging, production');
                    process.exit(1);
            }
        } catch (error) {
            console.error('❌ Deployment failed:', error.message);
            process.exit(1);
        }
    }

    main();
}

module.exports = { DeploymentManager };
