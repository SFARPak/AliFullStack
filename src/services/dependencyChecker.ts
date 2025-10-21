import { execSync } from "node:child_process";
import { getShellEnv } from "../ipc/handlers/app_handlers";
import log from "electron-log";

const logger = log.scope("dependency-checker");

export interface DependencyCheckResult {
  uvicorn: boolean;
  npx: boolean;
  isMissing: boolean;
}

export class DependencyChecker {
  /**
   * Checks if uvicorn and npx are available in the system PATH
   */
  static async checkDependencies(): Promise<DependencyCheckResult> {
    const shellEnv = getShellEnv();
    const results: DependencyCheckResult = {
      uvicorn: false,
      npx: false,
      isMissing: false,
    };

    // Check uvicorn
    try {
      const whichCommand = process.platform === "win32" ? "where" : "which";
      execSync(`${whichCommand} uvicorn`, {
        env: { ...shellEnv, PATH: shellEnv.PATH },
        encoding: "utf8",
        stdio: "pipe",
      });
      results.uvicorn = true;
      logger.info("✅ uvicorn found in PATH");
    } catch (error) {
      logger.warn("❌ uvicorn not found in PATH");
    }

    // Check npx
    try {
      const whichCommand = process.platform === "win32" ? "where" : "which";
      execSync(`${whichCommand} npx`, {
        env: { ...shellEnv, PATH: shellEnv.PATH },
        encoding: "utf8",
        stdio: "pipe",
      });
      results.npx = true;
      logger.info("✅ npx found in PATH");
    } catch (error) {
      logger.warn("❌ npx not found in PATH");
    }

    // Determine if any dependencies are missing
    results.isMissing = !results.uvicorn || !results.npx;

    if (results.isMissing) {
      logger.info(`Missing dependencies detected: uvicorn=${!results.uvicorn}, npx=${!results.npx}`);
    } else {
      logger.info("All dependencies are available");
    }

    return results;
  }

  /**
   * Gets a list of missing dependency names
   */
  static async getMissingDependencies(): Promise<string[]> {
    const checkResult = await this.checkDependencies();
    const missing: string[] = [];

    if (!checkResult.uvicorn) missing.push("uvicorn");
    if (!checkResult.npx) missing.push("npx");

    return missing;
  }

  /**
   * Checks if all required dependencies are available
   */
  static async areDependenciesAvailable(): Promise<boolean> {
    const checkResult = await this.checkDependencies();
    return !checkResult.isMissing;
  }
}