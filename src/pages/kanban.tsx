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
import { Textarea } from "@/components/ui/textarea";
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
import { ArrowLeft, Plus, GripVertical, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";

export default function KanbanPage() {
  const search = useSearch({ from: "/kanban" as const });
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
    kanbanTasks,
    appStructureLoaded,
    loadError,
    retryLoad,
    updateTaskStatus,
    addTask,
    updateTask,
    deleteTask,
  } = useAppStructureSync();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState<"todo" | "in_progress" | "done">("todo");
  const [newTaskFilePath, setNewTaskFilePath] = useState("");

  const columns = useMemo(
    () => [
      { id: "todo", title: "To Do", color: "bg-gray-100 dark:bg-gray-800" },
      {
        id: "in_progress",
        title: "In Progress",
        color: "bg-blue-50 dark:bg-blue-900/20",
      },
      { id: "done", title: "Done", color: "bg-green-50 dark:bg-green-900/20" },
    ],
    [],
  );

  const getTasksByStatus = (status: string) =>
    kanbanTasks.filter((task) => task.status === status);

  const handleAddTask = async () => {
    if (!appId || !newTaskTitle.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    try {
      await addTask(appId, {
        title: newTaskTitle,
        description: newTaskDescription,
        status: newTaskStatus,
        filePath: newTaskFilePath || undefined,
      });
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskStatus("todo");
      setNewTaskFilePath("");
      setIsAddDialogOpen(false);
      toast.success("Task added successfully");
    } catch (error) {
      toast.error("Failed to add task");
      console.error(error);
    }
  };

  const handleUpdateTask = async (taskId: string) => {
    if (!appId) return;

    try {
      await updateTask(appId, taskId, {
        title: newTaskTitle,
        description: newTaskDescription,
        status: newTaskStatus,
        filePath: newTaskFilePath || undefined,
      });
      setEditingTask(null);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskStatus("todo");
      setNewTaskFilePath("");
      toast.success("Task updated successfully");
    } catch (error) {
      toast.error("Failed to update task");
      console.error(error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!appId) return;
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      await deleteTask(appId, taskId);
      toast.success("Task deleted successfully");
    } catch (error) {
      toast.error("Failed to delete task");
      console.error(error);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    if (!appId) return;
    try {
      await updateTaskStatus(appId, taskId, newStatus);
    } catch (error) {
      toast.error("Failed to update task status");
      console.error(error);
    }
  };

  const startEdit = (task: any) => {
    setEditingTask(task.id);
    setNewTaskTitle(task.title);
    setNewTaskDescription(task.description || "");
    setNewTaskStatus(task.status);
    setNewTaskFilePath(task.filePath || "");
  };

  const cancelEdit = () => {
    setEditingTask(null);
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskStatus("todo");
    setNewTaskFilePath("");
  };

  if (!selectedApp) {
    return (
      <div className="relative min-h-screen p-4 sm:p-6 md:p-8 flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">No App Selected</h2>
            <p className="text-gray-500 mb-6 text-sm sm:text-base">
              Please select an app to view its kanban board
            </p>
            <Button onClick={() => navigate({ to: "/" })}>
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative min-h-screen p-4 sm:p-6 md:p-8 flex flex-col bg-gray-50 dark:bg-gray-900">
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
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
            Kanban Board - {selectedApp.name}
          </h1>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Title</label>
                  <Input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Enter task title"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <Textarea
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    placeholder="Enter task description"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Status</label>
                  <Select
                    value={newTaskStatus}
                    onValueChange={(value: "todo" | "in_progress" | "done") =>
                      setNewTaskStatus(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    File Path (optional)
                  </label>
                  <Input
                    value={newTaskFilePath}
                    onChange={(e) => setNewTaskFilePath(e.target.value)}
                    placeholder="e.g., src/pages/home.tsx"
                  />
                </div>
                <Button onClick={handleAddTask} className="w-full">
                  Add Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!appStructureLoaded ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading kanban board...</div>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="text-red-500 text-center">
              <p className="font-medium mb-1">Failed to load kanban board</p>
              <p className="text-sm text-gray-500">{loadError}</p>
            </div>
            <Button onClick={retryLoad} variant="outline">
              Retry
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 h-full min-h-[500px]">
            {columns.map((column) => (
              <div
                key={column.id}
                className={`${column.color} rounded-lg p-3 sm:p-4 shadow flex flex-col min-w-0`}
              >
                <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 text-gray-700 dark:text-gray-200">
                  {column.title} ({getTasksByStatus(column.id).length})
                </h2>
                <div className="flex flex-col gap-2 sm:gap-3 flex-1">
                  {getTasksByStatus(column.id).map((task) => (
                    <div
                      key={task.id}
                      className="bg-white dark:bg-gray-700 p-3 sm:p-4 rounded shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <GripVertical className="h-4 w-4 text-gray-400 mt-0.5 cursor-move flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm break-words">{task.title}</h3>
                            {task.description && (
                              <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                            {task.filePath && (
                              <p className="text-xs text-blue-500 mt-1.5 font-mono break-all">
                                {task.filePath}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 sm:h-10 sm:w-10 p-0 min-h-[44px] min-w-[44px]"
                          onClick={() => startEdit(task)}
                          aria-label="Edit task"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 sm:h-10 sm:w-10 p-0 text-red-500 hover:text-red-700 min-h-[44px] min-w-[44px]"
                          onClick={() => handleDeleteTask(task.id)}
                          aria-label="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        </div>
                      </div>
                      <div className="mt-2 sm:mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                      {column.id !== "todo" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 px-2 sm:px-3 min-h-[36px]"
                          onClick={() =>
                            handleStatusChange(task.id, "todo")
                          }
                        >
                          To Do
                        </Button>
                      )}
                      {column.id !== "in_progress" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 px-2 sm:px-3 min-h-[36px]"
                          onClick={() =>
                            handleStatusChange(task.id, "in_progress")
                          }
                        >
                          In Progress
                        </Button>
                      )}
                      {column.id !== "done" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 px-2 sm:px-3 min-h-[36px]"
                          onClick={() =>
                            handleStatusChange(task.id, "done")
                          }
                        >
                          Done
                        </Button>
                      )}
                      </div>
                    </div>
                  ))}
                  {getTasksByStatus(column.id).length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-6 sm:py-8">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Task Dialog */}
        <Dialog open={!!editingTask} onOpenChange={(open) => !open && cancelEdit()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Title</label>
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Enter task title"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Enter task description"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select
                  value={newTaskStatus}
                  onValueChange={(value: "todo" | "in_progress" | "done") =>
                    setNewTaskStatus(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  File Path (optional)
                </label>
                <Input
                  value={newTaskFilePath}
                  onChange={(e) => setNewTaskFilePath(e.target.value)}
                  placeholder="e.g., src/pages/home.tsx"
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
                  onClick={() => editingTask && handleUpdateTask(editingTask)}
                  className="flex-1"
                >
                  Update Task
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
