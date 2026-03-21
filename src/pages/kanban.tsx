import { useNavigate, useSearch } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { appsListAtom } from "@/atoms/appAtoms";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function KanbanPage() {
  const search = useSearch({ from: "/kanban" as const });
  const navigate = useNavigate();
  const appsList = useAtomValue(appsListAtom);
  const appId = search.appId ? Number(search.appId) : null;
  const selectedApp = appId ? appsList.find((app) => app.id === appId) : null;

  return (
    <div className="relative min-h-screen p-8 flex flex-col bg-gray-50 dark:bg-gray-900">
      <Button
        onClick={() =>
          navigate({ to: "/app-details", search: { appId: appId! } })
        }
        variant="outline"
        size="sm"
        className="self-start flex items-center gap-1 mb-8"
      >
        <ArrowLeft className="h-3 w-4" />
        Back to App Details
      </Button>

      <div className="flex-1">
        <h1 className="text-3xl font-bold mb-8">
          Kanban Board {selectedApp ? `- ${selectedApp.name}` : ""}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-[500px]">
          {/* To Do Column */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 shadow flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">
              To Do
            </h2>
            <div className="flex flex-col gap-3 flex-1">
              <div className="bg-white dark:bg-gray-700 p-4 rounded shadow-sm border border-gray-200 dark:border-gray-600">
                <h3 className="font-medium text-sm">Setup initial database</h3>
                <p className="text-xs text-gray-500 mt-2">
                  Initialize Prisma schema
                </p>
              </div>
              <div className="bg-white dark:bg-gray-700 p-4 rounded shadow-sm border border-gray-200 dark:border-gray-600">
                <h3 className="font-medium text-sm">Finalize styling</h3>
                <p className="text-xs text-gray-500 mt-2">
                  Match brand guidelines
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="mt-4 w-full text-gray-500 justify-start"
            >
              + Add task
            </Button>
          </div>

          {/* In Progress Column */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 shadow flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">
              In Progress
            </h2>
            <div className="flex flex-col gap-3 flex-1">
              <div className="bg-white dark:bg-gray-700 p-4 rounded shadow-sm border border-gray-200 dark:border-gray-600">
                <h3 className="font-medium text-sm">
                  Frontend layout implementation
                </h3>
                <p className="text-xs text-gray-500 mt-2">
                  Working on standard templates
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="mt-4 w-full text-gray-500 justify-start"
            >
              + Add task
            </Button>
          </div>

          {/* Done Column */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 shadow flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">
              Done
            </h2>
            <div className="flex flex-col gap-3 flex-1">
              <div className="bg-white dark:bg-gray-700 p-4 rounded shadow-sm border border-gray-200 dark:border-gray-600 opacity-70">
                <h3 className="font-medium text-sm line-through text-gray-500">
                  Project Initialized
                </h3>
                <p className="text-xs text-gray-400 mt-2">
                  Basic boilerplate setup
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="mt-4 w-full text-gray-500 justify-start"
            >
              + Add task
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
