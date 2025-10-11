import React, { useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { todoListAtom } from "@/atoms/todoAtoms";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Plus, CheckSquare, Square, Trash2, Edit2 } from "lucide-react";
import { TodoItem, Subtask } from "@/atoms/todoAtoms";

interface TodoListPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TodoListPanel({ isOpen, onClose }: TodoListPanelProps) {
  const [todos, setTodos] = useAtom(todoListAtom);
  const chatId = useAtomValue(selectedChatIdAtom);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoDescription, setNewTodoDescription] = useState("");
  const [editingTodo, setEditingTodo] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Debug logging
  console.log("TodoListPanel render:", { isOpen, chatId, todosCount: todos.length });

  // Filter todos for current chat
  const currentChatTodos = todos.filter(todo => todo.chatId === chatId);
  console.log("Current chat todos:", currentChatTodos.length);

  const addTodo = () => {
    if (!newTodoTitle.trim() || !chatId) return;

    const newTodo: TodoItem = {
      id: Date.now().toString(),
      title: newTodoTitle,
      description: newTodoDescription,
      status: "pending",
      subtasks: [],
      chatId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setTodos(prev => [...prev, newTodo]);
    setNewTodoTitle("");
    setNewTodoDescription("");
  };

  const updateTodoStatus = (todoId: string, status: TodoItem["status"]) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === todoId ? { ...todo, status, updatedAt: new Date() } : todo
      )
    );
  };

  const deleteTodo = (todoId: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== todoId));
  };

  const startEdit = (todo: TodoItem) => {
    setEditingTodo(todo.id);
    setEditTitle(todo.title);
    setEditDescription(todo.description || "");
  };

  const saveEdit = () => {
    if (!editingTodo) return;
    setTodos(prev =>
      prev.map(todo =>
        todo.id === editingTodo
          ? { ...todo, title: editTitle, description: editDescription, updatedAt: new Date() }
          : todo
      )
    );
    setEditingTodo(null);
  };

  const cancelEdit = () => {
    setEditingTodo(null);
  };

  const addSubtask = (todoId: string, title: string) => {
    if (!title.trim()) return;
    const newSubtask: Subtask = {
      id: Date.now().toString(),
      title,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setTodos(prev =>
      prev.map(todo =>
        todo.id === todoId
          ? { ...todo, subtasks: [...todo.subtasks, newSubtask], updatedAt: new Date() }
          : todo
      )
    );
  };

  const toggleSubtask = (todoId: string, subtaskId: string) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === todoId
          ? {
              ...todo,
              subtasks: todo.subtasks.map(sub =>
                sub.id === subtaskId
                  ? { ...sub, completed: !sub.completed, updatedAt: new Date() }
                  : sub
              ),
              updatedAt: new Date(),
            }
          : todo
      )
    );
  };

  const deleteSubtask = (todoId: string, subtaskId: string) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === todoId
          ? {
              ...todo,
              subtasks: todo.subtasks.filter(sub => sub.id !== subtaskId),
              updatedAt: new Date(),
            }
          : todo
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div className="w-64 sm:w-72 md:w-80 lg:w-96 h-full bg-background border-l border-border flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Todo List</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>

        {/* Add new todo */}
        <div className="space-y-2 mb-4">
          <Input
            placeholder="Todo title..."
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addTodo()}
          />
          <Textarea
            placeholder="Description (optional)..."
            value={newTodoDescription}
            onChange={(e) => setNewTodoDescription(e.target.value)}
            rows={2}
          />
          <Button onClick={addTodo} size="sm" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Todo
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {currentChatTodos.length === 0 ? (
          <p className="text-muted-foreground text-center">No todos yet</p>
        ) : (
          currentChatTodos.map((todo) => (
            <Card key={todo.id} className="p-3">
              <CardHeader className="p-0 pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {editingTodo === todo.id ? (
                      <div className="space-y-2">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && saveEdit()}
                        />
                        <Textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdit}>Save</Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Checkbox
                            checked={todo.status === "completed"}
                            onCheckedChange={(checked) =>
                              updateTodoStatus(todo.id, checked ? "completed" : "pending")
                            }
                          />
                          <span className={todo.status === "completed" ? "line-through text-muted-foreground" : ""}>
                            {todo.title}
                          </span>
                        </CardTitle>
                        {todo.description && (
                          <p className="text-xs text-muted-foreground mt-1">{todo.description}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(todo)}
                      disabled={editingTodo !== null}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteTodo(todo.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0 pt-2">
                {/* Subtasks */}
                <div className="space-y-1 mb-2">
                  {todo.subtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={subtask.completed}
                        onCheckedChange={() => toggleSubtask(todo.id, subtask.id)}
                      />
                      <span className={subtask.completed ? "line-through text-muted-foreground" : ""}>
                        {subtask.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSubtask(todo.id, subtask.id)}
                        className="ml-auto p-1 h-6 w-6"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Add subtask */}
                <AddSubtaskInput onAdd={(title) => addSubtask(todo.id, title)} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function AddSubtaskInput({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState("");

  const handleAdd = () => {
    if (title.trim()) {
      onAdd(title);
      setTitle("");
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        placeholder="Add subtask..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && handleAdd()}
        className="text-xs h-7"
      />
      <Button size="sm" onClick={handleAdd} className="h-7 px-2">
        <Plus className="w-3 h-3" />
      </Button>
    </div>
  );
}