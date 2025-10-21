import React, { useState, useEffect } from "react";
import { DependencyPermissionDialog } from "./DependencyPermissionDialog";
import { InstallationCoordinator } from "@/services/installationCoordinator";
import { showError } from "@/lib/toast";

export function DependencyManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [missingDependencies, setMissingDependencies] = useState<string[]>([]);
  const [isInstalling, setIsInstalling] = useState(false);
  const [retryAppId, setRetryAppId] = useState<number | undefined>();

  useEffect(() => {
    // Listen for dependency dialog requests from main process
    const handleShowDialog = (_event: any, data: { missingDependencies: string[], retryAppId?: number }) => {
      setMissingDependencies(data.missingDependencies);
      setRetryAppId(data.retryAppId);
      setIsDialogOpen(true);
    };

    // Listen for installation progress updates
    const handleProgress = (_event: any, progress: any) => {
      console.log("Installation progress:", progress);
    };

    // Listen for installation completion
    const handleComplete = (_event: any, result: any) => {
      setIsInstalling(false);
      if (result.success) {
        setIsDialogOpen(false);
        // If we have a retryAppId, emit an event to retry app startup
        if (result.retryAppId) {
          // Emit event to retry app startup
          window.electronAPI.invoke("run-app", { appId: result.retryAppId });
        }
      } else {
        showError(`Dependency installation failed: ${result.error}`);
        // Show fallback message when installation fails
        if (result.retryAppId) {
          showError(`App startup failed due to missing dependencies. Please ensure ${result.missingDependencies?.join(", ") || "required dependencies"} are installed manually and try again.`);
        }
      }
    };

    // @ts-ignore
    window.electronAPI.on("show-dependency-dialog", handleShowDialog);
    // @ts-ignore
    window.electronAPI.on("dependency-install-progress", handleProgress);
    // @ts-ignore
    window.electronAPI.on("dependency-install-complete", handleComplete);

    return () => {
      // @ts-ignore
      window.electronAPI.off("show-dependency-dialog", handleShowDialog);
      // @ts-ignore
      window.electronAPI.off("dependency-install-progress", handleProgress);
      // @ts-ignore
      window.electronAPI.off("dependency-install-complete", handleComplete);
    };
  }, []);

  const handleInstall = async (onProgress: (progress: any) => void) => {
    setIsInstalling(true);
    try {
      await InstallationCoordinator.installDependencies(missingDependencies, onProgress);
    } catch (error) {
      throw error;
    }
  };

  const handleSkip = () => {
    setIsDialogOpen(false);
    setMissingDependencies([]);
    setRetryAppId(undefined);
    // Show fallback message when user declines installation
    if (retryAppId) {
      showError(`App startup failed due to missing dependencies. Please install ${missingDependencies.join(", ")} manually and restart the app.`);
    }
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setMissingDependencies([]);
    setRetryAppId(undefined);
    // Show fallback message when user cancels installation
    if (retryAppId) {
      showError(`App startup was cancelled. Please install ${missingDependencies.join(", ")} manually to run the app.`);
    }
  };

  return (
    <DependencyPermissionDialog
      isOpen={isDialogOpen}
      missingDependencies={missingDependencies}
      onInstall={handleInstall}
      onSkip={handleSkip}
      onCancel={handleCancel}
    />
  );
}