import { useEffect, useMemo, useState } from "react";
import { useLoadAppFile } from "@/hooks/useLoadAppFile";
import { useLoadApp } from "@/hooks/useLoadApp";

export interface ParsedRoute {
  path: string;
  label: string;
}

/**
 * Loads the app router file and parses available routes for quick navigation.
 */
export function useParseRouter(appId: number | null) {
  const [routes, setRoutes] = useState<ParsedRoute[]>([]);

  // Load app to access the file list
  const {
    app,
    loading: appLoading,
    error: appError,
    refreshApp,
  } = useLoadApp(appId);

  // Load router related file to extract routes for non-Next apps
  // First try frontend/src/App.tsx (new structure), then fallback to src/App.tsx
  const {
    content: frontendRouterContent,
    loading: frontendRouterFileLoading,
    error: frontendRouterFileError,
  } = useLoadAppFile(appId, "frontend/src/App.tsx");

  const {
    content: routerContent,
    loading: routerFileLoading,
    error: routerFileError,
    refreshFile,
  } = useLoadAppFile(appId, "src/App.tsx");

  const {
    content: vueRouterContent,
    loading: vueRouterLoading,
    error: vueRouterError,
  } = useLoadAppFile(appId, "src/router/index.js");

  const {
    content: vueAppContent,
    loading: vueAppLoading,
    error: vueAppError,
  } = useLoadAppFile(appId, "src/App.vue");

  // Use frontend router content if available, otherwise fallback to root or Vue specific
  const finalRouterContent = isVueApp ? vueAppContent : (frontendRouterContent || routerContent);
  const finalRouterLoading = frontendRouterFileLoading || routerFileLoading || (isVueApp ? vueAppLoading : false);
  const finalRouterError = frontendRouterFileError || routerFileError || (isVueApp ? vueAppError : false);

  // Detect Next.js app by presence of next.config.* in file list
  const isNextApp = useMemo(() => {
    if (!app?.files) return false;
    return app.files.some((f) => f.toLowerCase().includes("next.config"));
  }, [app?.files]);

  // Detect Vue app by presence of .vue files
  const isVueApp = useMemo(() => {
    if (!app?.files) return false;
    return app.files.some((f) => f.toLowerCase().endsWith(".vue"));
  }, [app?.files]);

  // Parse routes either from Next.js file-based routing or from router file
  useEffect(() => {
    const buildLabel = (path: string) =>
      path === "/"
        ? "Home"
        : path
            .split("/")
            .filter((segment) => segment && !segment.startsWith(":"))
            .pop()
            ?.replace(/[-_]/g, " ")
            .replace(/^\w/, (c) => c.toUpperCase()) || path;

    const setFromNextFiles = (files: string[]) => {
      const nextRoutes = new Set<string>();

      // pages directory (pages router)
      const pageFileRegex = /^(?:pages)\/(.+)\.(?:js|jsx|ts|tsx|mdx)$/i;
      for (const file of files) {
        if (!file.startsWith("pages/")) continue;
        if (file.startsWith("pages/api/")) continue; // skip api routes
        const baseName = file.split("/").pop() || "";
        if (baseName.startsWith("_")) continue; // _app, _document, etc.

        const m = file.match(pageFileRegex);
        if (!m) continue;
        let routePath = m[1];

        // Ignore dynamic routes containing [ ]
        if (routePath.includes("[")) continue;

        // Normalize index files
        if (routePath === "index") {
          nextRoutes.add("/");
          continue;
        }
        if (routePath.endsWith("/index")) {
          routePath = routePath.slice(0, -"/index".length);
        }

        nextRoutes.add("/" + routePath);
      }

      // app directory (app router)
      const appPageRegex =
        /^(?:src\/)?app\/(.*)\/page\.(?:js|jsx|ts|tsx|mdx)$/i;
      for (const file of files) {
        const lower = file.toLowerCase();
        if (
          lower === "app/page.tsx" ||
          lower === "app/page.jsx" ||
          lower === "app/page.js" ||
          lower === "app/page.mdx" ||
          lower === "app/page.ts" ||
          lower === "src/app/page.tsx" ||
          lower === "src/app/page.jsx" ||
          lower === "src/app/page.js" ||
          lower === "src/app/page.mdx" ||
          lower === "src/app/page.ts"
        ) {
          nextRoutes.add("/");
          continue;
        }
        const m = file.match(appPageRegex);
        if (!m) continue;
        const routeSeg = m[1];
        // Ignore dynamic segments and grouping folders like (marketing)
        if (routeSeg.includes("[")) continue;
        const cleaned = routeSeg
          .split("/")
          .filter((s) => s && !s.startsWith("("))
          .join("/");
        if (!cleaned) {
          nextRoutes.add("/");
        } else {
          nextRoutes.add("/" + cleaned);
        }
      }

      const parsed = Array.from(nextRoutes).map((path) => ({
        path,
        label: buildLabel(path),
      }));
      setRoutes(parsed);
    };

    const setFromRouterFile = (content: string | null) => {
      if (!content) {
        setRoutes([]);
        return;
      }

      try {
        const parsedRoutes: ParsedRoute[] = [];
        const routePathsRegex = /<Route\s+(?:[^>]*\s+)?path=["']([^"']+)["']/g;
        let match: RegExpExecArray | null;

        while ((match = routePathsRegex.exec(content)) !== null) {
          const path = match[1];
          const label = buildLabel(path);
          if (!parsedRoutes.some((r) => r.path === path)) {
            parsedRoutes.push({ path, label });
          }
        }
        setRoutes(parsedRoutes);
      } catch (e) {
        console.error("Error parsing router file:", e);
        setRoutes([]);
      }
    };

    const setFromVueRouterFile = (content: string | null) => {
      if (!content) {
        setRoutes([]);
        return;
      }

      try {
        const parsedRoutes: ParsedRoute[] = [];
        const routeRegex = /path:\s*['"`]([^'"`]+)['"`]/g;
        let match: RegExpExecArray | null;

        while ((match = routeRegex.exec(content)) !== null) {
          const path = match[1];
          const label = buildLabel(path);
          if (!parsedRoutes.some((r) => r.path === path)) {
            parsedRoutes.push({ path, label });
          }
        }
        setRoutes(parsedRoutes);
      } catch (e) {
        console.error("Error parsing Vue router file:", e);
        setRoutes([]);
      }
    };

    if (isVueApp) {
      setFromVueRouterFile(vueRouterContent ?? null);
    } else if (isNextApp && app?.files) {
      setFromNextFiles(app.files);
    } else {
      setFromRouterFile(finalRouterContent ?? null);
    }
  }, [isVueApp, isNextApp, app?.files, finalRouterContent, vueRouterContent]);

  const combinedLoading = appLoading || finalRouterLoading || vueRouterLoading || vueAppLoading;
  const combinedError = appError || finalRouterError || vueRouterError || vueAppError || null;
  const refresh = async () => {
    await Promise.allSettled([refreshApp(), refreshFile()]);
    // Also refresh frontend router file if it exists
    if (frontendRouterContent) {
      // Note: We don't have a direct refresh for frontend router, but refetching app will trigger re-evaluation
    }
  };

  return {
    routes,
    loading: combinedLoading,
    error: combinedError,
    refreshFile: refresh,
  };
}
