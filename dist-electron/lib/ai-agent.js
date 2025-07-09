const fs = require('fs');
const pathModule = require('path');
class AIAgentClass {
    constructor(config) {
        this.messages = [];
        this.isFinished = false;
        this.config = config;
        this.tools = new Map();
        this.initializeTools();
        this.initializeSystemPrompt();
    }
    initializeSystemPrompt() {
        this.messages.push({
            role: 'system',
            content: `You are an AI coding assistant that helps modify and improve code.

IMPORTANT RULES:
1. You have access to tools: read_file, write_file, edit_file, grep_search, find_files, list_files, finish
2. Use list_files to see what files are available in directories
3. Use find_files to find files by name (e.g., "*.tsx", "note-editor.tsx")
4. Use grep_search to find specific text patterns INSIDE files (not for finding filenames)
5. Use read_file to understand existing code before making changes
6. Use write_file to create new files
7. Use edit_file to modify existing files
8. Use finish tool when you have completed the user's request
9. Always search and read files first to understand the current state
10. When asked to modify code, make the changes directly using the tools
11. You can read multiple files to understand the project structure
12. Work until the task is complete, then use finish
13. If you need clarification, ask the user but don't finish yet

TOOL USAGE:
- find_files: To locate files by name pattern (e.g., find_files with "note-editor.tsx")
- grep_search: To search for text/code patterns inside files (e.g., grep_search with "useState")
- list_files: To see what files exist in a directory
- read_file: To read and understand file contents
- edit_file: To modify existing files
- write_file: To create new files

WORKFLOW:
1. If looking for a specific file, use find_files with the filename
2. Use list_files to see available files in directories
3. Use grep_search to find relevant code patterns inside files
4. Use read_file to understand the code
5. Make changes with edit_file or write_file
6. When everything is done, use finish with a summary

Your goal is to help the user modify their codebase by reading, understanding, and editing files as needed.`
        });
    }
    initializeTools() {
        this.registerTool({
            name: 'read_file',
            description: 'Read contents of a file',
            parameters: {
                type: 'object',
                properties: {
                    filepath: { type: 'string', description: 'Path to the file to read' }
                },
                required: ['filepath']
            },
            execute: this.readFile.bind(this)
        });
        this.registerTool({
            name: 'write_file',
            description: 'Write content to a file',
            parameters: {
                type: 'object',
                properties: {
                    filepath: { type: 'string', description: 'Path to the file to write' },
                    content: { type: 'string', description: 'Content to write to the file' }
                },
                required: ['filepath', 'content']
            },
            execute: this.writeFile.bind(this)
        });
        this.registerTool({
            name: 'edit_file',
            description: 'Edit a file by replacing old content with new content',
            parameters: {
                type: 'object',
                properties: {
                    filepath: { type: 'string', description: 'Path to the file to edit' },
                    oldContent: { type: 'string', description: 'Content to replace' },
                    newContent: { type: 'string', description: 'New content to replace with' }
                },
                required: ['filepath', 'oldContent', 'newContent']
            },
            execute: this.editFile.bind(this)
        });
        this.registerTool({
            name: 'grep_search',
            description: 'Search for text patterns INSIDE files using grep - NOT for finding filenames',
            parameters: {
                type: 'object',
                properties: {
                    pattern: { type: 'string', description: 'Search pattern or text to find INSIDE files' },
                    filepath: { type: 'string', description: 'Path to the file to search in (optional, searches all files if not provided)' },
                    recursive: { type: 'boolean', description: 'Search recursively in directories (default: true)' }
                },
                required: ['pattern']
            },
            execute: this.grepSearch.bind(this)
        });
        this.registerTool({
            name: 'find_files',
            description: 'Find files by name pattern using find command',
            parameters: {
                type: 'object',
                properties: {
                    pattern: { type: 'string', description: 'Filename pattern to search for (e.g., "*.tsx", "note-editor.tsx")' },
                    directory: { type: 'string', description: 'Directory to search in (optional, searches from project root if not provided)' }
                },
                required: ['pattern']
            },
            execute: this.findFiles.bind(this)
        });
        this.registerTool({
            name: 'list_files',
            description: 'List files in a directory',
            parameters: {
                type: 'object',
                properties: {
                    directory: { type: 'string', description: 'Directory path to list files from (default: current directory)' }
                },
                required: []
            },
            execute: this.listFiles.bind(this)
        });
        this.registerTool({
            name: 'finish',
            description: 'Finish the current task when everything is complete',
            parameters: {
                type: 'object',
                properties: {
                    message: { type: 'string', description: 'Final message about completed task' }
                },
                required: ['message']
            },
            execute: this.finish.bind(this)
        });
    }
    registerTool(tool) {
        this.tools.set(tool.name, tool);
    }
    async readFile(params) {
        console.log(`📖 Reading: ${params.filepath}`);
        try {
            const fullPath = pathModule.join(this.config.projectRoot, params.filepath);
            const content = await fs.promises.readFile(fullPath, 'utf-8');
            return content;
        }
        catch (error) {
            throw new Error(`Failed to read file ${params.filepath}: ${error}`);
        }
    }
    async writeFile(params) {
        console.log(`✍️ Writing: ${params.filepath}`);
        try {
            const fullPath = pathModule.join(this.config.projectRoot, params.filepath);
            await fs.promises.writeFile(fullPath, params.content, 'utf-8');
            return `Successfully wrote to ${params.filepath}`;
        }
        catch (error) {
            throw new Error(`Failed to write file ${params.filepath}: ${error}`);
        }
    }
    async editFile(params) {
        console.log(`✏️ Editing: ${params.filepath}`);
        try {
            const fullPath = pathModule.join(this.config.projectRoot, params.filepath);
            const content = await fs.promises.readFile(fullPath, 'utf-8');
            const newFileContent = content.replace(params.oldContent, params.newContent);
            await fs.promises.writeFile(fullPath, newFileContent, 'utf-8');
            return `Successfully edited ${params.filepath}`;
        }
        catch (error) {
            throw new Error(`Failed to edit file ${params.filepath}: ${error}`);
        }
    }
    async grepSearch(params) {
        console.log(`🔍 Searching: "${params.pattern}"`);
        const { spawn } = require('child_process');
        return new Promise((resolve, reject) => {
            const searchPath = params.filepath ? pathModule.join(this.config.projectRoot, params.filepath) : this.config.projectRoot;
            const recursive = params.recursive !== false;
            const args = ['-n', '--color=never'];
            if (recursive) {
                args.push('-r');
                args.push('--exclude-dir=node_modules');
                args.push('--exclude-dir=dist');
                args.push('--exclude-dir=dist-electron');
                args.push('--exclude-dir=.git');
                args.push('--exclude=*.log');
                args.push('--exclude=*.map');
                args.push('--exclude=package-lock.json');
            }
            args.push(params.pattern, searchPath);
            const grep = spawn('grep', args);
            let output = '';
            let errorOutput = '';
            grep.stdout.on('data', (data) => {
                output += data.toString();
            });
            grep.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            grep.on('close', (code) => {
                if (code === 0) {
                    resolve(output);
                }
                else if (code === 1) {
                    resolve('No matches found');
                }
                else {
                    reject(new Error(`Grep failed: ${errorOutput}`));
                }
            });
        });
    }
    async findFiles(params) {
        console.log(`📁 Finding files: "${params.pattern}"`);
        const { spawn } = require('child_process');
        return new Promise((resolve, reject) => {
            const searchPath = params.directory ? pathModule.join(this.config.projectRoot, params.directory) : this.config.projectRoot;
            const args = [searchPath, '-name', params.pattern, '-type', 'f'];
            const find = spawn('find', args);
            let output = '';
            let errorOutput = '';
            find.stdout.on('data', (data) => {
                output += data.toString();
            });
            find.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            find.on('close', (code) => {
                if (code === 0) {
                    resolve(output || 'No files found');
                }
                else {
                    reject(new Error(`Find failed: ${errorOutput}`));
                }
            });
        });
    }
    async listFiles(params) {
        console.log(`📁 Listing: ${params.directory || 'current directory'}`);
        try {
            const dirPath = params.directory ? pathModule.join(this.config.projectRoot, params.directory) : this.config.projectRoot;
            const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
            const excludedItems = ['node_modules', 'dist', 'dist-electron', '.git', '.DS_Store', 'package-lock.json'];
            const filteredFiles = files.filter(file => !excludedItems.includes(file.name));
            const fileList = filteredFiles.map(file => {
                const type = file.isDirectory() ? '[DIR]' : file.isFile() ? '[FILE]' : '[OTHER]';
                return `${type} ${file.name}`;
            }).join('\n');
            return fileList;
        }
        catch (error) {
            throw new Error(`Failed to list files: ${error}`);
        }
    }
    async finish(params) {
        console.log(`🏁 Finished: ${params.message}`);
        this.isFinished = true;
        return params.message;
    }
    async processRequest(userMessage) {
        console.log(`🚀 Processing: "${userMessage}"`);
        this.messages.push({
            role: 'user',
            content: userMessage
        });
        let iteration = 0;
        while (!this.isFinished && iteration < 50) {
            iteration++;
            console.log(`🔄 Step ${iteration}`);
            const response = await this.callOpenRouter();
            if (response.tool_calls && response.tool_calls.length > 0) {
                for (const toolCall of response.tool_calls) {
                    await this.executeTool(toolCall);
                }
            }
            else {
                return response.content;
            }
        }
        return "Task completed";
    }
    async callOpenRouter() {
        const requestBody = {
            model: this.config.model,
            messages: this.messages,
            tools: Array.from(this.tools.values()).map(tool => ({
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters
                }
            }))
        };
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.openRouterApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const message = data.choices[0].message;
        this.messages.push(message);
        return message;
    }
    async executeTool(toolCall) {
        console.log(`🔧 Tool: ${toolCall.function.name}`);
        console.log(`   Args: ${toolCall.function.arguments}`);
        const tool = this.tools.get(toolCall.function.name);
        if (!tool) {
            throw new Error(`Tool ${toolCall.function.name} not found`);
        }
        try {
            const params = JSON.parse(toolCall.function.arguments);
            const result = await tool.execute(params);
            console.log(`   Result: ${typeof result === 'string' ? result.substring(0, 200) + '...' : JSON.stringify(result)}`);
            this.messages.push({
                role: 'tool',
                content: JSON.stringify(result),
                tool_call_id: toolCall.id
            });
        }
        catch (error) {
            console.log(`   Error: ${error}`);
            this.messages.push({
                role: 'tool',
                content: `Error: ${error}`,
                tool_call_id: toolCall.id
            });
        }
    }
}
module.exports = { AIAgent: AIAgentClass };
