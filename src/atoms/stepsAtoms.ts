import { atom } from "jotai";

export interface StepError {
  summary: string;
  details?: string;
  timestamp: Date;
}

export interface StepItem {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  error?: StepError;
  chatId: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export const stepsListAtom = atom<StepItem[]>([]);
export const isStepsSummaryOpenAtom = atom<boolean>(false);

// Derive step counts
export const stepsSummaryAtom = atom((get) => {
  const steps = get(stepsListAtom);
  return {
    total: steps.length,
    completed: steps.filter((s) => s.status === "completed").length,
    failed: steps.filter((s) => s.status === "failed").length,
    inProgress: steps.filter((s) => s.status === "in_progress").length,
    pending: steps.filter((s) => s.status === "pending").length,
  };
});