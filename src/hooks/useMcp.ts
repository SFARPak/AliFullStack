import { useState, useEffect, useCallback } from "react";

export type Transport = "stdio" | "http";

export interface McpServer {
  id: number;
  name: string;
  transport: Transport;
  command?: string | null;
  args?: string[] | null;
  url?: string | null;
  enabled: boolean;
  envJson?: Record<string, string> | null;
}

export interface McpTool {
  name: string;
  description?: string;
}

const MCP_SERVERS_KEY = "mcpServers";

export function useMcp() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [toolsByServer, setToolsByServer] = useState<Record<number, McpTool[]>>({});
  const [consentsMap, setConsentsMap] = useState<Record<string, "ask" | "always" | "denied">>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingServer, setIsUpdatingServer] = useState<number | null>(null);

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(MCP_SERVERS_KEY);
    if (stored) {
      try {
        setServers(JSON.parse(stored));
      } catch (e) {
        console.error("Error parsing MCP servers:", e);
      }
    }
  }, []);

  // Save to localStorage
  const saveServers = useCallback((newServers: McpServer[]) => {
    setServers(newServers);
    localStorage.setItem(MCP_SERVERS_KEY, JSON.stringify(newServers));
  }, []);

  const createServer = useCallback(async (server: Omit<McpServer, "id">) => {
    const newServer = {
      ...server,
      id: Date.now(), // Simple ID generation
    };
    const updated = [...servers, newServer];
    saveServers(updated);
    // Simulate discovering tools
    setToolsByServer(prev => ({
      ...prev,
      [newServer.id]: [
        { name: "example_tool", description: "An example MCP tool" }
      ]
    }));
  }, [servers, saveServers]);

  const toggleServerEnabled = useCallback(async (id: number, enabled: boolean) => {
    const updated = servers.map(s => s.id === id ? { ...s, enabled } : s);
    saveServers(updated);
  }, [servers, saveServers]);

  const deleteServer = useCallback(async (id: number) => {
    const updated = servers.filter(s => s.id !== id);
    saveServers(updated);
    setToolsByServer(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, [servers, saveServers]);

  const updateServer = useCallback(async (updates: Partial<McpServer> & { id: number }) => {
    setIsUpdatingServer(updates.id);
    try {
      const updated = servers.map(s => s.id === updates.id ? { ...s, ...updates } : s);
      saveServers(updated);
    } finally {
      setIsUpdatingServer(null);
    }
  }, [servers, saveServers]);

  const setToolConsent = useCallback(async (serverId: number, toolName: string, consent: "ask" | "always" | "denied") => {
    const key = `${serverId}:${toolName}`;
    setConsentsMap(prev => ({ ...prev, [key]: consent }));
    // In a real implementation, this would save to settings
  }, []);

  const testConnection = useCallback(async (server: McpServer) => {
    // Simulate connection test
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    return { success: true, message: "Connected successfully" };
  }, []);

  return {
    servers,
    toolsByServer,
    consentsMap,
    isLoading,
    isUpdatingServer,
    createServer,
    toggleEnabled: toggleServerEnabled,
    deleteServer,
    setToolConsent,
    updateServer,
    testConnection,
    isTestingConnection: isLoading,
    isAddingServer: false,
  };
}