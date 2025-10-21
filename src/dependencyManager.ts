import { BrowserWindow } from "electron";
import { DependencyChecker } from "./services/dependencyChecker";
import { InstallationCoordinator } from "./services/installationCoordinator";
import log from "electron-log";

const logger = log.scope("dependency-manager");

let mainWindow: BrowserWindow | null = null;

/**
 * Sets the main window reference for IPC communication
 */
export function setMainWindow(window: BrowserWindow) {
  mainWindow = window;
}

/**
 * Checks for missing dependencies on application startup
 */
export async function checkDependenciesOnStartup(retryAppId?: number): Promise<void> {
  try {
    logger.info("Checking system dependencies on startup...");

    const checkResult = await DependencyChecker.checkDependencies();

    if (!checkResult.isMissing) {
      logger.info("All required dependencies are available");
      return;
    }

    const missingDeps = await DependencyChecker.getMissingDependencies();

    // Wait for main window to be ready before showing dialog
    if (!mainWindow) {
      logger.warn("Main window not available, cannot show dependency dialog");
      return;
    }

    // Send message to renderer to show the dependency permission dialog
    mainWindow.webContents.send("show-dependency-dialog", {
      missingDependencies: missingDeps,
      retryAppId,
    });

    logger.info(`Dependency check complete. Missing: ${missingDeps.join(", ")}`);
  } catch (error) {
    logger.error("Error checking dependencies on startup:", error);
  }
}

/**
 * Handles dependency installation request from renderer
 */
export async function installDependencies(
  dependencies: string[],
  onProgress?: (progress: any) => void,
  retryAppId?: number
): Promise<void> {
  try {
    logger.info(`Installing dependencies: ${dependencies.join(", ")}`);

    const results = await InstallationCoordinator.installDependencies(
      dependencies,
      (progress) => {
        // Send progress updates to renderer
        if (mainWindow) {
          mainWindow.webContents.send("dependency-install-progress", progress);
        }
        onProgress?.(progress);
      }
    );

    // Validate installation
    const isValid = await InstallationCoordinator.validateInstallation(dependencies);

    if (!isValid) {
      throw new Error("Installation validation failed");
    }

    // Notify renderer of completion
    if (mainWindow) {
      mainWindow.webContents.send("dependency-install-complete", {
        success: true,
        results,
        retryAppId,
      });
    }

    logger.info("Dependency installation completed successfully");
  } catch (error) {
    logger.error("Error installing dependencies:", error);

    // Notify renderer of failure
    if (mainWindow) {
      mainWindow.webContents.send("dependency-install-complete", {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        retryAppId,
      });
    }

    throw error;
  }
}

/**
 * Checks if specific dependencies are missing that could cause startup failures
 */
export async function checkMissingDependenciesForAppStart(): Promise<{
  isMissing: boolean;
  missingDependencies: string[];
  shouldShowDialog: boolean;
}> {
  try {
    const checkResult = await DependencyChecker.checkDependencies();
    const missingDeps = checkResult.isMissing
      ? await DependencyChecker.getMissingDependencies()
      : [];

    return {
      isMissing: checkResult.isMissing,
      missingDependencies: missingDeps,
      shouldShowDialog: checkResult.isMissing, // Show dialog if any dependencies are missing
    };
  } catch (error) {
    logger.error("Error checking missing dependencies for app start:", error);
    return {
      isMissing: false,
      missingDependencies: [],
      shouldShowDialog: false,
    };
  }
}

/**
 * Gets the current dependency status
 */
export async function getDependencyStatus() {
  try {
    const checkResult = await DependencyChecker.checkDependencies();
    const missingDeps = checkResult.isMissing
      ? await DependencyChecker.getMissingDependencies()
      : [];

    return {
      uvicorn: checkResult.uvicorn,
      npx: checkResult.npx,
      isMissing: checkResult.isMissing,
      missingDependencies: missingDeps,
    };
  } catch (error) {
    logger.error("Error getting dependency status:", error);
    throw error;
  }
}