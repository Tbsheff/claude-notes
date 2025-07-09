"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeCodeAgent = void 0;
const claude_code_1 = require("@anthropic-ai/claude-code");
const main_prompt_1 = require("../prompts/main-prompt");
const utils_1 = require("./utils");
class ClaudeCodeAgent {
    constructor(config) {
        this.initialized = false;
        this.config = config;
    }
    async initialize() {
        if (this.initialized)
            return;
        if (this.config.apiKey) {
            process.env.ANTHROPIC_API_KEY = this.config.apiKey;
        }
        this.initialized = true;
        utils_1.ClaudeCodeLogger.logReady();
    }
    async processRequest(prompt) {
        try {
            if (!this.initialized) {
                throw new Error('Agent not initialized. Call initialize() first.');
            }
            utils_1.ClaudeCodeLogger.logStart();
            const messages = [];
            for await (const msg of (0, claude_code_1.query)({
                prompt,
                options: {
                    maxTurns: this.config.maxTurns || 50,
                    cwd: this.config.cwd || process.cwd(),
                    allowedTools: this.config.allowedTools,
                    disallowedTools: this.config.disallowedTools,
                    permissionMode: this.config.permissionMode || 'acceptEdits',
                    customSystemPrompt: this.config.customSystemPrompt || main_prompt_1.MAIN_SYSTEM_PROMPT,
                    appendSystemPrompt: this.config.appendSystemPrompt
                }
            })) {
                utils_1.ClaudeCodeLogger.logMessage(msg);
                messages.push(msg);
            }
            const resultMessage = messages.find((msg) => msg.type === 'result');
            const response = (resultMessage?.type === 'result' && resultMessage.subtype === 'success')
                ? resultMessage.result
                : 'Task completed';
            utils_1.ClaudeCodeLogger.logComplete();
            return { success: true, response };
        }
        catch (error) {
            utils_1.ClaudeCodeLogger.logError(error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    isInitialized() {
        return this.initialized;
    }
    getConfig() {
        return { ...this.config };
    }
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
}
exports.ClaudeCodeAgent = ClaudeCodeAgent;
