import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import KanbanPage from "../pages/kanban";
import { z } from "zod";

export const kanbanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/kanban",
  component: KanbanPage,
  validateSearch: z.object({
    appId: z.number().optional(),
  }),
});
