const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

/**
 * Real MCP Tool Implementations
 * This module provides actual tool execution instead of mock responses
 */

class RealToolExecutor {
    constructor(options = {}) {
        this.workingDir = options.workingDir || '/app';
        this.timeout = options.timeout || 30000; // 30 second timeout
        this.maxOutputSize = options.maxOutputSize || 1024 * 1024; // 1MB max output
        this.allowedCommands = options.allowedCommands || [
            'ls', 'cat', 'head', 'tail', 'grep', 'find', 'git', 'docker', 'curl', 'ping'
        ];
    }

    /**
     * Execute a tool with given name and arguments
     */
    async executeTool(toolName, args = {}) {
        try {
            switch (toolName) {
                case 'read_file':
                    return await this.readFile(args);
                case 'write_file':
                    return await this.writeFile(args);
                case 'list_directory':
                    return await this.listDirectory(args);
                case 'fetch_url':
                    return await this.fetchUrl(args);
                case 'git_status':
                    return await this.gitStatus(args);
                case 'docker_ps':
                    return await this.dockerPs(args);
                case 'search_files':
                    return await this.searchFiles(args);
                case 'execute_command':
                    return await this.executeCommand(args);
                case 'sql_query':
                    return await this.sqlQuery(args);
                case 'api_call':
                    return await this.apiCall(args);
                default:
                    throw new Error(`Unknown tool: ${toolName}`);
            }
        } catch (error) {
            return {
                content: [{
                    type: 'text',
                    text: `Error executing tool '${toolName}': ${error.message}`
                }],
                isError: true
            };
        }
    }

    /**
     * Read file contents
     */
    async readFile(args) {
        const { path: filePath, encoding = 'utf8', maxLines = 1000 } = args;
        
        if (!filePath) {
            throw new Error('File path is required');
        }

        // Security check - prevent path traversal
        const safePath = path.resolve(this.workingDir, filePath);
        if (!safePath.startsWith(this.workingDir)) {
            throw new Error('Access denied: Path traversal detected');
        }

        if (!fs.existsSync(safePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const stats = fs.statSync(safePath);
        if (stats.isDirectory()) {
            throw new Error(`Path is a directory: ${filePath}`);
        }

        if (stats.size > this.maxOutputSize) {
            throw new Error(`File too large: ${stats.size} bytes (max: ${this.maxOutputSize})`);
        }

        const content = fs.readFileSync(safePath, encoding);
        const lines = content.split('\n');
        const truncatedContent = lines.length > maxLines 
            ? lines.slice(0, maxLines).join('\n') + `\n... (truncated, showing ${maxLines} of ${lines.length} lines)`
            : content;

        return {
            content: [{
                type: 'text',
                text: truncatedContent
            }],
            isError: false
        };
    }

    /**
     * Write file contents
     */
    async writeFile(args) {
        const { path: filePath, content, encoding = 'utf8', append = false } = args;
        
        if (!filePath) {
            throw new Error('File path is required');
        }
        
        if (content === undefined) {
            throw new Error('Content is required');
        }

        // Security check - prevent path traversal
        const safePath = path.resolve(this.workingDir, filePath);
        if (!safePath.startsWith(this.workingDir)) {
            throw new Error('Access denied: Path traversal detected');
        }

        // Ensure directory exists
        const dir = path.dirname(safePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        if (append) {
            fs.appendFileSync(safePath, content, encoding);
        } else {
            fs.writeFileSync(safePath, content, encoding);
        }

        const stats = fs.statSync(safePath);
        return {
            content: [{
                type: 'text',
                text: `File ${append ? 'appended' : 'written'} successfully: ${filePath} (${stats.size} bytes)`
            }],
            isError: false
        };
    }

    /**
     * List directory contents
     */
    async listDirectory(args) {
        const { path: dirPath = '.', recursive = false, maxItems = 1000 } = args;
        
        // Security check - prevent path traversal
        const safePath = path.resolve(this.workingDir, dirPath);
        if (!safePath.startsWith(this.workingDir)) {
            throw new Error('Access denied: Path traversal detected');
        }

        if (!fs.existsSync(safePath)) {
            throw new Error(`Directory not found: ${dirPath}`);
        }

        const stats = fs.statSync(safePath);
        if (!stats.isDirectory()) {
            throw new Error(`Path is not a directory: ${dirPath}`);
        }

        const items = [];
        
        if (recursive) {
            const walk = (dir, depth = 0) => {
                if (items.length >= maxItems || depth > 10) return; // Prevent infinite recursion
                
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    if (items.length >= maxItems) break;
                    
                    const fullPath = path.join(dir, file);
                    const relativePath = path.relative(safePath, fullPath);
                    const stat = fs.statSync(fullPath);
                    
                    items.push({
                        name: file,
                        path: relativePath,
                        type: stat.isDirectory() ? 'directory' : 'file',
                        size: stat.size,
                        modified: stat.mtime.toISOString()
                    });
                    
                    if (stat.isDirectory()) {
                        walk(fullPath, depth + 1);
                    }
                }
            };
            walk(safePath);
        } else {
            const files = fs.readdirSync(safePath);
            for (const file of files.slice(0, maxItems)) {
                const fullPath = path.join(safePath, file);
                const stat = fs.statSync(fullPath);
                
                items.push({
                    name: file,
                    type: stat.isDirectory() ? 'directory' : 'file',
                    size: stat.size,
                    modified: stat.mtime.toISOString()
                });
            }
        }

        return {
            content: [{
                type: 'text',
                text: JSON.stringify(items, null, 2)
            }],
            isError: false
        };
    }

    /**
     * Fetch URL content
     */
    async fetchUrl(args) {
        const { url, method = 'GET', headers = {}, timeout = 10000 } = args;
        
        if (!url) {
            throw new Error('URL is required');
        }

        // Basic URL validation
        try {
            new URL(url);
        } catch (error) {
            throw new Error('Invalid URL format');
        }

        try {
            // Use a simple HTTP implementation since fetch might not be available in all environments
            const http = require('http');
            const https = require('https');
            const urlModule = require('url');
            
            const parsedUrl = new URL(url);
            const client = parsedUrl.protocol === 'https:' ? https : http;
            
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port,
                path: parsedUrl.pathname + parsedUrl.search,
                method,
                headers,
                timeout
            };

            const response = await new Promise((resolve, reject) => {
                const req = client.request(options, resolve);
                req.on('error', reject);
                req.on('timeout', () => reject(new Error('Request timeout')));
                if (method !== 'GET' && body) {
                    req.write(body);
                }
                req.end();
            });

            let content = '';
            response.on('data', chunk => content += chunk);
            await new Promise(resolve => response.on('end', resolve));

            // Truncate large responses
            if (content.length > this.maxOutputSize) {
                content = content.substring(0, this.maxOutputSize) + '\n... (truncated)';
            }

            return {
                content: [{
                    type: 'text',
                    text: `Status: ${response.statusCode} ${response.statusMessage}\nContent-Type: ${response.headers['content-type']}\n\n${content}`
                }],
                isError: false
            };
        } catch (error) {
            throw new Error(`Fetch failed: ${error.message}`);
        }
    }

    /**
     * Git status
     */
    async gitStatus(args) {
        const { repository = '.' } = args;
        
        try {
            const output = execSync('git status --porcelain', {
                cwd: path.resolve(this.workingDir, repository),
                encoding: 'utf8',
                timeout: this.timeout
            });

            const branch = execSync('git rev-parse --abbrev-ref HEAD', {
                cwd: path.resolve(this.workingDir, repository),
                encoding: 'utf8',
                timeout: this.timeout
            }).trim();

            return {
                content: [{
                    type: 'text',
                    text: `Branch: ${branch}\n\nStatus:\n${output || 'Working directory clean'}`
                }],
                isError: false
            };
        } catch (error) {
            throw new Error(`Git command failed: ${error.message}`);
        }
    }

    /**
     * Docker ps
     */
    async dockerPs(args) {
        const { all = false, format = 'table' } = args;
        
        try {
            const cmd = `docker ps ${all ? '-a' : ''} --format "${format}"`;
            const output = execSync(cmd, {
                encoding: 'utf8',
                timeout: this.timeout
            });

            return {
                content: [{
                    type: 'text',
                    text: output || 'No containers found'
                }],
                isError: false
            };
        } catch (error) {
            throw new Error(`Docker command failed: ${error.message}`);
        }
    }

    /**
     * Search files
     */
    async searchFiles(args) {
        const { pattern, directory = '.', fileType = '*', maxResults = 100 } = args;
        
        if (!pattern) {
            throw new Error('Search pattern is required');
        }

        try {
            const searchDir = path.resolve(this.workingDir, directory);
            const cmd = `find "${searchDir}" -name "${fileType}" -type f -exec grep -l "${pattern}" {} \\; 2>/dev/null | head -${maxResults}`;
            
            const output = execSync(cmd, {
                encoding: 'utf8',
                timeout: this.timeout
            });

            return {
                content: [{
                    type: 'text',
                    text: output || 'No files found matching the pattern'
                }],
                isError: false
            };
        } catch (error) {
            throw new Error(`Search failed: ${error.message}`);
        }
    }

    /**
     * Execute shell command (with security restrictions)
     */
    async executeCommand(args) {
        const { command, workingDir = this.workingDir } = args;
        
        if (!command) {
            throw new Error('Command is required');
        }

        // Security check - only allow safe commands
        const commandParts = command.split(' ');
        const baseCommand = commandParts[0];
        
        if (!this.allowedCommands.includes(baseCommand)) {
            throw new Error(`Command not allowed: ${baseCommand}. Allowed: ${this.allowedCommands.join(', ')}`);
        }

        try {
            const output = execSync(command, {
                cwd: workingDir,
                encoding: 'utf8',
                timeout: this.timeout,
                maxBuffer: this.maxOutputSize
            });

            return {
                content: [{
                    type: 'text',
                    text: output || 'Command executed successfully (no output)'
                }],
                isError: false
            };
        } catch (error) {
            throw new Error(`Command failed: ${error.message}`);
        }
    }

    /**
     * SQL Query (mock implementation - would need actual database connection)
     */
    async sqlQuery(args) {
        const { query, database = 'default' } = args;
        
        if (!query) {
            throw new Error('SQL query is required');
        }

        // This is a mock implementation - in production, you'd connect to a real database
        return {
            content: [{
                type: 'text',
                text: `Mock SQL execution on database '${database}':\nQuery: ${query}\n\nResult: This would execute on a real database connection.`
            }],
            isError: false
        };
    }

    /**
     * API Call
     */
    async apiCall(args) {
        const { url, method = 'GET', headers = {}, body, timeout = 10000 } = args;
        
        if (!url) {
            throw new Error('API URL is required');
        }

        try {
            // Use a simple HTTP implementation
            const http = require('http');
            const https = require('https');
            const urlModule = require('url');
            
            const parsedUrl = new URL(url);
            const client = parsedUrl.protocol === 'https:' ? https : http;
            
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port,
                path: parsedUrl.pathname + parsedUrl.search,
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                timeout
            };

            const response = await new Promise((resolve, reject) => {
                const req = client.request(options, resolve);
                req.on('error', reject);
                req.on('timeout', () => reject(new Error('Request timeout')));
                if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                    const data = typeof body === 'string' ? body : JSON.stringify(body);
                    req.write(data);
                }
                req.end();
            });

            let responseData = '';
            response.on('data', chunk => responseData += chunk);
            await new Promise(resolve => response.on('end', resolve));

            return {
                content: [{
                    type: 'text',
                    text: `Status: ${response.statusCode} ${response.statusMessage}\nResponse: ${responseData}`
                }],
                isError: false
            };
        } catch (error) {
            throw new Error(`API call failed: ${error.message}`);
        }
    }
}

module.exports = { RealToolExecutor };
