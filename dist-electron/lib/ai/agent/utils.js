"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeCodeLogger = void 0;
class ClaudeCodeLogger {
    static logMessage(msg) {
        if (msg.type === 'assistant' && msg.message?.content) {
            const content = Array.isArray(msg.message.content)
                ? msg.message.content.find(c => c.type === 'text')?.text
                : msg.message.content;
            if (content) {
                console.log('💭 Claude:', content.substring(0, 100) + '...');
            }
            // Log tool calls
            if (msg.message?.tool_calls) {
                msg.message.tool_calls.forEach((call) => {
                    this.logTool(call);
                });
            }
            // Проверяем content на наличие tool_use
            if (Array.isArray(msg.message.content)) {
                msg.message.content.forEach((item) => {
                    if (item.type === 'tool_use') {
                        this.logToolFromContent(item);
                    }
                });
            }
        }
    }
    static logToolFromContent(toolUse) {
        const toolName = toolUse.name;
        const toolInput = toolUse.input || {};
        switch (toolName) {
            case 'Read':
                const readPath = toolInput.path || toolInput.file || toolInput.filename || toolInput.file_path || 'unknown';
                console.log(`📖 Read: ${readPath}`);
                break;
            case 'Write':
                const writePath = toolInput.path || toolInput.file || toolInput.filename || toolInput.file_path || 'unknown';
                console.log(`📝 Write: ${writePath}`);
                break;
            case 'Edit':
                const editPath = toolInput.path || toolInput.file || toolInput.filename || toolInput.file_path || 'unknown';
                console.log(`✏️ Edit: ${editPath}`);
                break;
            case 'Bash':
                const command = toolInput.command || toolInput.cmd || toolInput.script || 'unknown command';
                console.log(`⚡ Bash: ${command}`);
                break;
            case 'List':
                const listPath = toolInput.path || toolInput.directory || toolInput.dir || '.';
                console.log(`📁 List: ${listPath}`);
                break;
            case 'Search':
                const pattern = toolInput.pattern || toolInput.query || toolInput.search || 'unknown';
                const searchPath = toolInput.path || toolInput.directory || '.';
                console.log(`🔍 Search: "${pattern}" in ${searchPath}`);
                break;
            case 'Find':
                const findPattern = toolInput.pattern || toolInput.name || toolInput.query || 'unknown';
                const findPath = toolInput.path || toolInput.directory || '.';
                console.log(`🔎 Find: "${findPattern}" in ${findPath}`);
                break;
            default:
                // Generic tool display
                const inputStr = JSON.stringify(toolInput);
                if (inputStr && inputStr !== '{}') {
                    console.log(`🔧 ${toolName}: ${inputStr}`);
                }
                else {
                    console.log(`🔧 ${toolName}`);
                }
        }
    }
    static logTool(toolCall) {
        const toolName = toolCall.function?.name;
        const toolInput = toolCall.function?.arguments ? JSON.parse(toolCall.function.arguments) : {};
        switch (toolName) {
            case 'Read':
                const readPath = toolInput.path || toolInput.file || toolInput.filename || toolInput.file_path || 'unknown';
                console.log(`📖 Read: ${readPath}`);
                break;
            case 'Write':
                const writePath = toolInput.path || toolInput.file || toolInput.filename || toolInput.file_path || 'unknown';
                console.log(`📝 Write: ${writePath}`);
                break;
            case 'Edit':
                const editPath = toolInput.path || toolInput.file || toolInput.filename || toolInput.file_path || 'unknown';
                console.log(`✏️ Edit: ${editPath}`);
                break;
            case 'Bash':
                const command = toolInput.command || toolInput.cmd || toolInput.script || 'unknown command';
                console.log(`⚡ Bash: ${command}`);
                break;
            case 'List':
                const listPath = toolInput.path || toolInput.directory || toolInput.dir || '.';
                console.log(`📁 List: ${listPath}`);
                break;
            case 'Search':
                const pattern = toolInput.pattern || toolInput.query || toolInput.search || 'unknown';
                const searchPath = toolInput.path || toolInput.directory || '.';
                console.log(`🔍 Search: "${pattern}" in ${searchPath}`);
                break;
            case 'Find':
                const findPattern = toolInput.pattern || toolInput.name || toolInput.query || 'unknown';
                const findPath = toolInput.path || toolInput.directory || '.';
                console.log(`🔎 Find: "${findPattern}" in ${findPath}`);
                break;
            default:
                // Generic tool display
                const inputStr = JSON.stringify(toolInput);
                if (inputStr && inputStr !== '{}') {
                    console.log(`🔧 ${toolName}: ${inputStr}`);
                }
                else {
                    console.log(`🔧 ${toolName}`);
                }
        }
    }
    static logToolResult(result, isError = false) {
        if (isError) {
            const errorMsg = typeof result === 'string' ? result : JSON.stringify(result);
            console.log(`   ❌ ${errorMsg.substring(0, 80)}...`);
        }
        else {
            if (result) {
                const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
                if (resultStr.length > 60) {
                    console.log(`   📊 ${resultStr.substring(0, 60)}...`);
                }
                else {
                    console.log(`   📝 ${resultStr}`);
                }
            }
            else {
                console.log(`   ✅ Completed`);
            }
        }
    }
    static logStart() {
        console.log('🚀 Claude Code: Processing request...');
    }
    static logComplete() {
        console.log('✅ Claude Code: Task completed');
    }
    static logReady() {
        console.log('✅ Claude Code: Ready');
    }
    static logError(error) {
        console.error('❌ Claude Code Error:', error);
    }
}
exports.ClaudeCodeLogger = ClaudeCodeLogger;
