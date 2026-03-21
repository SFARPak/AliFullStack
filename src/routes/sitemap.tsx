import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";
import SitemapPage from "../pages/sitemap";
import { z } from "zod";

export const sitemapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sitemap",
  component: SitemapPage,
  validateSearch: z.object({
    appId: z.number().optional(),
  }),
});
