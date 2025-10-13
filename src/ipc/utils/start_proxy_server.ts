// startProxy.js – helper to launch proxy.js as a worker

import { Worker } from "worker_threads";
import path from "path";
import { findAvailablePort } from "./port_utils";
import log from "electron-log";
import { getElectron } from "../../paths/paths";
import { addTerminalOutput } from "../handlers/terminal_handlers";

const logger = log.scope("start_proxy_server");

// Helper function to log to both electron-log and console
function logToConsole(message: string, level: "info" | "warn" | "error" | "debug" = "info") {
  logger[level](message);
  console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`);
}

export async function startProxy(
  targetOrigin: string,
  opts: {
    // host?: string;
    // port?: number;
    // env?: Record<string, string>;
    onStarted?: (proxyUrl: string) => void;
    appId?: number; // Add appId to route proxy logs to appropriate terminal
    terminalType?: "frontend" | "backend" | "main"; // Add terminalType to determine routing
    onError?: (error: Error) => void; // Add error callback
  } = {},
) {
  if (!/^https?:\/\//.test(targetOrigin))
    throw new Error("startProxy: targetOrigin must be absolute http/https URL");
  const port = await findAvailablePort(50_000, 60_000);
  logToConsole(`Found available port ${port}`, "info");
  const {
    // host = "localhost",
    // env = {}, // additional env vars to pass to the worker
    onStarted,
    onError,
    appId,
    terminalType,
  } = opts;

  // Get the correct path to the worker file in both development and production
  const electron = getElectron();

  let workerPath: string;

  if (electron && !process.env.NODE_ENV?.includes("development")) {
    // In production/built app, the worker is inside the ASAR archive
    // __dirname will be inside the ASAR, so we need to navigate to the worker directory

    // Try multiple possible locations for the worker
    const possiblePaths = [
      path.resolve(__dirname, "..", "..", "..", "worker", "proxy_server.js"), // Inside ASAR
      path.resolve(process.resourcesPath, "worker", "proxy_server.js"), // In Resources
      path.resolve(process.resourcesPath, "app.asar", "worker", "proxy_server.js"), // Explicit ASAR path
    ];

    let foundPath: string | null = null;
    for (const testPath of possiblePaths) {
      try {
        require.resolve(testPath);
        foundPath = testPath;
        break;
      } catch (e) {
        // Continue to next path
      }
    }

    if (!foundPath) {
      throw new Error(`Could not find proxy_server.js worker file. Tried paths: ${possiblePaths.join(', ')}`);
    }
    workerPath = foundPath;
  } else {
    // In development, use the project root
    workerPath = path.resolve(process.cwd(), "worker", "proxy_server.js");
  }

  logToConsole(`Starting proxy worker from path: ${workerPath}`, "info");
  logToConsole(`Proxy will forward ${targetOrigin} to port ${port}`, "info");

  const worker = new Worker(workerPath, {
    workerData: {
      targetOrigin,
      port,
    },
  });

  worker.on("message", (m) => {
    logToConsole(`[proxy] ${m}`, "info");

    // Route proxy logs to appropriate terminal if appId is provided
    if (appId && typeof m === "string") {
      // Filter out the proxy-server-start message (handled separately)
      if (!m.startsWith("proxy-server-start url=")) {
        // Determine which terminal to route to based on terminalType
        let targetTerminals: ("frontend" | "backend")[] = [];
        
        if (terminalType === "frontend") {
          targetTerminals = ["frontend"];
        } else if (terminalType === "backend") {
          targetTerminals = ["backend"];
        } else if (terminalType === "main") {
          // For main/fullstack mode, route to both terminals
          targetTerminals = ["frontend", "backend"];
        }

        for (const targetTerminal of targetTerminals) {
          addTerminalOutput(appId, targetTerminal, m, "output");
        }
      }
    }

    if (typeof m === "string" && m.startsWith("proxy-server-start url=")) {
      const url = m.substring("proxy-server-start url=".length);
      onStarted?.(url);
    }
  });
  worker.on("error", (e) => {
    logToConsole(`[proxy] error: ${e.message}`, "error");
    // Optionally, you can re-throw or handle the error more gracefully
    throw new Error(`Proxy worker failed: ${e.message}`);
  });
  worker.on("exit", (c) => {
    if (c !== 0) {
      logToConsole(`[proxy] worker stopped with exit code ${c}`, "error");
    } else {
      logToConsole("[proxy] worker exited gracefully", "info");
    }
  });

  return worker; // let the caller keep a handle if desired
}
