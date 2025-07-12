"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChangedFiles = getChangedFiles;
exports.setClaudeWorking = setClaudeWorking;
exports.setMainWindow = setMainWindow;
exports.setupAIHandlers = setupAIHandlers;
const { ipcMain } = require('electron');
const path = require('path');
const os = require('os');
let aiAgent = null;
let _claudeIsWorking = false;
let changedFiles = new Set();
let mainWindow = null;
function getChangedFiles() {
    return changedFiles;
}
function setClaudeWorking(working) {
    _claudeIsWorking = working;
}
function setMainWindow(window) {
    mainWindow = window;
}
function setupAIHandlers(rebuildCallback) {
    ipcMain.handle('ai:initialize', async (event, config = {}) => {
        try {
            const apiKey = process.env.ANTHROPIC_API_KEY || config.apiKey;
            if (!apiKey) {
                const error = 'Anthropic API key not found in environment variables or config';
                throw new Error(error);
            }
            const { ClaudeCodeAgent } = await Promise.resolve().then(() => __importStar(require('../../lib/ai/agent/core')));
            const { ClaudeCodeLogger } = await Promise.resolve().then(() => __importStar(require('../../lib/ai/agent/utils')));
            ClaudeCodeLogger.setEventCallback((event) => {
                if (mainWindow) {
                    mainWindow.webContents.send('claude-event', event);
                }
            });
            aiAgent = new ClaudeCodeAgent({ apiKey });
            await aiAgent.initialize();
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });
    ipcMain.handle('ai:process-request-workspace', async (event, message) => {
        try {
            if (!aiAgent) {
                throw new Error('AI Agent not initialized');
            }
            _claudeIsWorking = true;
            console.log('🚀 Agent: Starting workspace mode...');
            const workspaceConfig = {
                enabled: true,
                workspaceDir: path.join(os.tmpdir(), `.agent-workspace-${Date.now()}`),
                blacklistedPaths: [],
                timeoutMs: 120000,
                validateAfter: true
            };
            const result = await aiAgent.processRequestWorkspace(message, workspaceConfig);
            _claudeIsWorking = false;
            if (result.success) {
                console.log('✅ Claude Code: Workspace work completed!');
                setTimeout(() => rebuildCallback(), 500);
                return {
                    success: true,
                    response: result.response,
                    workspaceResult: result.workspaceResult
                };
            }
            else {
                console.log('❌ Claude Code workspace: Work failed');
                return result;
            }
        }
        catch (error) {
            _claudeIsWorking = false;
            console.log('❌ Claude Code workspace: Work failed');
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });
    ipcMain.handle('llm:call', async (event, messages, model) => {
        try {
            const { llmCall } = await Promise.resolve().then(() => __importStar(require('../../lib/ai/core')));
            return await llmCall(messages, model);
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });
}
