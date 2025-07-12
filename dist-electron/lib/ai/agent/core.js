"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeCodeAgent = void 0;
const claude_code_1 = require("@anthropic-ai/claude-code");
const main_prompt_1 = require("../prompts/main-prompt");
const utils_1 = require("./utils");
const manager_1 = require("../workspace/manager");
const validator_1 = require("../workspace/validator");
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
                    allowedTools: this.config.allowedTools || ['Read', 'Write', 'Edit', 'List', 'Search', 'Find', 'Bash'],
                    disallowedTools: this.config.disallowedTools || [],
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
    async processRequestWorkspace(prompt, workspaceConfig) {
        const manager = new manager_1.WorkspaceManager(workspaceConfig, this.config.cwd || process.cwd());
        let workspaceResult;
        try {
            if (!this.initialized) {
                throw new Error('Agent not initialized. Call initialize() first.');
            }
            utils_1.ClaudeCodeLogger.logStart();
            console.log('🚀 Starting workspace-isolated AI processing...');
            workspaceResult = await manager.create();
            if (!workspaceResult.success) {
                throw new Error(`Failed to create workspace: ${workspaceResult.error}`);
            }
            console.log('📁 Workspace created at:', workspaceResult.workspacePath);
            const messages = [];
            const originalDir = process.cwd();
            process.chdir(workspaceResult.workspacePath);
            try {
                for await (const msg of (0, claude_code_1.query)({
                    prompt,
                    abortController: new AbortController(),
                    options: {
                        maxTurns: this.config.maxTurns || 50,
                        cwd: workspaceResult.workspacePath,
                        allowedTools: this.config.allowedTools || ['Read', 'Write', 'Edit', 'List', 'Search', 'Find', 'Bash'],
                        disallowedTools: this.config.disallowedTools || [],
                        permissionMode: this.config.permissionMode || 'acceptEdits',
                        customSystemPrompt: this.config.customSystemPrompt || main_prompt_1.MAIN_SYSTEM_PROMPT,
                        appendSystemPrompt: this.config.appendSystemPrompt
                    }
                })) {
                    utils_1.ClaudeCodeLogger.logMessage(msg);
                    messages.push(msg);
                }
            }
            finally {
                process.chdir(originalDir);
            }
            if (workspaceConfig.validateAfter) {
                console.log('🔍 Validating workspace changes...');
                const validator = new validator_1.Validator(workspaceResult.workspacePath, workspaceConfig.timeoutMs);
                const validationResult = await validator.validate();
                workspaceResult.validationResult = validationResult;
                if (!validationResult.success) {
                    console.log('❌ Validation failed - changes will NOT be applied to main project');
                    console.log('🔍 Validation error:', validationResult.error);
                    throw new Error(`Validation failed: ${validationResult.error}`);
                }
                console.log('✅ Validation passed - safe to apply changes!');
            }
            console.log('📋 Applying changes to main codebase...');
            await manager.applyChanges();
            const resultMessage = messages.find((msg) => msg.type === 'result');
            const response = (resultMessage?.type === 'result' && resultMessage.subtype === 'success')
                ? resultMessage.result
                : 'Task completed';
            console.log('✅ Workspace processing completed successfully!');
            utils_1.ClaudeCodeLogger.logComplete();
            return {
                success: true,
                response,
                workspaceResult
            };
        }
        catch (error) {
            utils_1.ClaudeCodeLogger.logError(error);
            console.log('❌ Workspace processing failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                workspaceResult
            };
        }
        finally {
            if (workspaceResult?.workspacePath) {
                console.log('🧹 Cleaning up workspace...');
                await manager.cleanup();
            }
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
