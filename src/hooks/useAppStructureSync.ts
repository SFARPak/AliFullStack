import { useEffect, useCallback, useState } from "react";
import { useAtom } from "jotai";
import {
  selectedAppIdAtom,
  kanbanTasksAtom,
  sitemapStructureAtom,
  appStructureLoadedAtom,
} from "@/atoms/appAtoms";
import { IpcClient } from "@/ipc/ipc_client";
import { showError } from "@/lib/toast";

const ipcClient = IpcClient.getInstance();

export function useAppStructureSync() {
  const [selectedAppId] = useAtom(selectedAppIdAtom);
  const [kanbanTasks, setKanbanTasks] = useAtom(kanbanTasksAtom);
  const [sitemapStructure, setSitemapStructure] = useAtom(sitemapStructureAtom);
  const [appStructureLoaded, setAppStructureLoaded] = useAtom(
    appStructureLoadedAtom,
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load app structure from files
  const loadAppStructure = useCallback(async (appId: number) => {
    if (!appId) {
      const errorMessage = "No app selected";
      setLoadError(errorMessage);
      setKanbanTasks([]);
      setSitemapStructure([]);
      setAppStructureLoaded(true);
      return;
    }
  
    try {
      setAppStructureLoaded(false);
      setLoadError(null);
  
      const { kanbanTasks: loadedKanbanTasks, sitemap: loadedSitemap } =
        await ipcClient.getAppStructure(appId);
  
      setKanbanTasks(loadedKanbanTasks || []);
      setSitemapStructure(loadedSitemap || []);
      setAppStructureLoaded(true);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load app structure. Please try again.";
      console.error("Failed to load app structure:", error);
      showError(errorMessage);
      setLoadError(errorMessage);
      setKanbanTasks([]);
      setSitemapStructure([]);
      setAppStructureLoaded(true);
    }
  }, [setKanbanTasks, setSitemapStructure, setAppStructureLoaded]);

  const retryLoad = useCallback(async () => {
    if (selectedAppId) {
      await loadAppStructure(selectedAppId);
    }
  }, [selectedAppId, loadAppStructure]);

  // Save kanban tasks to app files
  const saveKanbanTasks = useCallback(
    async (appId: number, tasks: any[]) => {
      if (!appId) {
        showError("Cannot save: no app selected");
        return;
      }
  
      try {
        await ipcClient.saveKanbanTasks(appId, tasks);
        setKanbanTasks(tasks);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to save kanban tasks. Please try again.";
        console.error("Failed to save kanban tasks:", error);
        showError(errorMessage);
      }
    },
    [setKanbanTasks],
  );
  
  // Save sitemap structure to app files
  const saveSitemapStructure = useCallback(
    async (appId: number, structure: any[]) => {
      if (!appId) {
        showError("Cannot save: no app selected");
        return;
      }
  
      try {
        await ipcClient.saveSitemapStructure(appId, structure);
        setSitemapStructure(structure);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to save sitemap structure. Please try again.";
        console.error("Failed to save sitemap structure:", error);
        showError(errorMessage);
      }
    },
    [setSitemapStructure],
  );

  // Update task status (drag and drop)
  const updateTaskStatus = useCallback(
    async (appId: number, taskId: string, newStatus: string) => {
      const updatedTasks = kanbanTasks.map((task: any) =>
        task.id === taskId
          ? { ...task, status: newStatus, updatedAt: new Date().toISOString() }
          : task,
      );
      await saveKanbanTasks(appId, updatedTasks);
    },
    [kanbanTasks, saveKanbanTasks],
  );

  // Add new task
  const addTask = useCallback(
    async (appId: number, task: Omit<any, "id" | "createdAt" | "updatedAt">) => {
      const newTask = {
        ...task,
        id: `task-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updatedTasks = [...kanbanTasks, newTask];
      await saveKanbanTasks(appId, updatedTasks);
      return newTask;
    },
    [kanbanTasks, saveKanbanTasks],
  );

  // Update task
  const updateTask = useCallback(
    async (appId: number, taskId: string, updates: Partial<any>) => {
      const updatedTasks = kanbanTasks.map((task: any) =>
        task.id === taskId
          ? {
              ...task,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : task,
      );
      await saveKanbanTasks(appId, updatedTasks);
    },
    [kanbanTasks, saveKanbanTasks],
  );

  // Delete task
  const deleteTask = useCallback(
    async (appId: number, taskId: string) => {
      const updatedTasks = kanbanTasks.filter((task: any) => task.id !== taskId);
      await saveKanbanTasks(appId, updatedTasks);
    },
    [kanbanTasks, saveKanbanTasks],
  );

  // Add sitemap node
  const addSitemapNode = useCallback(
    async (appId: number, node: Omit<any, "id" | "createdAt" | "updatedAt">) => {
      const newNode = {
        ...node,
        id: `node-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updatedStructure = [...sitemapStructure, newNode];
      await saveSitemapStructure(appId, updatedStructure);
      return newNode;
    },
    [sitemapStructure, saveSitemapStructure],
  );

  // Update sitemap node
  const updateSitemapNode = useCallback(
    async (appId: number, nodeId: string, updates: Partial<any>) => {
      const updateNode = (nodes: any[]): any[] =>
        nodes.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              ...updates,
              updatedAt: new Date().toISOString(),
            };
          }
          if (node.children) {
            return {
              ...node,
              children: updateNode(node.children),
            };
          }
          return node;
        });

      const updatedStructure = updateNode(sitemapStructure);
      await saveSitemapStructure(appId, updatedStructure);
    },
    [sitemapStructure, saveSitemapStructure],
  );

  // Delete sitemap node
  const deleteSitemapNode = useCallback(
    async (appId: number, nodeId: string) => {
      const deleteNode = (nodes: any[]): any[] =>
        nodes
          .filter((node) => node.id !== nodeId)
          .map((node) => {
            if (node.children) {
              return {
                ...node,
                children: deleteNode(node.children),
              };
            }
            return node;
          });

      const updatedStructure = deleteNode(sitemapStructure);
      await saveSitemapStructure(appId, updatedStructure);
    },
    [sitemapStructure, saveSitemapStructure],
  );

  // Load structure when app changes
  useEffect(() => {
    if (selectedAppId) {
      loadAppStructure(selectedAppId);
    } else {
      setKanbanTasks([]);
      setSitemapStructure([]);
      setAppStructureLoaded(false);
      setLoadError(null);
    }
  }, [selectedAppId, loadAppStructure, setKanbanTasks, setSitemapStructure, setAppStructureLoaded]);

  return {
    kanbanTasks,
    sitemapStructure,
    appStructureLoaded,
    loadError,
    loadAppStructure,
    retryLoad,
    saveKanbanTasks,
    saveSitemapStructure,
    updateTaskStatus,
    addTask,
    updateTask,
    deleteTask,
    addSitemapNode,
    updateSitemapNode,
    deleteSitemapNode,
  };
}

// Helper function to generate initial structure from app files
function generateStructureFromFiles(files: string[]): {
  kanbanTasks: any[];
  sitemap: any[];
} {
  const pages = files
    .filter((f) => f.includes("/pages/") || f.includes("/routes/"))
    .map((f) => f.split("/").pop()?.replace(".tsx", "").replace(".ts", ""))
    .filter(Boolean) as string[];

  const components = files
    .filter((f) => f.includes("/components/"))
    .map((f) => f.split("/").pop()?.replace(".tsx", "").replace(".ts", ""))
    .filter(Boolean) as string[];

  const apiRoutes = files
    .filter((f) => f.includes("/api/") || f.includes("/routes/"))
    .map((f) => f.split("/").pop()?.replace(".ts", ""))
    .filter(Boolean) as string[];

  const kanbanTasks = [
    {
      id: `task-${Date.now()}-1`,
      title: "Initialize project structure",
      description: "Set up basic project scaffolding",
      status: "done",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    ...pages.slice(0, 5).map((page, idx) => ({
      id: `task-${Date.now()}-${idx + 2}`,
      title: `Implement ${page} page`,
      description: `Create the ${page} page component`,
      status: "todo" as const,
      filePath: `src/pages/${page}.tsx`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  ];

  const sitemap = [
    {
      id: `node-${Date.now()}-root`,
      name: "Application",
      type: "page",
      children: [
        {
          id: `node-${Date.now()}-pages`,
          name: "Pages",
          type: "page",
          children: pages.slice(0, 10).map((page, idx) => ({
            id: `node-${Date.now()}-page-${idx}`,
            name: page,
            type: "page" as const,
            path: `/${page.toLowerCase()}`,
            filePath: `src/pages/${page}.tsx`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: `node-${Date.now()}-components`,
          name: "Components",
          type: "component",
          children: components.slice(0, 10).map((comp, idx) => ({
            id: `node-${Date.now()}-comp-${idx}`,
            name: comp,
            type: "component" as const,
            filePath: `src/components/${comp}.tsx`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ...(apiRoutes.length > 0
          ? [
              {
                id: `node-${Date.now()}-api`,
                name: "API Routes",
                type: "api" as const,
                children: apiRoutes.slice(0, 10).map((route, idx) => ({
                  id: `node-${Date.now()}-route-${idx}`,
                  name: route,
                  type: "api" as const,
                  path: `/api/${route.toLowerCase()}`,
                  filePath: `src/api/${route}.ts`,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                })),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ]
          : []),
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return { kanbanTasks, sitemap };
}
