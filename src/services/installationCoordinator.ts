import { spawn } from "node:child_process";
import { getShellEnv } from "../ipc/handlers/app_handlers";
import log from "electron-log";

const logger = log.scope("installation-coordinator");

export interface InstallationProgress {
  dependency: string;
  status: "installing" | "success" | "error";
  message?: string;
  error?: string;
}

export interface InstallationResult {
  dependency: string;
  success: boolean;
  message: string;
  error?: string;
}

export class InstallationCoordinator {
  private static readonly INSTALLATION_COMMANDS = {
    uvicorn: {
      mac: "pip3 install uvicorn[standard]",
      linux: "pip3 install uvicorn[standard]",
      windows: "pip install uvicorn[standard]",
    },
    npx: {
      mac: "npm install -g npx",
      linux: "npm install -g npx",
      windows: "npm install -g npx",
    },
  };

  /**
   * Installs the specified dependencies cross-platform
   */
  static async installDependencies(
    dependencies: string[],
    onProgress?: (progress: InstallationProgress) => void
  ): Promise<InstallationResult[]> {
    const results: InstallationResult[] = [];
    const shellEnv = getShellEnv();

    for (const dependency of dependencies) {
      onProgress?.({
        dependency,
        status: "installing",
        message: `Installing ${dependency}...`,
      });

      try {
        const result = await this.installDependency(dependency, shellEnv);
        results.push(result);

        onProgress?.({
          dependency,
          status: result.success ? "success" : "error",
          message: result.message,
          error: result.error,
        });
      } catch (error) {
        const errorResult: InstallationResult = {
          dependency,
          success: false,
          message: `Installation of ${dependency} failed`,
          error: error instanceof Error ? error.message : String(error),
        };

        results.push(errorResult);

        onProgress?.({
          dependency,
          status: "error",
          message: errorResult.message,
          error: errorResult.error,
        });
      }
    }

    return results;
  }

  /**
   * Installs a single dependency
   */
  private static async installDependency(
    dependency: string,
    shellEnv: NodeJS.ProcessEnv
  ): Promise<InstallationResult> {
    const platform = this.getPlatform();
    const command = this.getInstallCommand(dependency, platform);

    if (!command) {
      return {
        dependency,
        success: false,
        message: `No installation command defined for ${dependency} on ${platform}`,
        error: "Unsupported dependency or platform",
      };
    }

    logger.info(`Installing ${dependency} with command: ${command}`);

    return new Promise((resolve) => {
      const installProcess = spawn(command, [], {
        shell: true,
        stdio: "pipe",
        env: shellEnv,
      });

      let stdout = "";
      let stderr = "";

      installProcess.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      installProcess.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      installProcess.on("close", (code) => {
        if (code === 0) {
          logger.info(`Successfully installed ${dependency}`);
          resolve({
            dependency,
            success: true,
            message: `${dependency} installed successfully`,
          });
        } else {
          logger.error(`Failed to install ${dependency} (code: ${code}): ${stderr}`);
          resolve({
            dependency,
            success: false,
            message: `Installation of ${dependency} failed`,
            error: stderr || `Process exited with code ${code}`,
          });
        }
      });

      installProcess.on("error", (err) => {
        logger.error(`Failed to start installation process for ${dependency}:`, err);
        resolve({
          dependency,
          success: false,
          message: `Failed to start installation of ${dependency}`,
          error: err.message,
        });
      });
    });
  }

  /**
   * Gets the platform identifier
   */
  private static getPlatform(): "mac" | "linux" | "windows" {
    switch (process.platform) {
      case "darwin":
        return "mac";
      case "win32":
        return "windows";
      default:
        return "linux";
    }
  }

  /**
   * Gets the installation command for a dependency on a specific platform
   */
  private static getInstallCommand(
    dependency: string,
    platform: "mac" | "linux" | "windows"
  ): string | null {
    const commands = this.INSTALLATION_COMMANDS[dependency as keyof typeof this.INSTALLATION_COMMANDS];
    if (!commands) {
      return null;
    }
    return commands[platform];
  }

  /**
   * Validates that the installation was successful by re-checking dependencies
   */
  static async validateInstallation(dependencies: string[]): Promise<boolean> {
    try {
      const { DependencyChecker } = await import("./dependencyChecker");

      for (const dependency of dependencies) {
        switch (dependency) {
          case "uvicorn": {
            const checkResult = await DependencyChecker.checkDependencies();
            if (!checkResult.uvicorn) {
              logger.warn(`Validation failed: uvicorn not found after installation`);
              return false;
            }
            break;
          }
          case "npx": {
            const checkResult = await DependencyChecker.checkDependencies();
            if (!checkResult.npx) {
              logger.warn(`Validation failed: npx not found after installation`);
              return false;
            }
            break;
          }
          default:
            logger.warn(`Unknown dependency for validation: ${dependency}`);
            return false;
        }
      }

      logger.info("Installation validation successful");
      return true;
    } catch (error) {
      logger.error("Installation validation failed:", error);
      return false;
    }
  }
}