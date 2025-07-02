const crypto = require('crypto');

/**
 * Authentication and Security Module for MCP Router
 * Provides API key authentication, rate limiting, and security middleware
 */

class SecurityManager {
    constructor(options = {}) {
        this.apiKeys = new Map();
        this.rateLimits = new Map();
        this.blacklist = new Set();
        
        // Configuration
        this.config = {
            // Rate limiting
            maxRequestsPerMinute: options.maxRequestsPerMinute || 100,
            maxRequestsPerHour: options.maxRequestsPerHour || 1000,
            
            // API Key settings
            keyLength: options.keyLength || 32,
            keyPrefix: options.keyPrefix || 'mcp_',
            
            // Security settings
            maxPayloadSize: options.maxPayloadSize || 1024 * 1024, // 1MB
            allowedOrigins: options.allowedOrigins || ['*'],
            requireApiKey: options.requireApiKey || false,
            
            // Admin settings
            adminKey: options.adminKey || null, // Will be set after initialization
        };

        // Generate admin key if not provided
        if (!this.config.adminKey) {
            this.config.adminKey = this.generateApiKey();
        }

        // Initialize admin key
        this.apiKeys.set(this.config.adminKey, {
            name: 'admin',
            permissions: ['*'],
            createdAt: new Date(),
            lastUsed: null,
            usageCount: 0,
            rateLimitExempt: true
        });

        console.log(`🔐 Admin API Key: ${this.config.adminKey}`);
    }

    /**
     * Generate a new API key
     */
    generateApiKey() {
        const randomBytes = crypto.randomBytes(this.config.keyLength);
        return this.config.keyPrefix + randomBytes.toString('hex');
    }

    /**
     * Create a new API key with permissions
     */
    createApiKey(name, permissions = ['read'], options = {}) {
        const key = this.generateApiKey();
        
        this.apiKeys.set(key, {
            name,
            permissions,
            createdAt: new Date(),
            lastUsed: null,
            usageCount: 0,
            rateLimitExempt: options.rateLimitExempt || false,
            expiresAt: options.expiresAt || null
        });

        return key;
    }

    /**
     * Revoke an API key
     */
    revokeApiKey(key) {
        return this.apiKeys.delete(key);
    }

    /**
     * List all API keys (without exposing the actual keys)
     */
    listApiKeys() {
        const keys = [];
        for (const [key, data] of this.apiKeys) {
            keys.push({
                id: key.substring(0, 8) + '...',
                name: data.name,
                permissions: data.permissions,
                createdAt: data.createdAt,
                lastUsed: data.lastUsed,
                usageCount: data.usageCount,
                expired: data.expiresAt ? new Date() > data.expiresAt : false
            });
        }
        return keys;
    }

    /**
     * Validate API key and check permissions
     */
    validateApiKey(key, requiredPermission = 'read') {
        const keyData = this.apiKeys.get(key);
        
        if (!keyData) {
            return { valid: false, error: 'Invalid API key' };
        }

        // Check expiration
        if (keyData.expiresAt && new Date() > keyData.expiresAt) {
            return { valid: false, error: 'API key expired' };
        }

        // Check permissions
        if (!keyData.permissions.includes('*') && !keyData.permissions.includes(requiredPermission)) {
            return { valid: false, error: `Permission denied: requires '${requiredPermission}'` };
        }

        // Update usage
        keyData.lastUsed = new Date();
        keyData.usageCount++;

        return { valid: true, keyData };
    }

    /**
     * Rate limiting middleware
     */
    checkRateLimit(clientId, rateLimitExempt = false) {
        if (rateLimitExempt) {
            return { allowed: true };
        }

        const now = Date.now();
        const minuteWindow = Math.floor(now / (60 * 1000));
        const hourWindow = Math.floor(now / (60 * 60 * 1000));

        if (!this.rateLimits.has(clientId)) {
            this.rateLimits.set(clientId, {
                minuteRequests: new Map(),
                hourRequests: new Map()
            });
        }

        const limits = this.rateLimits.get(clientId);

        // Check minute limit
        const minuteCount = limits.minuteRequests.get(minuteWindow) || 0;
        if (minuteCount >= this.config.maxRequestsPerMinute) {
            return { 
                allowed: false, 
                error: 'Rate limit exceeded: too many requests per minute',
                retryAfter: 60 - (now % (60 * 1000)) / 1000
            };
        }

        // Check hour limit
        const hourCount = limits.hourRequests.get(hourWindow) || 0;
        if (hourCount >= this.config.maxRequestsPerHour) {
            return { 
                allowed: false, 
                error: 'Rate limit exceeded: too many requests per hour',
                retryAfter: 3600 - (now % (60 * 60 * 1000)) / 1000
            };
        }

        // Update counters
        limits.minuteRequests.set(minuteWindow, minuteCount + 1);
        limits.hourRequests.set(hourWindow, hourCount + 1);

        // Cleanup old entries (keep only last 2 windows)
        for (const [window] of limits.minuteRequests) {
            if (window < minuteWindow - 1) {
                limits.minuteRequests.delete(window);
            }
        }
        for (const [window] of limits.hourRequests) {
            if (window < hourWindow - 1) {
                limits.hourRequests.delete(window);
            }
        }

        return { allowed: true };
    }

    /**
     * Security middleware for HTTP requests
     */
    securityCheck(req) {
        const clientIp = req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
        
        // Check blacklist
        if (this.blacklist.has(clientIp)) {
            return { 
                allowed: false, 
                error: 'Access denied: IP blacklisted',
                status: 403
            };
        }

        // Check origin (CORS)
        const origin = req.headers.origin;
        if (origin && !this.config.allowedOrigins.includes('*') && !this.config.allowedOrigins.includes(origin)) {
            return {
                allowed: false,
                error: 'Access denied: Origin not allowed',
                status: 403
            };
        }

        // Check payload size
        const contentLength = parseInt(req.headers['content-length'] || '0');
        if (contentLength > this.config.maxPayloadSize) {
            return {
                allowed: false,
                error: 'Payload too large',
                status: 413
            };
        }

        return { allowed: true, clientIp };
    }

    /**
     * Extract API key from request
     */
    extractApiKey(req) {
        // Check Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        // Check X-API-Key header
        const apiKeyHeader = req.headers['x-api-key'];
        if (apiKeyHeader) {
            return apiKeyHeader;
        }

        // Check query parameter
        const url = new URL(req.url, `http://${req.headers.host}`);
        const apiKeyParam = url.searchParams.get('api_key');
        if (apiKeyParam) {
            return apiKeyParam;
        }

        return null;
    }

    /**
     * Complete authentication middleware
     */
    authenticate(req, requiredPermission = 'read') {
        // Basic security check
        const securityResult = this.securityCheck(req);
        if (!securityResult.allowed) {
            return securityResult;
        }

        const clientIp = securityResult.clientIp;

        // API Key authentication (if required)
        if (this.config.requireApiKey) {
            const apiKey = this.extractApiKey(req);
            if (!apiKey) {
                return {
                    allowed: false,
                    error: 'API key required',
                    status: 401
                };
            }

            const keyValidation = this.validateApiKey(apiKey, requiredPermission);
            if (!keyValidation.valid) {
                return {
                    allowed: false,
                    error: keyValidation.error,
                    status: 401
                };
            }

            // Rate limiting
            const rateLimitResult = this.checkRateLimit(apiKey, keyValidation.keyData.rateLimitExempt);
            if (!rateLimitResult.allowed) {
                return {
                    allowed: false,
                    error: rateLimitResult.error,
                    status: 429,
                    retryAfter: rateLimitResult.retryAfter
                };
            }

            return {
                allowed: true,
                clientIp,
                apiKey,
                keyData: keyValidation.keyData
            };
        } else {
            // Rate limiting by IP if no API key required
            const rateLimitResult = this.checkRateLimit(clientIp);
            if (!rateLimitResult.allowed) {
                return {
                    allowed: false,
                    error: rateLimitResult.error,
                    status: 429,
                    retryAfter: rateLimitResult.retryAfter
                };
            }

            return {
                allowed: true,
                clientIp
            };
        }
    }

    /**
     * Add IP to blacklist
     */
    blacklistIp(ip) {
        this.blacklist.add(ip);
    }

    /**
     * Remove IP from blacklist
     */
    unblacklistIp(ip) {
        this.blacklist.delete(ip);
    }

    /**
     * Get security statistics
     */
    getStats() {
        return {
            apiKeys: {
                total: this.apiKeys.size,
                active: Array.from(this.apiKeys.values()).filter(k => !k.expiresAt || new Date() < k.expiresAt).length
            },
            rateLimits: {
                clients: this.rateLimits.size
            },
            blacklist: {
                ips: this.blacklist.size
            },
            config: {
                requireApiKey: this.config.requireApiKey,
                maxRequestsPerMinute: this.config.maxRequestsPerMinute,
                maxRequestsPerHour: this.config.maxRequestsPerHour,
                maxPayloadSize: this.config.maxPayloadSize
            }
        };
    }
}

module.exports = { SecurityManager };
