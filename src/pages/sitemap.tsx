import { useNavigate, useSearch } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { appsListAtom } from "@/atoms/appAtoms";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  LayoutTemplate,
  Database,
  Server,
  Smartphone,
  Monitor,
} from "lucide-react";

export default function SitemapPage() {
  const search = useSearch({ from: "/sitemap" as const });
  const navigate = useNavigate();
  const appsList = useAtomValue(appsListAtom);
  const appId = search.appId ? Number(search.appId) : null;
  const selectedApp = appId ? appsList.find((app) => app.id === appId) : null;

  return (
    <div className="relative min-h-screen p-8 flex flex-col bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800">
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

      <div className="flex-1 flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-4">
          Visual Sitemap {selectedApp ? `- ${selectedApp.name}` : ""}
        </h1>
        <p className="text-gray-500 mb-12">
          Complete app architecture and component map
        </p>

        <div className="w-full max-w-5xl bg-gray-50 dark:bg-gray-800 p-8 rounded-2xl shadow-inner border border-gray-200 dark:border-gray-700 flex flex-col gap-8 text-center items-center overflow-x-auto relative">
          {/* Main App Block */}
          <div className="bg-blue-600 text-white rounded-xl shadow-lg p-6 w-64 z-10">
            <Monitor className="mx-auto mb-2 h-8 w-8" />
            <h2 className="text-xl font-bold">Main Application</h2>
            <p className="text-xs opacity-80 mt-1">Entry Point</p>
          </div>

          <div className="h-10 w-px bg-gray-400"></div>

          <div className="flex gap-16 relative z-10">
            {/* Frontend Block */}
            <div className="flex flex-col items-center">
              <div className="bg-indigo-500 text-white rounded-xl shadow-lg p-5 w-52 mb-6">
                <LayoutTemplate className="mx-auto mb-2 h-6 w-6" />
                <h3 className="font-semibold">Web Frontend</h3>
                <p className="text-xs opacity-80 mt-1">React App</p>
              </div>
              <div className="h-8 w-px bg-gray-300 dark:bg-gray-600 mb-4"></div>
              <div className="flex flex-col gap-3">
                <div className="bg-white dark:bg-gray-700 text-sm border border-gray-200 shadow p-3 rounded-lg w-40 text-gray-700 dark:text-gray-200">
                  /home
                </div>
                <div className="bg-white dark:bg-gray-700 text-sm border border-gray-200 shadow p-3 rounded-lg w-40 text-gray-700 dark:text-gray-200">
                  /dashboard
                </div>
                <div className="bg-white dark:bg-gray-700 text-sm border border-gray-200 shadow p-3 rounded-lg w-40 text-gray-700 dark:text-gray-200">
                  /settings
                </div>
              </div>
            </div>

            {/* Backend Block */}
            <div className="flex flex-col items-center">
              <div className="bg-green-600 text-white rounded-xl shadow-lg p-5 w-52 mb-6">
                <Server className="mx-auto mb-2 h-6 w-6" />
                <h3 className="font-semibold">Backend API</h3>
                <p className="text-xs opacity-80 mt-1">Node Express</p>
              </div>
              <div className="h-8 w-px bg-gray-300 dark:bg-gray-600 mb-4"></div>
              <div className="flex flex-col items-center">
                <div className="bg-gray-800 text-white shadow p-4 rounded-xl w-48 mb-4 border border-gray-600">
                  <Database className="mx-auto mb-2 h-5 w-5" />
                  <h4 className="font-semibold text-sm">PostgreSQL</h4>
                  <p className="text-xs opacity-70">Supabase/Local</p>
                </div>
              </div>
            </div>

            {/* Mobile Block */}
            <div className="flex flex-col items-center">
              <div className="bg-purple-600 text-white rounded-xl shadow-lg p-5 w-52 mb-6">
                <Smartphone className="mx-auto mb-2 h-6 w-6" />
                <h3 className="font-semibold">Mobile App</h3>
                <p className="text-xs opacity-80 mt-1">Capacitor wrapper</p>
              </div>
              <div className="h-8 w-px bg-gray-300 dark:bg-gray-600 mb-4"></div>
              <div className="flex flex-col gap-3">
                <div className="bg-white dark:bg-gray-700 text-sm border border-gray-200 shadow p-3 rounded-lg w-40 text-gray-700 dark:text-gray-200">
                  iOS Build
                </div>
                <div className="bg-white dark:bg-gray-700 text-sm border border-gray-200 shadow p-3 rounded-lg w-40 text-gray-700 dark:text-gray-200">
                  Android Build
                </div>
              </div>
            </div>

            {/* Connecting line */}
            <div className="absolute top-10 left-24 right-24 h-px bg-gray-400 -z-10 mt-1.5"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
