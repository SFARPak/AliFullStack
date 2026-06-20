import React, { useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  stepsListAtom,
  stepsSummaryAtom,
  isStepsSummaryOpenAtom,
  type StepItem,
} from "@/atoms/stepsAtoms";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  CheckCircle2,
  Circle,
  Loader2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Play,
  Trash2,
  ListChecks,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  CheckCheck,
  Rocket,
  Sparkles,
  Trophy,
} from "lucide-react";

interface StepsSummaryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function ConclusiveSummary({
  totalSteps,
  duration,
}: {
  totalSteps: number;
  duration: number;
}) {
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="relative rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50/80 to-green-50/50 dark:from-emerald-950/20 dark:to-green-950/10 p-5 animate-fade-in">
      {/* Decorative sparkle */}
      <div className="absolute -top-2 -right-2">
        <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
      </div>

      {/* Trophy icon */}
      <div className="flex justify-center mb-3">
        <div className="relative">
          <Trophy className="w-10 h-10 text-amber-400" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-bold text-center text-emerald-700 dark:text-emerald-300 mb-1">
        Development Complete
      </h3>

      {/* Stats */}
      <div className="flex items-center justify-center gap-3 mt-2 text-xs text-emerald-600/70 dark:text-emerald-400/70">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {totalSteps} steps completed
        </span>
        <span className="flex items-center gap-1">
          <Rocket className="w-3.5 h-3.5" />
          {formatDuration(duration)}
        </span>
      </div>

      {/* Divider */}
      <div className="my-3 border-t border-emerald-200/50 dark:border-emerald-800/30" />

      {/* Conclusive message */}
      <p className="text-xs text-center text-emerald-600/80 dark:text-emerald-400/80 leading-relaxed">
        The app has been built successfully. All development steps have been
        executed and verified. The application is ready for review and testing.
      </p>
    </div>
  );
}

function formatErrorSummary(summary: string): string {
  const lower = summary.toLowerCase();

  // Model/API errors
  if (lower.includes("quota") || lower.includes("rate limit") || lower.includes("429") || lower.includes("free quota")) {
    return "Model quota exceeded";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "Request timed out";
  }
  if (lower.includes("api key") || lower.includes("unauthorized") || lower.includes("401") || lower.includes("403")) {
    return "API authentication failed";
  }
  if (lower.includes("network") || lower.includes("econnrefused") || lower.includes("enotfound") || lower.includes("econnreset")) {
    return "Network error";
  }
  if (lower.includes("token") && (lower.includes("exceed") || lower.includes("limit") || lower.includes("max"))) {
    return "Token limit exceeded";
  }
  if (lower.includes("not found") || lower.includes("enoent")) {
    return "File not found";
  }
  if (lower.includes("permission") || lower.includes("eacces") || lower.includes("eperm")) {
    return "Permission denied";
  }
  if (lower.includes("syntax") || lower.includes("parse")) {
    return "Syntax error";
  }

  // Fallback: truncate to first sentence, max 60 chars
  const firstSentence = summary.split(/\.(?:\s|$)/)[0];
  return firstSentence.length > 60 ? firstSentence.slice(0, 57) + "..." : firstSentence;
}

export function StepsSummaryPanel({ isOpen, onClose }: StepsSummaryPanelProps) {
  const [steps, setSteps] = useAtom(stepsListAtom);
  const summary = useAtomValue(stepsSummaryAtom);
  const chatId = useAtomValue(selectedChatIdAtom);

  // Filter steps for current chat
  const currentChatSteps = steps.filter((step) => step.chatId === chatId);

  if (!isOpen) return null;

  return (
    <div className="w-64 sm:w-72 md:w-80 lg:w-96 h-full bg-background border-l border-border flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Steps</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="flex items-center gap-1 text-xs">
            <ListChecks className="w-3 h-3" />
            {summary.total} total
          </Badge>
          {summary.completed > 0 && (
            <Badge variant="default" className="flex items-center gap-1 text-xs bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20">
              <CheckCircle2 className="w-3 h-3" />
              {summary.completed} done
            </Badge>
          )}
          {summary.inProgress > 0 && (
            <Badge variant="default" className="flex items-center gap-1 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20">
              <Loader2 className="w-3 h-3 animate-spin" />
              {summary.inProgress} active
            </Badge>
          )}
          {summary.failed > 0 && (
            <Badge variant="default" className="flex items-center gap-1 text-xs bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20">
              <XCircle className="w-3 h-3" />
              {summary.failed} failed
            </Badge>
          )}
          {summary.pending > 0 && (
            <Badge variant="outline" className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {summary.pending} pending
            </Badge>
          )}
        </div>

        {/* Progress bar */}
        {summary.total > 0 && (
          <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${(summary.completed / summary.total) * 100}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {currentChatSteps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <ListChecks className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">No steps recorded yet</p>
            <p className="text-xs mt-1 text-center opacity-60">
              Steps will appear here as the AI works through tasks
            </p>
          </div>
        ) : (
          <>
            {currentChatSteps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                index={index}
                isLatest={index === currentChatSteps.length - 1}
                onDelete={() => {
                  setSteps((prev) => prev.filter((s) => s.id !== step.id));
                }}
              />
            ))}
            {/* Conclusive summary when all steps completed */}
            {currentChatSteps.length > 0 &&
              summary.completed === summary.total &&
              summary.failed === 0 && (
                <ConclusiveSummary
                  totalSteps={summary.total}
                  duration={(() => {
                    const first = currentChatSteps[0];
                    const last = currentChatSteps[currentChatSteps.length - 1];
                    if (first && last && last.completedAt) {
                      return Math.round(
                        (new Date(last.completedAt).getTime() -
                          new Date(first.createdAt).getTime()) /
                          1000,
                      );
                    }
                    return 0;
                  })()}
                />
              )}
          </>
        )}
      </div>
    </div>
  );
}

function StepCard({
  step,
  index,
  isLatest,
  onDelete,
}: {
  step: StepItem;
  index: number;
  isLatest: boolean;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = () => {
    switch (step.status) {
      case "pending":
        return <Circle className="w-4 h-4 text-muted-foreground/50" />;
      case "in_progress":
        return (
          <div className="relative">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
          </div>
        );
      case "completed":
        return (
          <div className="relative">
            <CheckCircle2 className="w-4 h-4 text-green-500 animate-scale-in" />
          </div>
        );
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const statusBadge = () => {
    switch (step.status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
            Pending
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
            <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
            Running
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800">
            Done
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800">
            Failed
          </Badge>
        );
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(date).toLocaleTimeString();
  };

  return (
    <div
      className={`
        group relative rounded-lg border transition-all duration-300
        ${
          step.status === "completed"
            ? "border-green-200 dark:border-green-900/50 bg-green-50/30 dark:bg-green-950/10"
            : step.status === "failed"
              ? "border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10"
              : step.status === "in_progress"
                ? "border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/10"
                : "border-border bg-background"
        }
        ${isLatest && step.status === "in_progress" ? "animate-slide-in" : ""}
      `}
    >
      {/* Connection line */}
      {index > 0 && (
        <div className="absolute -top-3 left-3.5 w-0.5 h-3 bg-border" />
      )}

      <div className="p-3">
        {/* Top row: icon, title, badge, time */}
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex-shrink-0">{statusIcon()}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`
                  text-sm font-medium truncate
                  ${step.status === "completed" ? "text-green-700 dark:text-green-300" : ""}
                  ${step.status === "failed" ? "text-red-700 dark:text-red-300" : ""}
                  ${step.status === "in_progress" ? "text-blue-700 dark:text-blue-300" : ""}
                `}
              >
                {step.title}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                {statusBadge()}
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {formatTime(step.updatedAt)}
                </span>
              </div>
            </div>
            {step.description && (
              <p
                className={`
                  text-xs mt-0.5
                  ${step.status === "completed" ? "text-green-600/70 dark:text-green-400/70" : ""}
                  ${step.status === "failed" ? "text-red-600/70 dark:text-red-400/70" : ""}
                  ${step.status === "in_progress" ? "text-blue-600/70 dark:text-blue-400/70" : ""}
                  ${step.status === "pending" ? "text-muted-foreground/70" : ""}
                `}
              >
                {step.description}
              </p>
            )}

            {/* User-friendly error summary - concise, no expandable details */}
            {step.status === "failed" && step.error && (
              <div className="mt-2">
                <div className="flex items-start gap-1.5 p-1.5 rounded-md bg-red-100/50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs font-medium text-red-700 dark:text-red-300">
                    {formatErrorSummary(step.error.summary)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Delete button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 flex-shrink-0"
          >
            <Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-500" />
          </Button>
        </div>

        {/* Duration */}
        {step.status === "completed" && step.completedAt && (
          <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground/60">
            <Zap className="w-2.5 h-2.5" />
            <span>
              Completed in{" "}
              {Math.round(
                (new Date(step.completedAt).getTime() -
                  new Date(step.createdAt).getTime()) /
                  1000,
              )}s
            </span>
          </div>
        )}
      </div>
    </div>
  );
}