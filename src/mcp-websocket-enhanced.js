const crypto = require('crypto');
const { EventEmitter } = require('events');

/**
 * Enhanced WebSocket Handler for MCP Router
 * Provides secure WebSocket connections with message parsing, validation, and authentication
 */

class EnhancedWebSocketHandler extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            maxConnections: options.maxConnections || 100,
            maxMessageSize: options.maxMessageSize || 1024 * 1024, // 1MB
            pingInterval: options.pingInterval || 30000, // 30 seconds
            pongTimeout: options.pongTimeout || 10000, // 10 seconds
            compression: options.compression || false,
            requireAuth: options.requireAuth || false,
            allowedOrigins: options.allowedOrigins || ['*']
        };

        this.connections = new Map();
        this.rooms = new Map();
        this.messageHandlers = new Map();
        this.authHandler = options.authHandler || null;

        // WebSocket opcodes
        this.OPCODES = {
            CONTINUATION: 0x0,
            TEXT: 0x1,
            BINARY: 0x2,
            CLOSE: 0x8,
            PING: 0x9,
            PONG: 0xa
        };

        // Setup default message handlers
        this.setupDefaultHandlers();

        // Start connection cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.cleanupConnections();
        }, 60000); // Every minute
    }

    /**
     * Setup default message handlers
     */
    setupDefaultHandlers() {
        this.onMessage('ping', async (data, connection) => {
            return { type: 'pong', timestamp: new Date().toISOString() };
        });

        this.onMessage('subscribe', async (data, connection) => {
            const { room } = data;
            if (!room) {
                throw new Error('Room name is required');
            }
            
            this.joinRoom(connection.id, room);
            return { type: 'subscribed', room, timestamp: new Date().toISOString() };
        });

        this.onMessage('unsubscribe', async (data, connection) => {
            const { room } = data;
            if (!room) {
                throw new Error('Room name is required');
            }
            
            this.leaveRoom(connection.id, room);
            return { type: 'unsubscribed', room, timestamp: new Date().toISOString() };
        });

        this.onMessage('stats', async (data, connection) => {
            return {
                type: 'stats',
                connections: this.connections.size,
                rooms: Array.from(this.rooms.keys()),
                timestamp: new Date().toISOString()
            };
        });
    }

    /**
     * Handle WebSocket upgrade request
     */
    handleUpgrade(req, socket, head) {
        const key = req.headers['sec-websocket-key'];
        if (!key) {
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
            return false;
        }

        // Validate origin
        const origin = req.headers.origin;
        if (!this.validateOrigin(origin)) {
            socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
            return false;
        }

        // Check connection limit
        if (this.connections.size >= this.config.maxConnections) {
            socket.end('HTTP/1.1 503 Service Unavailable\r\n\r\n');
            return false;
        }

        try {
            // WebSocket handshake
            const acceptKey = this.generateAcceptKey(key);
            const responseHeaders = [
                'HTTP/1.1 101 Switching Protocols',
                'Upgrade: websocket',
                'Connection: Upgrade',
                `Sec-WebSocket-Accept: ${acceptKey}`,
                'Sec-WebSocket-Version: 13'
            ];

            // Add compression if supported
            const extensions = req.headers['sec-websocket-extensions'];
            if (this.config.compression && extensions && extensions.includes('permessage-deflate')) {
                responseHeaders.push('Sec-WebSocket-Extensions: permessage-deflate');
            }

            responseHeaders.push('\r\n');
            socket.write(responseHeaders.join('\r\n'));

            // Create connection object
            const connection = this.createConnection(socket, req);
            
            // Setup socket event handlers
            this.setupSocketHandlers(connection);

            // Authentication if required
            if (this.config.requireAuth) {
                connection.authenticated = false;
                this.sendMessage(connection, {
                    type: 'auth_required',
                    message: 'Authentication required',
                    timestamp: new Date().toISOString()
                });
            } else {
                connection.authenticated = true;
                this.sendWelcomeMessage(connection);
            }

            this.emit('connection', connection);
            return true;

        } catch (error) {
            console.error('❌ WebSocket handshake error:', error.message);
            socket.end('HTTP/1.1 500 Internal Server Error\r\n\r\n');
            return false;
        }
    }

    /**
     * Generate WebSocket accept key
     */
    generateAcceptKey(key) {
        const WEBSOCKET_MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
        return crypto
            .createHash('sha1')
            .update(key + WEBSOCKET_MAGIC_STRING)
            .digest('base64');
    }

    /**
     * Validate origin
     */
    validateOrigin(origin) {
        if (!origin) return true; // Allow no origin for non-browser clients
        if (this.config.allowedOrigins.includes('*')) return true;
        return this.config.allowedOrigins.includes(origin);
    }

    /**
     * Create connection object
     */
    createConnection(socket, req) {
        const connection = {
            id: crypto.randomUUID(),
            socket,
            authenticated: false,
            rooms: new Set(),
            lastPing: Date.now(),
            lastPong: Date.now(),
            messageCount: 0,
            createdAt: new Date(),
            clientIp: req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            url: req.url,
            protocol: req.headers['sec-websocket-protocol'] || null
        };

        this.connections.set(connection.id, connection);
        return connection;
    }

    /**
     * Setup socket event handlers
     */
    setupSocketHandlers(connection) {
        const socket = connection.socket;

        socket.on('data', (data) => {
            try {
                this.handleIncomingData(connection, data);
            } catch (error) {
                console.error('❌ WebSocket data handling error:', error.message);
                this.closeConnection(connection, 1002, 'Protocol error');
            }
        });

        socket.on('close', () => {
            this.handleDisconnection(connection);
        });

        socket.on('error', (error) => {
            console.error('❌ WebSocket error:', error.message);
            this.handleDisconnection(connection);
        });

        // Start ping/pong
        this.startPingPong(connection);
    }

    /**
     * Handle incoming WebSocket data
     */
    handleIncomingData(connection, buffer) {
        let offset = 0;

        while (offset < buffer.length) {
            const frame = this.parseWebSocketFrame(buffer, offset);
            if (!frame) break;

            offset += frame.totalLength;

            // Handle different frame types
            switch (frame.opcode) {
                case this.OPCODES.TEXT:
                    this.handleTextMessage(connection, frame.payload);
                    break;
                case this.OPCODES.BINARY:
                    this.handleBinaryMessage(connection, frame.payload);
                    break;
                case this.OPCODES.CLOSE:
                    this.handleCloseFrame(connection, frame.payload);
                    return;
                case this.OPCODES.PING:
                    this.handlePingFrame(connection, frame.payload);
                    break;
                case this.OPCODES.PONG:
                    this.handlePongFrame(connection, frame.payload);
                    break;
            }
        }
    }

    /**
     * Parse WebSocket frame
     */
    parseWebSocketFrame(buffer, offset = 0) {
        if (buffer.length - offset < 2) return null;

        const firstByte = buffer[offset];
        const secondByte = buffer[offset + 1];

        const fin = (firstByte & 0x80) === 0x80;
        const opcode = firstByte & 0x0f;
        const masked = (secondByte & 0x80) === 0x80;
        let payloadLength = secondByte & 0x7f;

        let currentOffset = offset + 2;

        // Extended payload length
        if (payloadLength === 126) {
            if (buffer.length - currentOffset < 2) return null;
            payloadLength = buffer.readUInt16BE(currentOffset);
            currentOffset += 2;
        } else if (payloadLength === 127) {
            if (buffer.length - currentOffset < 8) return null;
            payloadLength = buffer.readBigUInt64BE(currentOffset);
            currentOffset += 8;
            
            // Check for reasonable size limits
            if (payloadLength > this.config.maxMessageSize) {
                throw new Error('Message too large');
            }
            payloadLength = Number(payloadLength);
        }

        // Masking key
        let maskingKey = null;
        if (masked) {
            if (buffer.length - currentOffset < 4) return null;
            maskingKey = buffer.subarray(currentOffset, currentOffset + 4);
            currentOffset += 4;
        }

        // Payload
        if (buffer.length - currentOffset < payloadLength) return null;
        let payload = buffer.subarray(currentOffset, currentOffset + payloadLength);

        // Unmask payload if needed
        if (masked && maskingKey) {
            for (let i = 0; i < payload.length; i++) {
                payload[i] ^= maskingKey[i % 4];
            }
        }

        return {
            fin,
            opcode,
            masked,
            payload,
            totalLength: currentOffset + payloadLength - offset
        };
    }

    /**
     * Handle text message
     */
    async handleTextMessage(connection, payload) {
        try {
            const message = JSON.parse(payload.toString('utf8'));
            connection.messageCount++;
            
            // Check authentication
            if (this.config.requireAuth && !connection.authenticated) {
                if (message.type === 'auth') {
                    await this.handleAuthentication(connection, message);
                } else {
                    this.sendMessage(connection, {
                        type: 'error',
                        error: 'Authentication required',
                        timestamp: new Date().toISOString()
                    });
                }
                return;
            }

            // Handle message
            const handler = this.messageHandlers.get(message.type);
            if (handler) {
                try {
                    const response = await handler(message, connection);
                    if (response) {
                        this.sendMessage(connection, response);
                    }
                } catch (error) {
                    this.sendMessage(connection, {
                        type: 'error',
                        error: error.message,
                        requestId: message.id,
                        timestamp: new Date().toISOString()
                    });
                }
            } else {
                this.sendMessage(connection, {
                    type: 'error',
                    error: `Unknown message type: ${message.type}`,
                    requestId: message.id,
                    timestamp: new Date().toISOString()
                });
            }

            this.emit('message', { connection, message });

        } catch (error) {
            console.error('❌ WebSocket message parsing error:', error.message);
            this.sendMessage(connection, {
                type: 'error',
                error: 'Invalid message format',
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Handle binary message
     */
    handleBinaryMessage(connection, payload) {
        // Basic binary message handling
        this.emit('binary-message', { connection, payload });
    }

    /**
     * Handle authentication
     */
    async handleAuthentication(connection, message) {
        if (!this.authHandler) {
            connection.authenticated = true;
            this.sendWelcomeMessage(connection);
            return;
        }

        try {
            const result = await this.authHandler(message, connection);
            if (result.authenticated) {
                connection.authenticated = true;
                connection.user = result.user;
                this.sendWelcomeMessage(connection);
                this.emit('authenticated', { connection, user: result.user });
            } else {
                this.sendMessage(connection, {
                    type: 'auth_failed',
                    error: result.error || 'Authentication failed',
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            this.sendMessage(connection, {
                type: 'auth_error',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Send welcome message
     */
    sendWelcomeMessage(connection) {
        this.sendMessage(connection, {
            type: 'welcome',
            connectionId: connection.id,
            message: 'Connected to MCP Router WebSocket',
            timestamp: new Date().toISOString(),
            features: [
                'Real-time notifications',
                'Room subscriptions',
                'Message acknowledgments',
                'Ping/pong heartbeat'
            ]
        });
    }

    /**
     * Handle close frame
     */
    handleCloseFrame(connection, payload) {
        let code = 1005; // No status code
        let reason = '';

        if (payload.length >= 2) {
            code = payload.readUInt16BE(0);
            reason = payload.subarray(2).toString('utf8');
        }

        this.closeConnection(connection, code, reason);
    }

    /**
     * Handle ping frame
     */
    handlePingFrame(connection, payload) {
        this.sendFrame(connection, this.OPCODES.PONG, payload);
    }

    /**
     * Handle pong frame
     */
    handlePongFrame(connection, payload) {
        connection.lastPong = Date.now();
    }

    /**
     * Start ping/pong heartbeat
     */
    startPingPong(connection) {
        const pingInterval = setInterval(() => {
            if (connection.socket.destroyed) {
                clearInterval(pingInterval);
                return;
            }

            const now = Date.now();
            
            // Check if connection is alive
            if (now - connection.lastPong > this.config.pongTimeout + this.config.pingInterval) {
                console.log(`🔌 WebSocket connection ${connection.id} timed out`);
                this.closeConnection(connection, 1001, 'Ping timeout');
                clearInterval(pingInterval);
                return;
            }

            // Send ping
            connection.lastPing = now;
            this.sendFrame(connection, this.OPCODES.PING, Buffer.from('ping'));
        }, this.config.pingInterval);

        connection.pingInterval = pingInterval;
    }

    /**
     * Send WebSocket frame
     */
    sendFrame(connection, opcode, payload) {
        if (connection.socket.destroyed) return false;

        try {
            const payloadLength = payload.length;
            let frame;

            if (payloadLength < 126) {
                frame = Buffer.allocUnsafe(2 + payloadLength);
                frame[0] = 0x80 | opcode; // FIN + opcode
                frame[1] = payloadLength;
                payload.copy(frame, 2);
            } else if (payloadLength < 65536) {
                frame = Buffer.allocUnsafe(4 + payloadLength);
                frame[0] = 0x80 | opcode;
                frame[1] = 126;
                frame.writeUInt16BE(payloadLength, 2);
                payload.copy(frame, 4);
            } else {
                frame = Buffer.allocUnsafe(10 + payloadLength);
                frame[0] = 0x80 | opcode;
                frame[1] = 127;
                frame.writeBigUInt64BE(BigInt(payloadLength), 2);
                payload.copy(frame, 10);
            }

            connection.socket.write(frame);
            return true;
        } catch (error) {
            console.error('❌ WebSocket send error:', error.message);
            return false;
        }
    }

    /**
     * Send text message
     */
    sendMessage(connection, message) {
        const payload = Buffer.from(JSON.stringify(message), 'utf8');
        return this.sendFrame(connection, this.OPCODES.TEXT, payload);
    }

    /**
     * Send binary message
     */
    sendBinary(connection, data) {
        const payload = Buffer.isBuffer(data) ? data : Buffer.from(data);
        return this.sendFrame(connection, this.OPCODES.BINARY, payload);
    }

    /**
     * Broadcast message to all connections
     */
    broadcast(message, filter = null) {
        let sent = 0;
        for (const connection of this.connections.values()) {
            if (!connection.authenticated) continue;
            if (filter && !filter(connection)) continue;
            
            if (this.sendMessage(connection, message)) {
                sent++;
            }
        }
        return sent;
    }

    /**
     * Broadcast to room
     */
    broadcastToRoom(room, message) {
        const roomConnections = this.rooms.get(room);
        if (!roomConnections) return 0;

        let sent = 0;
        for (const connectionId of roomConnections) {
            const connection = this.connections.get(connectionId);
            if (connection && connection.authenticated) {
                if (this.sendMessage(connection, message)) {
                    sent++;
                }
            }
        }
        return sent;
    }

    /**
     * Join room
     */
    joinRoom(connectionId, room) {
        const connection = this.connections.get(connectionId);
        if (!connection) return false;

        if (!this.rooms.has(room)) {
            this.rooms.set(room, new Set());
        }

        this.rooms.get(room).add(connectionId);
        connection.rooms.add(room);
        
        this.emit('room-join', { connection, room });
        return true;
    }

    /**
     * Leave room
     */
    leaveRoom(connectionId, room) {
        const connection = this.connections.get(connectionId);
        if (!connection) return false;

        const roomConnections = this.rooms.get(room);
        if (roomConnections) {
            roomConnections.delete(connectionId);
            if (roomConnections.size === 0) {
                this.rooms.delete(room);
            }
        }

        connection.rooms.delete(room);
        
        this.emit('room-leave', { connection, room });
        return true;
    }

    /**
     * Register message handler
     */
    onMessage(type, handler) {
        this.messageHandlers.set(type, handler);
    }

    /**
     * Close connection
     */
    closeConnection(connection, code = 1000, reason = '') {
        try {
            // Send close frame
            const closePayload = Buffer.allocUnsafe(2);
            closePayload.writeUInt16BE(code, 0);
            this.sendFrame(connection, this.OPCODES.CLOSE, closePayload);

            // Clean up connection
            this.handleDisconnection(connection);
        } catch (error) {
            // Ignore errors during close
        }
    }

    /**
     * Handle connection disconnection
     */
    handleDisconnection(connection) {
        // Clear ping interval
        if (connection.pingInterval) {
            clearInterval(connection.pingInterval);
        }

        // Remove from rooms
        for (const room of connection.rooms) {
            this.leaveRoom(connection.id, room);
        }

        // Remove connection
        this.connections.delete(connection.id);

        // Close socket if not already closed
        if (!connection.socket.destroyed) {
            connection.socket.destroy();
        }

        this.emit('disconnection', connection);
        console.log(`🔌 WebSocket connection ${connection.id} disconnected`);
    }

    /**
     * Cleanup dead connections
     */
    cleanupConnections() {
        const now = Date.now();
        const toRemove = [];

        for (const connection of this.connections.values()) {
            if (connection.socket.destroyed) {
                toRemove.push(connection);
            } else if (now - connection.lastPong > this.config.pongTimeout * 2) {
                toRemove.push(connection);
            }
        }

        for (const connection of toRemove) {
            this.handleDisconnection(connection);
        }

        if (toRemove.length > 0) {
            console.log(`🧹 Cleaned up ${toRemove.length} dead WebSocket connections`);
        }
    }

    /**
     * Get connection statistics
     */
    getStats() {
        const now = Date.now();
        let authenticatedCount = 0;
        let totalMessages = 0;

        for (const connection of this.connections.values()) {
            if (connection.authenticated) authenticatedCount++;
            totalMessages += connection.messageCount;
        }

        return {
            totalConnections: this.connections.size,
            authenticatedConnections: authenticatedCount,
            totalRooms: this.rooms.size,
            totalMessages,
            messageHandlers: this.messageHandlers.size,
            config: this.config
        };
    }

    /**
     * Destroy WebSocket handler
     */
    destroy() {
        // Clear cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        // Close all connections
        for (const connection of this.connections.values()) {
            this.closeConnection(connection, 1001, 'Server shutdown');
        }

        // Clear data structures
        this.connections.clear();
        this.rooms.clear();
        this.messageHandlers.clear();

        console.log('🔌 WebSocket handler destroyed');
    }
}

module.exports = { EnhancedWebSocketHandler };
