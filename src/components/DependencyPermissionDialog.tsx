import React, { useState } from "react";
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBar } from "@/components/ui/LoadingBar";
import { InstallationProgress } from "@/services/installationCoordinator";

interface DependencyPermissionDialogProps {
  isOpen: boolean;
  missingDependencies: string[];
  onInstall: (onProgress: (progress: InstallationProgress) => void) => Promise<void>;
  onSkip: () => void;
  onCancel: () => void;
}

export function DependencyPermissionDialog({
  isOpen,
  missingDependencies,
  onInstall,
  onSkip,
  onCancel,
}: DependencyPermissionDialogProps) {
  const [isInstalling, setIsInstalling] = useState(false);
  const [installationProgress, setInstallationProgress] = useState<InstallationProgress[]>([]);
  const [installationComplete, setInstallationComplete] = useState(false);

  if (!isOpen) return null;

  const handleInstall = async () => {
    setIsInstalling(true);
    setInstallationProgress([]);

    const progressCallback = (progress: InstallationProgress) => {
      setInstallationProgress(prev => {
        const existingIndex = prev.findIndex(p => p.dependency === progress.dependency);
        if (existingIndex >= 0) {
          // Update existing progress
          const updated = [...prev];
          updated[existingIndex] = progress;
          return updated;
        } else {
          // Add new progress
          return [...prev, progress];
        }
      });
    };

    try {
      await onInstall(progressCallback);
      setInstallationComplete(true);
    } catch (error) {
      console.error("Installation failed:", error);
    } finally {
      setIsInstalling(false);
    }
  };

  const getProgressIcon = (status: InstallationProgress["status"]) => {
    switch (status) {
      case "installing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getProgressColor = (status: InstallationProgress["status"]) => {
    switch (status) {
      case "installing":
        return "text-blue-600";
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const completedCount = installationProgress.filter(p => p.status !== "installing").length;
  const totalCount = missingDependencies.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onCancel}
        />

        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          <div className="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6">
            <div className="flex items-start">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                  Missing System Dependencies
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    AliFullStack requires the following dependencies to run backend servers and manage Node.js packages:
                  </p>
                  <ul className="mt-2 list-disc list-inside text-sm text-gray-600 dark:text-gray-300">
                    {missingDependencies.map(dep => (
                      <li key={dep}>
                        <strong>{dep}</strong> - {dep === "uvicorn" ? "FastAPI/ASGI server for Python backends" : "Node.js package runner for frontend tools"}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Would you like AliFullStack to install these dependencies automatically?
                  </p>
                </div>
              </div>
            </div>

            {/* Installation Progress */}
            {isInstalling && (
              <div className="mt-6">
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>Installing dependencies...</span>
                    <span>{completedCount}/{totalCount}</span>
                  </div>
                  <LoadingBar isVisible={true} />
                </div>

                <div className="space-y-2">
                  {installationProgress.map(progress => (
                    <div key={progress.dependency} className="flex items-center space-x-2 text-sm">
                      {getProgressIcon(progress.status)}
                      <span className="flex-1">{progress.message}</span>
                      {progress.error && (
                        <span className="text-xs text-red-500">{progress.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Installation Complete */}
            {installationComplete && (
              <div className="mt-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Installation Complete</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      All dependencies have been installed successfully. Your app will now restart automatically.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            {!installationComplete ? (
              <>
                <Button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleInstall}
                  disabled={isInstalling}
                >
                  {isInstalling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Installing...
                    </>
                  ) : (
                    "Install Dependencies"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 inline-flex w-full justify-center rounded-md px-4 py-2 text-base font-medium shadow-sm sm:mt-0 sm:w-auto sm:text-sm"
                  onClick={onSkip}
                  disabled={isInstalling}
                >
                  Skip for Now
                </Button>
              </>
            ) : (
              <Button
                type="button"
                className="inline-flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm bg-green-600 hover:bg-green-700 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={onSkip}
              >
                Continue
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="mt-3 inline-flex w-full justify-center rounded-md px-4 py-2 text-base font-medium shadow-sm sm:mt-0 sm:w-auto sm:text-sm"
              onClick={onCancel}
              disabled={isInstalling}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}