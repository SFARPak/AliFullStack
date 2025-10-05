export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
  subtasks: Subtask[];
  chatId: number;
  createdAt: Date;
  updatedAt: Date;
}

import { atom } from "jotai";

// Atoms for todo management
export const todoListAtom = atom<TodoItem[]>([]);
export const isTodoPanelOpenAtom = atom<boolean>(false);