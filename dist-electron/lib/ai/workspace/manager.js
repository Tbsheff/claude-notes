"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceManager = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class WorkspaceManager {
    constructor(config, projectRoot) {
        this.config = config;
        this.projectRoot = (0, path_1.resolve)(projectRoot);
        this.workspacePath = (0, path_1.isAbsolute)(config.workspaceDir)
            ? config.workspaceDir
            : (0, path_1.resolve)(this.projectRoot, config.workspaceDir);
    }
    async create() {
        try {
            await this.cleanup();
            await fs_1.promises.mkdir(this.workspacePath, { recursive: true });
            await this.copyFiles();
            const nodeModulesPath = (0, path_1.join)(this.workspacePath, 'node_modules');
            try {
                await fs_1.promises.access(nodeModulesPath);
            }
            catch {
                console.log('📦 Installing dependencies in workspace (npm ci --silent --ignore-scripts)...');
                try {
                    await execAsync('npm ci --silent --ignore-scripts', { cwd: this.workspacePath, timeout: 300000 });
                    console.log('✅ Dependencies installed');
                }
                catch (installError) {
                    console.log('⚠️ Failed to install dependencies in workspace:', installError);
                }
            }
            return {
                success: true,
                workspacePath: this.workspacePath
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async copyFiles() {
        const filesToCopy = await this.getFilesToCopy();
        for (const file of filesToCopy) {
            try {
                const srcPath = (0, path_1.join)(this.projectRoot, file);
                const destPath = (0, path_1.join)(this.workspacePath, file);
                await fs_1.promises.mkdir((0, path_1.resolve)(destPath, '..'), { recursive: true });
                await fs_1.promises.copyFile(srcPath, destPath);
            }
            catch {
                console.log('⚠️ Skipping file that cannot be copied:', file);
            }
        }
    }
    async getFilesToCopy() {
        console.log('📁 Copying ENTIRE project to workspace for complete isolation');
        return await this.getAllFiles(this.projectRoot);
    }
    async getAllFiles(dir) {
        const files = [];
        try {
            const items = await fs_1.promises.readdir(dir, { withFileTypes: true });
            for (const item of items) {
                const fullPath = (0, path_1.join)(dir, item.name);
                const relativePath = (0, path_1.relative)(this.projectRoot, fullPath);
                if (this.shouldSkipPath(relativePath))
                    continue;
                if (item.isDirectory()) {
                    const subFiles = await this.getAllFiles(fullPath);
                    files.push(...subFiles);
                }
                else {
                    files.push(relativePath);
                }
            }
        }
        catch {
        }
        return files;
    }
    shouldSkipPath(relativePath) {
        const skipPaths = [
            '.agent-workspace',
            'node_modules',
            'dist-electron',
            'dist',
            '.git'
        ];
        return skipPaths.some(skip => relativePath === skip || relativePath.startsWith(skip + '/'));
    }
    async getChangedFiles() {
        const changedFiles = [];
        const workspaceFiles = await this.getAllWorkspaceFiles();
        for (const file of workspaceFiles) {
            if (this.shouldSkipPath(file))
                continue;
            const workspaceFile = (0, path_1.join)(this.workspacePath, file);
            const originalFile = (0, path_1.join)(this.projectRoot, file);
            try {
                let isNewFile = false;
                let originalContent = '';
                try {
                    await fs_1.promises.access(originalFile);
                    originalContent = await fs_1.promises.readFile(originalFile, 'utf-8');
                }
                catch {
                    isNewFile = true;
                }
                if (isNewFile) {
                    changedFiles.push(file);
                }
                else {
                    const workspaceContent = await fs_1.promises.readFile(workspaceFile, 'utf-8');
                    if (workspaceContent !== originalContent) {
                        changedFiles.push(file);
                    }
                }
            }
            catch {
                // If workspace file can't be read (e.g., binary), skip
            }
        }
        return changedFiles;
    }
    async getAllWorkspaceFiles() {
        const files = [];
        try {
            const items = await fs_1.promises.readdir(this.workspacePath, { withFileTypes: true });
            for (const item of items) {
                const fullPath = (0, path_1.join)(this.workspacePath, item.name);
                const relativePath = (0, path_1.relative)(this.workspacePath, fullPath);
                if (item.isDirectory()) {
                    const subFiles = await this.getAllWorkspaceFiles_recursive(fullPath);
                    files.push(...subFiles);
                }
                else {
                    files.push(relativePath);
                }
            }
        }
        catch {
            // Ignore directory read errors
        }
        return files;
    }
    async getAllWorkspaceFiles_recursive(dir) {
        const files = [];
        try {
            const items = await fs_1.promises.readdir(dir, { withFileTypes: true });
            for (const item of items) {
                const fullPath = (0, path_1.join)(dir, item.name);
                const relativePath = (0, path_1.relative)(this.workspacePath, fullPath);
                if (item.isDirectory()) {
                    const subFiles = await this.getAllWorkspaceFiles_recursive(fullPath);
                    files.push(...subFiles);
                }
                else {
                    files.push(relativePath);
                }
            }
        }
        catch {
            // Ignore directory read errors
        }
        return files;
    }
    async applyChanges() {
        const changedFiles = await this.getChangedFiles();
        if (changedFiles.length > 0) {
            console.log('📋 Applying', changedFiles.length, 'changed files to main project');
        }
        else {
            console.log('ℹ️ No files were changed by Claude');
        }
        for (const file of changedFiles) {
            const workspaceFile = (0, path_1.join)(this.workspacePath, file);
            const originalFile = (0, path_1.join)(this.projectRoot, file);
            await fs_1.promises.mkdir((0, path_1.resolve)(originalFile, '..'), { recursive: true });
            await fs_1.promises.copyFile(workspaceFile, originalFile);
        }
    }
    async cleanup() {
        try {
            await fs_1.promises.rm(this.workspacePath, { recursive: true, force: true });
        }
        catch (error) {
            console.log('⚠️ Failed to cleanup workspace:', error);
        }
    }
    getWorkspacePath() {
        return this.workspacePath;
    }
}
exports.WorkspaceManager = WorkspaceManager;
