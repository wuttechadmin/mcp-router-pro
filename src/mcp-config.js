const fs = require('fs');
const path = require('path');

/**
 * Configuration Management Module for MCP Router
 * Handles environment variables, config files, and runtime configuration
 */

class ConfigManager {
    constructor(configPath = '/app/config') {
        this.configPath = configPath;
        this.config = {};
        this.watchers = new Map();
        
        // Default configuration
        this.defaults = {
            server: {
                port: 3001,
                host: '0.0.0.0',
                timeout: 30000,
                maxConnections: 1000
            },
            logging: {
                level: 'info',
                enableFile: false,
                enableConsole: true,
                logDir: '/app/logs',
                maxFileSize: 10 * 1024 * 1024, // 10MB
                maxFiles: 5
            },
            security: {
                requireApiKey: false,
                maxRequestsPerMinute: 100,
                maxRequestsPerHour: 1000,
                maxPayloadSize: 1024 * 1024, // 1MB
                allowedOrigins: ['*'],
                keyLength: 32,
                keyPrefix: 'mcp_'
            },
            tools: {
                enableReal: true,
                workingDir: '/app',
                timeout: 30000,
                maxOutputSize: 1024 * 1024, // 1MB
                allowedCommands: ['ls', 'cat', 'head', 'tail', 'grep', 'find', 'git', 'docker', 'curl', 'ping']
            },
            websocket: {
                enabled: true,
                maxConnections: 100,
                pingInterval: 30000,
                compression: false
            },
            monitoring: {
                enabled: true,
                metricsPort: 9090,
                healthCheckInterval: 15000,
                collectMetrics: true
            },
            mcp: {
                servers: [],
                autoDiscovery: true,
                connectionTimeout: 10000,
                retryAttempts: 3
            }
        };

        this.loadConfiguration();
    }

    /**
     * Load configuration from environment variables and config files
     */
    loadConfiguration() {
        // Start with defaults
        this.config = JSON.parse(JSON.stringify(this.defaults));

        // Load from config file if exists
        this.loadFromFile();

        // Override with environment variables
        this.loadFromEnvironment();

        // Validate configuration
        this.validateConfiguration();

        console.log('📋 Configuration loaded successfully');
    }

    /**
     * Load configuration from JSON file
     */
    loadFromFile() {
        const configFile = path.join(this.configPath, 'mcp-router.json');
        
        if (fs.existsSync(configFile)) {
            try {
                const fileConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
                this.mergeConfig(this.config, fileConfig);
                console.log(`📄 Configuration loaded from ${configFile}`);
            } catch (error) {
                console.warn(`⚠️ Failed to load config file: ${error.message}`);
            }
        }
    }

    /**
     * Load configuration from environment variables
     */
    loadFromEnvironment() {
        const envMappings = {
            // Server
            'MCP_PORT': 'server.port',
            'MCP_HOST': 'server.host',
            'MCP_TIMEOUT': 'server.timeout',
            'MCP_MAX_CONNECTIONS': 'server.maxConnections',

            // Logging
            'MCP_LOG_LEVEL': 'logging.level',
            'MCP_LOG_FILE': 'logging.enableFile',
            'MCP_LOG_CONSOLE': 'logging.enableConsole',
            'MCP_LOG_DIR': 'logging.logDir',

            // Security
            'MCP_REQUIRE_API_KEY': 'security.requireApiKey',
            'MCP_MAX_REQUESTS_PER_MINUTE': 'security.maxRequestsPerMinute',
            'MCP_MAX_REQUESTS_PER_HOUR': 'security.maxRequestsPerHour',
            'MCP_MAX_PAYLOAD_SIZE': 'security.maxPayloadSize',
            'MCP_ALLOWED_ORIGINS': 'security.allowedOrigins',

            // Tools
            'MCP_ENABLE_REAL_TOOLS': 'tools.enableReal',
            'MCP_WORKING_DIR': 'tools.workingDir',
            'MCP_TOOL_TIMEOUT': 'tools.timeout',
            'MCP_MAX_OUTPUT_SIZE': 'tools.maxOutputSize',

            // WebSocket
            'MCP_WS_ENABLED': 'websocket.enabled',
            'MCP_WS_MAX_CONNECTIONS': 'websocket.maxConnections',
            'MCP_WS_PING_INTERVAL': 'websocket.pingInterval',

            // Monitoring
            'MCP_MONITORING_ENABLED': 'monitoring.enabled',
            'MCP_METRICS_PORT': 'monitoring.metricsPort',
            'MCP_HEALTH_CHECK_INTERVAL': 'monitoring.healthCheckInterval'
        };

        for (const [envVar, configPath] of Object.entries(envMappings)) {
            const value = process.env[envVar];
            if (value !== undefined) {
                this.setConfigValue(configPath, this.parseEnvValue(value));
            }
        }

        // Special handling for arrays
        if (process.env.MCP_ALLOWED_ORIGINS) {
            this.setConfigValue('security.allowedOrigins', process.env.MCP_ALLOWED_ORIGINS.split(','));
        }

        if (process.env.MCP_ALLOWED_COMMANDS) {
            this.setConfigValue('tools.allowedCommands', process.env.MCP_ALLOWED_COMMANDS.split(','));
        }
    }

    /**
     * Parse environment variable value
     */
    parseEnvValue(value) {
        // Boolean
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;

        // Number
        const num = Number(value);
        if (!isNaN(num)) return num;

        // String
        return value;
    }

    /**
     * Set configuration value using dot notation
     */
    setConfigValue(path, value) {
        const keys = path.split('.');
        let current = this.config;

        for (let i = 0; i < keys.length - 1; i++) {
            if (!(keys[i] in current)) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = value;
    }

    /**
     * Get configuration value using dot notation
     */
    getConfigValue(path, defaultValue = undefined) {
        const keys = path.split('.');
        let current = this.config;

        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return defaultValue;
            }
        }

        return current;
    }

    /**
     * Merge configuration objects
     */
    mergeConfig(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                this.mergeConfig(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }

    /**
     * Validate configuration
     */
    validateConfiguration() {
        const errors = [];

        // Validate server configuration
        if (this.config.server.port < 1 || this.config.server.port > 65535) {
            errors.push('Invalid server port: must be between 1 and 65535');
        }

        // Validate security configuration
        if (this.config.security.maxRequestsPerMinute < 1) {
            errors.push('Invalid maxRequestsPerMinute: must be greater than 0');
        }

        // Validate tool configuration
        if (this.config.tools.timeout < 1000) {
            errors.push('Invalid tool timeout: must be at least 1000ms');
        }

        if (errors.length > 0) {
            throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
        }
    }

    /**
     * Save current configuration to file
     */
    saveConfiguration() {
        const configFile = path.join(this.configPath, 'mcp-router.json');
        
        try {
            // Ensure directory exists
            if (!fs.existsSync(this.configPath)) {
                fs.mkdirSync(this.configPath, { recursive: true });
            }

            fs.writeFileSync(configFile, JSON.stringify(this.config, null, 2));
            console.log(`💾 Configuration saved to ${configFile}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to save configuration: ${error.message}`);
            return false;
        }
    }

    /**
     * Watch configuration file for changes
     */
    watchConfiguration(callback) {
        const configFile = path.join(this.configPath, 'mcp-router.json');
        
        if (fs.existsSync(configFile)) {
            const watcher = fs.watchFile(configFile, (curr, prev) => {
                if (curr.mtime > prev.mtime) {
                    console.log('📄 Configuration file changed, reloading...');
                    this.loadConfiguration();
                    if (callback) callback(this.config);
                }
            });

            this.watchers.set(configFile, watcher);
        }
    }

    /**
     * Stop watching configuration files
     */
    stopWatching() {
        for (const [file, watcher] of this.watchers) {
            fs.unwatchFile(file);
        }
        this.watchers.clear();
    }

    /**
     * Get all configuration
     */
    getConfig() {
        return JSON.parse(JSON.stringify(this.config));
    }

    /**
     * Update configuration at runtime
     */
    updateConfig(path, value) {
        const oldValue = this.getConfigValue(path);
        this.setConfigValue(path, value);
        
        try {
            this.validateConfiguration();
            console.log(`⚙️ Configuration updated: ${path} = ${JSON.stringify(value)}`);
            return true;
        } catch (error) {
            // Revert on validation error
            this.setConfigValue(path, oldValue);
            console.error(`❌ Configuration update failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Create example configuration file
     */
    createExampleConfig() {
        const exampleFile = path.join(this.configPath, 'mcp-router.example.json');
        
        try {
            if (!fs.existsSync(this.configPath)) {
                fs.mkdirSync(this.configPath, { recursive: true });
            }

            const exampleConfig = {
                ...this.defaults,
                _comments: {
                    server: "HTTP server configuration",
                    logging: "Logging configuration",
                    security: "Security and authentication settings",
                    tools: "Tool execution settings",
                    websocket: "WebSocket server settings",
                    monitoring: "Monitoring and metrics settings",
                    mcp: "MCP server connections"
                }
            };

            fs.writeFileSync(exampleFile, JSON.stringify(exampleConfig, null, 2));
            console.log(`📝 Example configuration created at ${exampleFile}`);
            return true;

        } catch (error) {
            console.error(`❌ Failed to create example config: ${error.message}`);
            return false;
        }
    }

    /**
     * Get configuration schema for validation
     */
    getSchema() {
        return {
            type: 'object',
            properties: {
                server: {
                    type: 'object',
                    properties: {
                        port: { type: 'number', minimum: 1, maximum: 65535 },
                        host: { type: 'string' },
                        timeout: { type: 'number', minimum: 1000 },
                        maxConnections: { type: 'number', minimum: 1 }
                    }
                },
                logging: {
                    type: 'object',
                    properties: {
                        level: { type: 'string', enum: ['debug', 'info', 'warn', 'error'] },
                        enableFile: { type: 'boolean' },
                        enableConsole: { type: 'boolean' },
                        logDir: { type: 'string' }
                    }
                },
                security: {
                    type: 'object',
                    properties: {
                        requireApiKey: { type: 'boolean' },
                        maxRequestsPerMinute: { type: 'number', minimum: 1 },
                        maxRequestsPerHour: { type: 'number', minimum: 1 }
                    }
                }
            }
        };
    }
}

module.exports = { ConfigManager };
