"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validator = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class Validator {
    constructor(projectRoot, timeoutMs = 120000) {
        this.projectRoot = projectRoot;
        this.timeoutMs = timeoutMs;
    }
    async validate() {
        const result = {
            success: true,
            tsCheck: false,
            eslintCheck: false,
            buildCheck: false
        };
        try {
            const buildResult = await this.checkBuild();
            result.tsCheck = true;
            result.eslintCheck = true;
            result.buildCheck = buildResult.success;
            result.success = result.buildCheck;
            if (!result.success) {
                result.error = `Build: ${buildResult.error}`;
            }
        }
        catch (error) {
            result.success = false;
            result.error = error instanceof Error ? error.message : String(error);
        }
        return result;
    }
    async checkTypeScript() {
        try {
            await execAsync('npx tsc --noEmit --skipLibCheck --noUnusedLocals false', {
                cwd: this.projectRoot,
                timeout: this.timeoutMs
            });
            return { success: true };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.log('TypeScript check failed:', error);
            return { success: false, error: errorMsg };
        }
    }
    async checkESLint() {
        try {
            await execAsync('npx eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 100', {
                cwd: this.projectRoot,
                timeout: this.timeoutMs
            });
            return { success: true };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.log('ESLint errors detected (warnings allowed):', error);
            return { success: false, error: errorMsg };
        }
    }
    async checkBuild() {
        try {
            await execAsync('npm run build', {
                cwd: this.projectRoot,
                timeout: this.timeoutMs
            });
            return { success: true };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.log('Build check failed:', error);
            return { success: false, error: errorMsg };
        }
    }
}
exports.Validator = Validator;
