/**
 * proxy.js – zero-dependency worker-based HTTP/WS forwarder
 */

const { parentPort, workerData } = require("worker_threads");

const http = require("http");
const https = require("https");

const { URL } = require("url");
const fs = require("fs");
const path = require("path");

/* ──────────────────────────── worker code ─────────────────────────────── */
const LISTEN_HOST = "0.0.0.0";
const LISTEN_PORT = workerData.port;
let rememberedOrigin = null; // e.g. "http://localhost:5173"

/* ---------- pre-configure rememberedOrigin from workerData ------- */
{
  const fixed = workerData?.targetOrigin;
  if (fixed) {
    try {
      rememberedOrigin = new URL(fixed).origin;
      parentPort?.postMessage(
        `[proxy-worker] fixed upstream: ${rememberedOrigin}`,
      );
    } catch {
      throw new Error(
        `Invalid target origin "${fixed}". Must be absolute http/https URL.`,
      );
    }
  }
}

/* ---------- optional resources for HTML injection ---------------------- */

let stacktraceJsContent = null;
let dyadShimContent = null;
let dyadComponentSelectorClientContent = null;
try {
  const stackTraceLibPath = path.join(
    __dirname,
    "..",
    "node_modules",
    "stacktrace-js",
    "dist",
    "stacktrace.min.js",
  );
  stacktraceJsContent = fs.readFileSync(stackTraceLibPath, "utf-8");
  parentPort?.postMessage("[proxy-worker] stacktrace.js loaded.");
} catch (error) {
  parentPort?.postMessage(
    `[proxy-worker] Failed to read stacktrace.js: ${error.message}`,
  );
}

try {
  const dyadShimPath = path.join(__dirname, "dyad-shim.js");
  dyadShimContent = fs.readFileSync(dyadShimPath, "utf-8");
  parentPort?.postMessage("[proxy-worker] dyad-shim.js loaded.");
} catch (error) {
  parentPort?.postMessage(
    `[proxy-worker] Failed to read dyad-shim.js: ${error.message}`,
  );
}

try {
  const dyadComponentSelectorClientPath = path.join(
    __dirname,
    "dyad-component-selector-client.js",
  );
  dyadComponentSelectorClientContent = fs.readFileSync(
    dyadComponentSelectorClientPath,
    "utf-8",
  );
  parentPort?.postMessage(
    "[proxy-worker] dyad-component-selector-client.js loaded.",
  );
} catch (error) {
  parentPort?.postMessage(
    `[proxy-worker] Failed to read dyad-component-selector-client.js: ${error.message}`,
  );
}

/* ---------------------- helper: need to inject? ------------------------ */
function needsInjection(pathname) {
  return pathname.endsWith("index.html") || pathname === "/";
}

function injectHTML(buf) {
  let txt = buf.toString("utf8");
  // These are strings that were used since the first version of the dyad shim.
  // If the dyad shim is used from legacy apps which came pre-baked with the shim
  // as a vite plugin, then do not inject the shim twice to avoid weird behaviors.
  const legacyAppWithShim =
    txt.includes("window-error") && txt.includes("unhandled-rejection");

  const scripts = [];

  if (!legacyAppWithShim) {
    if (stacktraceJsContent) {
      scripts.push(`<script>${stacktraceJsContent}</script>`);
    } else {
      scripts.push(
        '<script>console.warn("[proxy-worker] stacktrace.js was not injected.");</script>',
      );
    }

    if (dyadShimContent) {
      scripts.push(`<script>${dyadShimContent}</script>`);
    } else {
      scripts.push(
        '<script>console.warn("[proxy-worker] dyad shim was not injected.");</script>',
      );
    }
  }
  if (dyadComponentSelectorClientContent) {
    scripts.push(`<script>${dyadComponentSelectorClientContent}</script>`);
  } else {
    scripts.push(
      '<script>console.warn("[proxy-worker] dyad component selector client was not injected.");</script>',
    );
  }
  const allScripts = scripts.join("\n");

  const headRegex = /<head[^>]*>/i;
  if (headRegex.test(txt)) {
    txt = txt.replace(headRegex, `$&\n${allScripts}`);
  } else {
    txt = allScripts + "\n" + txt;
    parentPort?.postMessage(
      "[proxy-worker] Warning: <head> tag not found – scripts prepended.",
    );
  }
  return Buffer.from(txt, "utf8");
}

/* ---------------- helper: build upstream URL from request -------------- */
function buildTargetURL(clientReq) {
  if (!rememberedOrigin) throw new Error("No upstream configured.");

  // Forward to the remembered origin keeping path & query
  return new URL(clientReq.url, rememberedOrigin);
}

/* ----------------------------------------------------------------------- */
/* 1. Plain HTTP request / response                                        */
/* ----------------------------------------------------------------------- */

const server = http.createServer((clientReq, clientRes) => {
  parentPort?.postMessage(`[proxy] Request: ${clientReq.method} ${clientReq.url}`);

  let responseSent = false; // Track if response has been initiated

  // Handle preflight OPTIONS requests
  if (clientReq.method === 'OPTIONS') {
    clientRes.writeHead(200, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH",
      "access-control-allow-headers": "content-type, authorization, x-requested-with",
      "access-control-max-age": "86400"
    });
    responseSent = true;
    return clientRes.end();
  }

  // Health check endpoint
  if (clientReq.url === '/proxy-health') {
    clientRes.writeHead(200, {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
      "access-control-allow-headers": "*"
    });
    responseSent = true;
    return clientRes.end(JSON.stringify({
      status: "ok",
      upstream: rememberedOrigin,
      timestamp: new Date().toISOString()
    }));
  }

  let target;
  try {
    target = buildTargetURL(clientReq);
    parentPort?.postMessage(`[proxy] Forwarding to: ${target.href}`);
  } catch (err) {
    parentPort?.postMessage(`[proxy] Error building target URL: ${err.message}`);
    if (!responseSent) {
      clientRes.writeHead(400, { "content-type": "text/plain" });
      responseSent = true;
      clientRes.end("Bad request: " + err.message);
    }
    return;
  }

  const isTLS = target.protocol === "https:";
  const lib = isTLS ? https : http;

  /* Copy request headers but rewrite Host / Origin / Referer */
  const headers = { ...clientReq.headers, host: target.host };
  if (headers.origin) headers.origin = target.origin;
  if (headers.referer) {
    try {
      const ref = new URL(headers.referer);
      headers.referer = target.origin + ref.pathname + ref.search;
    } catch {
      delete headers.referer;
    }
  }
  if (needsInjection(target.pathname)) {
    // Request uncompressed content from upstream
    delete headers["accept-encoding"];
  }

  if (headers["if-none-match"] && needsInjection(target.pathname))
    delete headers["if-none-match"];

  const upOpts = {
    protocol: target.protocol,
    hostname: target.hostname,
    port: target.port || (isTLS ? 443 : 80),
    path: target.pathname + target.search,
    method: clientReq.method,
    headers,
  };

  const upReq = lib.request(upOpts, (upRes) => {
    parentPort?.postMessage(`[proxy] Upstream response: ${upRes.statusCode} for ${target.href}`);

    const inject = needsInjection(target.pathname);

    if (!inject) {
      // Add CORS headers to proxied responses
      const headers = { ...upRes.headers };
      headers['access-control-allow-origin'] = '*';
      if (!responseSent) {
        clientRes.writeHead(upRes.statusCode, headers);
        responseSent = true;
        upRes.pipe(clientRes);
      }
      return;
    }

    const chunks = [];
    upRes.on("data", (c) => chunks.push(c));
    upRes.on("end", () => {
      try {
        const merged = Buffer.concat(chunks);
        const patched = injectHTML(merged);

        const hdrs = {
          ...upRes.headers,
          "content-length": Buffer.byteLength(patched),
          "access-control-allow-origin": "*",
        };
        // If we injected content, it's no longer encoded in the original way
        delete hdrs["content-encoding"];
        // Also, remove ETag as content has changed
        delete hdrs["etag"];

        if (!responseSent) {
          clientRes.writeHead(upRes.statusCode, hdrs);
          responseSent = true;
          clientRes.end(patched);
        }
      } catch (e) {
        parentPort?.postMessage(`[proxy] Injection failed: ${e.message}`);
        if (!responseSent) {
          clientRes.writeHead(500, { "content-type": "text/plain" });
          responseSent = true;
          clientRes.end("Injection failed: " + e.message);
        }
      }
    });
  });

  // Add timeout to prevent hanging requests
  let timeoutHandled = false;
  upReq.setTimeout(30000, () => {
    if (timeoutHandled) return; // Prevent multiple timeout handlers
    timeoutHandled = true;
    parentPort?.postMessage(`[proxy] Request timeout for ${target.href}`);
    upReq.destroy();
    // Prevent writing headers if response has already been sent
    if (!responseSent) {
      clientRes.writeHead(504, { "content-type": "text/plain" });
      responseSent = true;
      clientRes.end("Gateway timeout: upstream server took too long to respond");
    }
  });

  clientReq.pipe(upReq);
  upReq.on("error", (e) => {
    parentPort?.postMessage(`[proxy] Upstream error: ${e.message} for ${target?.href || 'unknown'}`);
    // Prevent writing headers if response has already been sent
    if (responseSent) {
      return;
    }
    // Check if this is a connection refused error (server not running on that port)
    if (e.code === 'ECONNREFUSED') {
      clientRes.writeHead(503, {
        "content-type": "text/html",
        "retry-after": "5",
        "access-control-allow-origin": "*"
      });
      responseSent = true;
      clientRes.end(`
        <!DOCTYPE html>
        <html>
        <head><title>App Not Ready</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>🚀 App is starting up...</h1>
          <p>The development server is still starting. Please refresh in a few seconds.</p>
          <p><small>Upstream: ${rememberedOrigin || 'unknown'}</small></p>
          <p><small>Error: ${e.message}</small></p>
          <p><small>Request: ${clientReq.method} ${clientReq.url}</small></p>
          <script>
            // Auto-refresh after 3 seconds
            setTimeout(() => window.location.reload(), 3000);
          </script>
        </body>
        </html>
      `);
    } else {
      clientRes.writeHead(502, {
        "content-type": "text/plain",
        "access-control-allow-origin": "*"
      });
      responseSent = true;
      clientRes.end("Upstream error: " + e.message);
    }
  });
});

/* ----------------------------------------------------------------------- */
/* 2. WebSocket / generic Upgrade tunnelling                               */
/* ----------------------------------------------------------------------- */

server.on("upgrade", (req, socket, _head) => {
  let target;
  try {
    target = buildTargetURL(req);
  } catch (err) {
    socket.write("HTTP/1.1 400 Bad Request\r\n\r\n" + err.message);
    return socket.destroy();
  }

  const isTLS = target.protocol === "https:";
  const headers = { ...req.headers, host: target.host };
  if (headers.origin) headers.origin = target.origin;

  const upReq = (isTLS ? https : http).request({
    protocol: target.protocol,
    hostname: target.hostname,
    port: target.port || (isTLS ? 443 : 80),
    path: target.pathname + target.search,
    method: "GET",
    headers,
  });

  upReq.on("upgrade", (upRes, upSocket, upHead) => {
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
        Object.entries(upRes.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\r\n") +
        "\r\n\r\n",
    );
    if (upHead && upHead.length) socket.write(upHead);

    upSocket.pipe(socket).pipe(upSocket);
  });

  upReq.on("error", (e) => {
    parentPort?.postMessage(`[proxy] WebSocket upgrade error: ${e.message}`);
    socket.destroy();
  });

  // Add timeout to WebSocket upgrade requests
  upReq.setTimeout(10000, () => {
    parentPort?.postMessage(`[proxy] WebSocket upgrade timeout for ${target.href}`);
    upReq.destroy();
    socket.destroy();
  });

  upReq.end();
});

/* ----------------------------------------------------------------------- */

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  parentPort?.postMessage(
    `proxy-server-start url=http://${LISTEN_HOST}:${LISTEN_PORT}`,
  );
  console.log(`[PROXY] Server listening on http://${LISTEN_HOST}:${LISTEN_PORT}, proxying to ${rememberedOrigin}`);
});
