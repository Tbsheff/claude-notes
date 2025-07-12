"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupFileWatcher = setupFileWatcher;
const chokidar_1 = __importDefault(require("chokidar"));
const child_process_1 = require("child_process");
function setupFileWatcher(getMainWindow, getChangedFiles) {
    const watcher = chokidar_1.default.watch([
        'app',
        'components',
        'lib',
        'styles',
        'main.tsx',
        'index.html'
    ], {
        ignored: /node_modules/,
        persistent: true,
        usePolling: true,
        interval: 1000,
        ignoreInitial: true
    });
    watcher.on('ready', () => {
        console.log('🔍 File watcher is ready and watching for changes...');
    });
    watcher.on('change', (filePath) => {
        console.log(`📁 File changed: ${filePath}`);
        getChangedFiles().add(filePath);
    });
    watcher.on('add', (filePath) => {
        console.log(`➕ File added: ${filePath}`);
    });
    watcher.on('unlink', (filePath) => {
        console.log(`➖ File removed: ${filePath}`);
    });
    watcher.on('error', (error) => {
        console.error('❌ File watcher error:', error);
    });
    return {
        rebuildAfterClaudeFinished: async () => {
            const changedFiles = getChangedFiles();
            if (changedFiles.size === 0)
                return;
            console.log(`🔄 Auto-rebuilding after ${changedFiles.size} file changes...`);
            console.log('📝 Changed files:', Array.from(changedFiles).join(', '));
            try {
                const buildProcess = (0, child_process_1.spawn)('npm', ['run', 'build'], {
                    stdio: 'inherit'
                });
                buildProcess.on('close', (code) => {
                    if (code === 0) {
                        console.log('✅ Electron rebuilt, reloading...');
                        const mainWindow = getMainWindow();
                        if (mainWindow) {
                            mainWindow.reload();
                        }
                    }
                    else {
                        console.error('❌ Build failed');
                    }
                    changedFiles.clear();
                });
            }
            catch (error) {
                console.error('❌ Rebuild error:', error);
                changedFiles.clear();
            }
        }
    };
}
