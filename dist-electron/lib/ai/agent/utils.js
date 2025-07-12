"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeCodeLogger = void 0;
let eventCallback = null;
class ClaudeCodeLogger {
    static setEventCallback(callback) {
        eventCallback = callback;
    }
    static emitEvent(event) {
        if (eventCallback) {
            eventCallback({ ...event, timestamp: Date.now() });
        }
    }
    static logMessage(msg) {
        console.log('🔍 Raw Message:', JSON.stringify(msg, null, 2));
        if (msg.type === 'assistant' && msg.message?.content) {
            const content = Array.isArray(msg.message.content)
                ? msg.message.content.find(c => c.type === 'text')?.text
                : msg.message.content;
            if (content) {
                console.log('💭 Agent:', content);
                this.emitEvent({
                    type: 'assistant_message',
                    message: `Agent: ${content}`,
                    icon: '💭'
                });
            }
            if (msg.message?.tool_calls) {
                msg.message.tool_calls.forEach((call) => {
                    this.logTool(call);
                });
            }
            if (Array.isArray(msg.message.content)) {
                msg.message.content.forEach((item) => {
                    if (item.type === 'tool_use') {
                        this.logToolFromContent(item);
                    }
                });
            }
        }
        if (msg.type === 'user' && msg.message?.content) {
            if (Array.isArray(msg.message.content)) {
                msg.message.content.forEach((item) => {
                    if (item.type === 'tool_result') {
                        console.log('📤 Tool Result:', JSON.stringify(item, null, 2));
                        // Определяем является ли это ошибкой
                        const content = item.content || '';
                        const isRealError = item.is_error &&
                            !content.includes('No files found') &&
                            !content.includes('File created successfully') &&
                            !content.includes('updated');
                        this.emitEvent({
                            type: 'tool_result',
                            message: content,
                            icon: isRealError ? '❌' : '✅',
                            tool_use_id: item.tool_use_id,
                            is_error: isRealError
                        });
                    }
                });
            }
        }
        if (msg.type === 'user') {
            console.log('👤 User Message:', JSON.stringify(msg, null, 2));
        }
        if (msg.type === 'system') {
            console.log('🔧 System Message:', JSON.stringify(msg, null, 2));
        }
    }
    static logToolFromContent(toolUse) {
        const toolName = toolUse.name;
        const toolInput = toolUse.input || {};
        const toolUseId = toolUse.id;
        switch (toolName) {
            case 'Read':
                const readPath = toolInput.path || toolInput.file || toolInput.filename || toolInput.file_path || 'unknown';
                const readMsg = `Read: ${readPath}`;
                console.log(`📖 ${readMsg}`);
                this.emitEvent({ type: 'tool_action', message: readMsg, icon: '📖', tool_use_id: toolUseId });
                break;
            case 'Write':
                const writePath = toolInput.path || toolInput.file || toolInput.filename || toolInput.file_path || 'unknown';
                const writeMsg = `Write: ${writePath}`;
                console.log(`📝 ${writeMsg}`);
                this.emitEvent({ type: 'tool_action', message: writeMsg, icon: '📝', tool_use_id: toolUseId });
                break;
            case 'Edit':
                const editPath = toolInput.path || toolInput.file || toolInput.filename || toolInput.file_path || 'unknown';
                const editMsg = `Edit: ${editPath}`.length > 100 ? `Edit: ${editPath}`.substring(0, 100) + '...' : `Edit: ${editPath}`;
                console.log(`✏️ ${editMsg}`);
                this.emitEvent({ type: 'tool_action', message: editMsg, icon: '✏️', tool_use_id: toolUseId });
                break;
            case 'Bash':
                const command = toolInput.command || toolInput.cmd || toolInput.script || 'unknown command';
                const bashMsg = `Bash: ${command}`;
                console.log(`⚡ ${bashMsg}`);
                this.emitEvent({ type: 'tool_action', message: bashMsg, icon: '⚡', tool_use_id: toolUseId });
                break;
            case 'List':
                const listPath = toolInput.path || toolInput.directory || toolInput.dir || '.';
                const listMsg = `List: ${listPath}`;
                console.log(`📁 ${listMsg}`);
                this.emitEvent({ type: 'tool_action', message: listMsg, icon: '📁', tool_use_id: toolUseId });
                break;
            case 'Search':
                const pattern = toolInput.pattern || toolInput.query || toolInput.search || 'unknown';
                const searchPath = toolInput.path || toolInput.directory || '.';
                const searchMsg = `Search: "${pattern}" in ${searchPath}`;
                console.log(`🔍 ${searchMsg}`);
                this.emitEvent({ type: 'tool_action', message: searchMsg, icon: '🔍', tool_use_id: toolUseId });
                break;
            case 'Find':
                const findPattern = toolInput.pattern || toolInput.name || toolInput.query || 'unknown';
                const findPath = toolInput.path || toolInput.directory || '.';
                const findMsg = `Find: "${findPattern}" in ${findPath}`;
                console.log(`🔎 ${findMsg}`);
                this.emitEvent({ type: 'tool_action', message: findMsg, icon: '🔎', tool_use_id: toolUseId });
                break;
            case 'LS':
                const lsPath = toolInput.path || '.';
                const lsMsg = `List: ${lsPath}`;
                console.log(`📁 ${lsMsg}`);
                this.emitEvent({ type: 'tool_action', message: lsMsg, icon: '📁', tool_use_id: toolUseId });
                break;
            case 'Grep':
                const grepPattern = toolInput.pattern || toolInput.query || 'unknown';
                const grepMsg = `Grep: ${grepPattern}`;
                console.log(`🔍 ${grepMsg}`);
                this.emitEvent({ type: 'tool_action', message: grepMsg, icon: '🔍', tool_use_id: toolUseId });
                break;
            default:
                const inputStr = JSON.stringify(toolInput);
                const defaultMsg = inputStr && inputStr !== '{}' ? `${toolName}: ${inputStr}` : toolName;
                console.log(`🔧 ${defaultMsg}`);
                this.emitEvent({ type: 'tool_action', message: defaultMsg, icon: '🔧', tool_use_id: toolUseId });
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
            console.log(`   ❌ ${errorMsg}`);
        }
        else {
            if (result) {
                const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
                console.log(`   📝 ${resultStr}`);
            }
            else {
                console.log(`   ✅ Completed`);
            }
        }
    }
    static logStart() {
        console.log('🚀 Agent: Processing request...');
        this.emitEvent({
            type: 'start',
            message: 'Agent: Processing request...',
            icon: '🚀'
        });
    }
    static logComplete() {
        console.log('✅ Agent: Task completed');
        this.emitEvent({
            type: 'complete',
            message: 'Agent: Task completed',
            icon: '✅'
        });
    }
    static logReady() {
        console.log('✅ Agent: Ready');
    }
    static logError(error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('❌ Agent Error:', error);
        this.emitEvent({
            type: 'error',
            message: `Agent Error: ${errorMsg}`,
            icon: '❌'
        });
    }
}
exports.ClaudeCodeLogger = ClaudeCodeLogger;
