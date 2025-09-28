import { safeSend } from "../utils/safe_sender";
import { frontendTerminalOutputAtom, backendTerminalOutputAtom, activeTerminalAtom } from "../../atoms/appAtoms";
import { getDefaultStore } from "jotai";
import { ipcMain } from "electron";
import log from "electron-log";

const logger = log.scope("terminal_handlers");

// Helper function to log to both electron-log and console
function logToConsole(message: string, level: "info" | "warn" | "error" | "debug" = "info") {
  logger[level](message);
  console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`);
}

export function registerTerminalHandlers() {
  // No IPC handlers needed - this module handles terminal output routing
}

// Function to add output to a specific terminal
export function addTerminalOutput(appId: number, terminal: "frontend" | "backend", message: string, type: "command" | "output" | "success" | "error" = "output") {
  const store = getDefaultStore();

  // Format message with timestamp and type indicator
  const timestamp = new Date().toLocaleTimeString();
  let formattedMessage = `[${timestamp}] ${message}`;

  // Add type-specific formatting
  if (type === "command") {
    formattedMessage = `\x1b[36m${formattedMessage}\x1b[0m`; // Cyan for commands
  } else if (type === "success") {
    formattedMessage = `\x1b[32m${formattedMessage}\x1b[0m`; // Green for success
  } else if (type === "error") {
    formattedMessage = `\x1b[31m${formattedMessage}\x1b[0m`; // Red for errors
  }

  // Map our types to AppOutput types
  let appOutputType: "stdout" | "stderr" | "info" | "client-error" | "input-requested";
  switch (type) {
    case "error":
      appOutputType = "stderr";
      break;
    case "success":
    case "command":
      appOutputType = "info";
      break;
    default:
      appOutputType = "stdout";
  }

  const outputItem = {
    message: formattedMessage,
    timestamp: Date.now(),
    type: appOutputType,
    appId
  };

  if (terminal === "frontend") {
    const currentOutput = store.get(frontendTerminalOutputAtom);
    store.set(frontendTerminalOutputAtom, [...currentOutput, outputItem]);

    // Auto-switch to frontend terminal if it's empty
    if (currentOutput.length === 0) {
      store.set(activeTerminalAtom, "frontend");
    }
  } else if (terminal === "backend") {
    const currentOutput = store.get(backendTerminalOutputAtom);
    store.set(backendTerminalOutputAtom, [...currentOutput, outputItem]);

    // Auto-switch to backend terminal if it's empty
    if (currentOutput.length === 0) {
      store.set(activeTerminalAtom, "backend");
    }
  }

  logToConsole(`Added ${type} output to ${terminal} terminal: ${message}`, "info");
}

// Function to add output to appropriate terminal based on terminalType (used by app handlers)
export function routeTerminalOutput(event: Electron.IpcMainInvokeEvent, appId: number, terminalType: "frontend" | "backend" | "main", type: "stdout" | "stderr", message: string) {
  // Route to appropriate terminal - handle "main" type by routing to both frontend and backend terminals
  let targetTerminals: ("frontend" | "backend")[] = [];

  if (terminalType === "frontend") {
    targetTerminals = ["frontend"];
  } else if (terminalType === "backend") {
    targetTerminals = ["backend"];
  } else {
    // For "main" type (fullstack mode), route to both terminals
    targetTerminals = ["frontend", "backend"];
  }

  // Map our types to the terminal output types
  let terminalOutputType: "command" | "output" | "success" | "error" = "output";
  if (type === "stderr") {
    terminalOutputType = "error";
  } else if (type === "stdout") {
    terminalOutputType = "output";
  } else if (type === "client-error") {
    terminalOutputType = "error";
  }

  // Add to all target terminals
  for (const terminal of targetTerminals) {
    addTerminalOutput(appId, terminal, message, terminalOutputType);
  }

  // Enhanced system message routing - ensure important server logs are visible in System Messages
  // For backend server logs (like HTTP requests), make them more prominent in system messages
  let systemMessageType = type;
  let systemMessage = message;

  // For backend server logs, enhance visibility - check for various server log patterns
  if (terminalType === "backend") {
    // Check for HTTP request logs from Flask/Django/FastAPI/Node.js servers
    const isHttpRequestLog = (
      // Flask/Django format: 'INFO:     127.0.0.1:63021 - "OPTIONS /api/newsletters HTTP/1.1" 200 OK'
      /\s-\s".*\sHTTP\/\d+\.\d+"\s\d+/.test(message) ||
      // General HTTP response patterns (fallback)
      (message.includes('HTTP/') && (message.includes('200') || message.includes('201') || message.includes('400') || message.includes('404') || message.includes('500'))) ||
      // Server startup messages
      (message.includes("Running on") || message.includes("Server running") || message.includes("listening on") || message.includes("started") || message.includes("* Running on"))
    );

    if (isHttpRequestLog) {
      systemMessageType = "info"; // Use info type to make server logs stand out
      systemMessage = `[${terminalType.toUpperCase()}] ${message}`;
      console.log(`[System Messages] Detected HTTP request log: ${message}`);
    }
  }

  // Always send to system messages for visibility
  safeSend(event.sender, "app:output", {
    type: systemMessageType,
    message: systemMessage,
    appId,
  });
}