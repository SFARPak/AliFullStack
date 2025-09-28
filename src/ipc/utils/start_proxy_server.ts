// startProxy.js – helper to launch proxy.js as a worker

import { Worker } from "worker_threads";
import path from "path";
import { findAvailablePort } from "./port_utils";
import log from "electron-log";
import { getElectron } from "../../paths/paths";

const logger = log.scope("start_proxy_server");

export async function startProxy(
  targetOrigin: string,
  opts: {
    // host?: string;
    // port?: number;
    // env?: Record<string, string>;
    onStarted?: (proxyUrl: string) => void;
  } = {},
) {
  if (!/^https?:\/\//.test(targetOrigin))
    throw new Error("startProxy: targetOrigin must be absolute http/https URL");
  const port = await findAvailablePort(50_000, 60_000);
  logger.info("Found available port", port);
  const {
    // host = "localhost",
    // env = {}, // additional env vars to pass to the worker
    onStarted,
  } = opts;

  // Get the correct path to the worker file in both development and production
  let workerPath: string;
  const electron = getElectron();

  if (electron && !process.env.NODE_ENV?.includes("development")) {
    // In production/built app, use the app's resource path
    workerPath = path.resolve(__dirname, "..", "..", "..", "worker", "proxy_server.js");
  } else {
    // In development, use the project root
    workerPath = path.resolve(process.cwd(), "worker", "proxy_server.js");
  }

  logger.info(`Starting proxy worker from path: ${workerPath}`);

  const worker = new Worker(workerPath, {
    workerData: {
      targetOrigin,
      port,
    },
  });

  worker.on("message", (m) => {
    logger.info("[proxy]", m);
    if (typeof m === "string" && m.startsWith("proxy-server-start url=")) {
      const url = m.substring("proxy-server-start url=".length);
      onStarted?.(url);
    }
  });
  worker.on("error", (e) => {
    logger.error("[proxy] error:", e);
    // Optionally, you can re-throw or handle the error more gracefully
    throw new Error(`Proxy worker failed: ${e.message}`);
  });
  worker.on("exit", (c) => {
    if (c !== 0) {
      logger.error(`[proxy] worker stopped with exit code ${c}`);
    } else {
      logger.info("[proxy] worker exited gracefully");
    }
  });

  return worker; // let the caller keep a handle if desired
}
