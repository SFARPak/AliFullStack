import { useNavigate, useSearch } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { useState, useMemo, useEffect } from "react";
import {
  appsListAtom,
  selectedAppIdAtom,
  kanbanTasksAtom,
  sitemapStructureAtom,
} from "@/atoms/appAtoms";
import { useAppStructureSync } from "@/hooks/useAppStructureSync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Monitor,
  LayoutTemplate,
  Database,
  Server,
  Smartphone,
  FileCode,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

export default function SitemapPage() {
  const search = useSearch({ from: "/sitemap" as const });
  const navigate = useNavigate();
  const appsList = useAtomValue(appsListAtom);
  const setSelectedAppId = useSetAtom(selectedAppIdAtom);
  const setKanbanTasks = useSetAtom(kanbanTasksAtom);
  const setSitemapStructure = useSetAtom(sitemapStructureAtom);

  const appId = search.appId ? Number(search.appId) : null;
  const selectedApp = appId ? appsList.find((app) => app.id === appId) : null;
  
  // Sync the selected app ID from the URL into the shared atom so the
  // useAppStructureSync hook can trigger the structure load.
  useEffect(() => {
    if (appId) {
      setSelectedAppId(appId);
    }
  }, [appId, setSelectedAppId]);

  const {
    sitemapStructure,
    appStructureLoaded,
    loadError,
    retryLoad,
    addSitemapNode,
    updateSitemapNode,
    deleteSitemapNode,
  } = useAppStructureSync();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [newNodeName, setNewNodeName] = useState("");
  const [newNodeType, setNewNodeType] = useState<
    "page" | "component" | "layout" | "api" | "database" | "feature"
  >("page");
  const [newNodePath, setNewNodePath] = useState("");
  const [newNodeFilePath, setNewNodeFilePath] = useState("");
  const [parentNodeId, setParentNodeId] = useState<string | null>(null);

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "page":
        return <Monitor className="h-5 w-5" />;
      case "component":
        return <FileCode className="h-5 w-5" />;
      case "layout":
        return <LayoutTemplate className="h-5 w-5" />;
      case "api":
        return <Server className="h-5 w-5" />;
      case "database":
        return <Database className="h-5 w-5" />;
      case "feature":
        return <Smartphone className="h-5 w-5" />;
      default:
        return <FileCode className="h-5 w-5" />;
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case "page":
        return "bg-blue-500";
      case "component":
        return "bg-indigo-500";
      case "layout":
        return "bg-purple-500";
      case "api":
        return "bg-green-500";
      case "database":
        return "bg-orange-500";
      case "feature":
        return "bg-pink-500";
      default:
        return "bg-gray-500";
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleAddNode = async () => {
    if (!appId || !newNodeName.trim()) {
      toast.error("Please enter a node name");
      return;
    }

    try {
      await addSitemapNode(appId, {
        name: newNodeName,
        type: newNodeType,
        path: newNodePath || undefined,
        filePath: newNodeFilePath || undefined,
        parentId: parentNodeId || undefined,
      });
      setNewNodeName("");
      setNewNodeType("page");
      setNewNodePath("");
      setNewNodeFilePath("");
      setParentNodeId(null);
      setIsAddDialogOpen(false);
      toast.success("Node added successfully");
    } catch (error) {
      toast.error("Failed to add node");
      console.error(error);
    }
  };

  const handleUpdateNode = async (nodeId: string) => {
    if (!appId) return;

    try {
      await updateSitemapNode(appId, nodeId, {
        name: newNodeName,
        type: newNodeType,
        path: newNodePath || undefined,
        filePath: newNodeFilePath || undefined,
      });
      setEditingNode(null);
      setNewNodeName("");
      setNewNodeType("page");
      setNewNodePath("");
      setNewNodeFilePath("");
      toast.success("Node updated successfully");
    } catch (error) {
      toast.error("Failed to update node");
      console.error(error);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!appId) return;
    if (!confirm("Are you sure you want to delete this node and all its children?"))
      return;

    try {
      await deleteSitemapNode(appId, nodeId);
      toast.success("Node deleted successfully");
    } catch (error) {
      toast.error("Failed to delete node");
      console.error(error);
    }
  };

  const startEdit = (node: any) => {
    setEditingNode(node.id);
    setNewNodeName(node.name);
    setNewNodeType(node.type);
    setNewNodePath(node.path || "");
    setNewNodeFilePath(node.filePath || "");
  };

  const cancelEdit = () => {
    setEditingNode(null);
    setNewNodeName("");
    setNewNodeType("page");
    setNewNodePath("");
    setNewNodeFilePath("");
  };

  const renderNode = (node: any, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isEditing = editingNode === node.id;

    return (
      <div key={node.id} className="select-none">
        <div
          className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow group ${
            level > 0 ? "ml-4 sm:ml-6 md:ml-8" : ""
          }`}
        >
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 sm:h-10 sm:w-10 p-0 flex-shrink-0 min-h-[44px] min-w-[44px]"
              onClick={() => toggleNode(node.id)}
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </Button>
          )}
          {!hasChildren && <div className="w-9 sm:w-10 flex-shrink-0" />}

          <div
            className={`${getNodeColor(node.type)} text-white p-2 sm:p-2.5 rounded-lg flex-shrink-0`}
          >
            {getNodeIcon(node.type)}
          </div>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Input
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
            ) : (
              <>
                <h3 className="font-semibold text-sm break-words">{node.name}</h3>
                {node.path && (
                  <p className="text-xs text-gray-500 font-mono truncate">
                    {node.path}
                  </p>
                )}
                {node.filePath && (
                  <p className="text-xs text-blue-500 font-mono break-all">
                    {node.filePath}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex gap-1 sm:gap-2 sm:opacity-0 sm:group-hover:opacity-100 md:opacity-100 md:group-hover:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 sm:h-10 sm:w-10 p-0 min-h-[44px] min-w-[44px]"
            onClick={() => startEdit(node)}
            aria-label="Edit node"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 sm:h-10 sm:w-10 p-0 text-red-500 hover:text-red-700 min-h-[44px] min-w-[44px]"
            onClick={() => handleDeleteNode(node.id)}
            aria-label="Delete node"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1 sm:mt-2 space-y-1 sm:space-y-2">
            {node.children!.map((child: any) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!selectedApp) {
    return (
      <div className="relative min-h-screen p-4 sm:p-6 md:p-8 flex flex-col bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">No App Selected</h2>
            <p className="text-gray-500 mb-6 text-sm sm:text-base">
              Please select an app to view its sitemap
            </p>
            <Button onClick={() => navigate({ to: "/" })}>Go to Home</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen p-4 sm:p-6 md:p-8 flex flex-col bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800">
      <Button
        onClick={() => {
          setSelectedAppId(null);
          setKanbanTasks([]);
          setSitemapStructure([]);
          navigate({ to: "/app-details", search: { appId: appId! } });
        }}
        variant="outline"
        size="sm"
        className="self-start flex items-center gap-1 mb-4 sm:mb-6 md:mb-8"
      >
        <ArrowLeft className="h-3 w-4" />
        <span className="hidden sm:inline">Back to App Details</span>
        <span className="sm:hidden">Back</span>
      </Button>

      <div className="flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 md:mb-8 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
              Visual Sitemap - {selectedApp.name}
            </h1>
            <p className="text-gray-500 mt-1 sm:mt-2 text-sm sm:text-base">
              Complete app architecture and component map
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Node
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Node</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Name</label>
                  <Input
                    value={newNodeName}
                    onChange={(e) => setNewNodeName(e.target.value)}
                    placeholder="Enter node name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Type</label>
                  <Select
                    value={newNodeType}
                    onValueChange={(value: any) => setNewNodeType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="page">Page</SelectItem>
                      <SelectItem value="component">Component</SelectItem>
                      <SelectItem value="layout">Layout</SelectItem>
                      <SelectItem value="api">API Route</SelectItem>
                      <SelectItem value="database">Database</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Path (optional)
                  </label>
                  <Input
                    value={newNodePath}
                    onChange={(e) => setNewNodePath(e.target.value)}
                    placeholder="e.g., /dashboard"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    File Path (optional)
                  </label>
                  <Input
                    value={newNodeFilePath}
                    onChange={(e) => setNewNodeFilePath(e.target.value)}
                    placeholder="e.g., src/pages/dashboard.tsx"
                  />
                </div>
                <Button onClick={handleAddNode} className="w-full">
                  Add Node
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!appStructureLoaded ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading sitemap...</div>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="text-red-500 text-center">
              <p className="font-medium mb-1">Failed to load sitemap</p>
              <p className="text-sm text-gray-500">{loadError}</p>
            </div>
            <Button onClick={retryLoad} variant="outline">
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {sitemapStructure.map((node) => renderNode(node))}
            {sitemapStructure.length === 0 && (
              <div className="text-center text-gray-400 py-8 sm:py-12">
                <p className="mb-4 text-sm sm:text-base">No sitemap structure yet</p>
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Root Node
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Edit Node Dialog */}
        <Dialog open={!!editingNode} onOpenChange={(open) => !open && cancelEdit()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Node</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  placeholder="Enter node name"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select
                  value={newNodeType}
                  onValueChange={(value: any) => setNewNodeType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="page">Page</SelectItem>
                    <SelectItem value="component">Component</SelectItem>
                    <SelectItem value="layout">Layout</SelectItem>
                    <SelectItem value="api">API Route</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Path (optional)
                </label>
                <Input
                  value={newNodePath}
                  onChange={(e) => setNewNodePath(e.target.value)}
                  placeholder="e.g., /dashboard"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  File Path (optional)
                </label>
                <Input
                  value={newNodeFilePath}
                  onChange={(e) => setNewNodeFilePath(e.target.value)}
                  placeholder="e.g., src/pages/dashboard.tsx"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={cancelEdit}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => editingNode && handleUpdateNode(editingNode)}
                  className="flex-1"
                >
                  Update Node
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
