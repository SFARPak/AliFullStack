import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSettings } from "@/hooks/useSettings";

export function ModePicker() {
  const { settings, updateSettings } = useSettings();

  if (!settings) return null;

  const mode = settings.executionMode || "manual";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 h-8 px-1.5 text-xs-sm"
        >
          <span className="text-xs text-muted-foreground mr-1">Mode:</span>
          <span className="capitalize">
            {mode === "manual" ? "User Input" : "Autonomous"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          onClick={() => updateSettings({ executionMode: "autonomous" })}
          className={mode === "autonomous" ? "bg-secondary" : ""}
        >
          Autonomous
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateSettings({ executionMode: "manual" })}
          className={mode === "manual" ? "bg-secondary" : ""}
        >
          User Input
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
