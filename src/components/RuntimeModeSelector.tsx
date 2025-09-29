import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings } from "@/hooks/useSettings";
import { showError } from "@/lib/toast";
import { IpcClient } from "@/ipc/ipc_client";

export function RuntimeModeSelector() {
  const { settings, updateSettings } = useSettings();

  if (!settings) {
    return null;
  }

  // Apps always run in host mode now - Docker is disabled for development
  const handleRuntimeModeChange = async (value: "host" | "docker") => {
    // Only allow host mode - Docker is disabled for app development
    if (value === "docker") {
      showError(
        "Docker mode is disabled. Apps always run in local development mode for optimal development experience.",
      );
      return;
    }
    try {
      await updateSettings({ runtimeMode2: value });
    } catch (error: any) {
      showError(`Failed to update runtime mode: ${error.message}`);
    }
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          <Label className="text-sm font-medium" htmlFor="runtime-mode">
            Runtime Mode
          </Label>
          <Select
            value={settings.runtimeMode2 ?? "host"}
            onValueChange={handleRuntimeModeChange}
          >
            <SelectTrigger className="w-48" id="runtime-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="host">Local (default)</SelectItem>
              <SelectItem value="docker" disabled>
                Docker (disabled)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Apps always run in local development mode for optimal development
          experience. Docker mode is disabled.
        </div>
      </div>
      <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
        ℹ️ Docker mode is disabled for app development. Apps run directly on
        your local machine for the best development experience.
      </div>
    </div>
  );
}
