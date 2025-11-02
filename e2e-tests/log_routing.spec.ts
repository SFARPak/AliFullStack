import { test, expect } from "@playwright/test";
import {
  createApp,
  deleteApp,
  startApp,
  stopApp,
  getAppOutput,
  getTerminalOutput,
  switchTerminal,
  createBackendFile,
  createFrontendFile,
} from "./helpers/test_helper";

test.describe("Log Routing and Visibility", () => {
  const appName = "test-log-routing-app";
  let appId: number;

  test.beforeAll(async ({ page }) => {
    // Create a new app for testing
    appId = await createApp(page, appName, {
      isFullStack: true,
      selectedBackendFramework: "flask",
    });
  });

  test.afterAll(async ({ page }) => {
    // Clean up the app after tests
    await deleteApp(page, appId);
  });

  test("should stream all logs to system terminal and UI terminals in FullStack mode", async ({
    page,
  }) => {
    test.setTimeout(120000); // Increase timeout for app startup

    // Create a backend file that produces stdout and stderr
    await createBackendFile(
      page,
      appId,
      "app.py",
      `
from flask import Flask, jsonify
import sys
import time

app = Flask(__name__)

@app.route('/')
def hello():
    print("Backend stdout: Hello from Flask!")
    sys.stderr.write("Backend stderr: This is an error message.\\n")
    return jsonify({"message": "Backend API is running!"})

if __name__ == '__main__':
    # Simulate a startup error for a moment, then recover
    print("Backend starting...")
    time.sleep(2) # Simulate some startup time
    # This will cause an error if a non-existent module is imported
    # try:
    #     import non_existent_module 
    # except ImportError:
    #     sys.stderr.write("Backend stderr: Failed to import non_existent_module.\\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
`,
    );

    // Create a frontend file that makes a request to the backend
    await createFrontendFile(
      page,
      appId,
      "src/App.tsx",
      `
import React, { useEffect, useState } from 'react';

function App() {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    console.log("Frontend stdout: App started.");
    fetch('http://localhost:5000/')
      .then(res => res.json())
      .then(data => {
        setMessage(data.message);
        console.log("Frontend stdout: Backend message received.");
      })
      .catch(error => {
        console.error("Frontend stderr: Error fetching from backend:", error);
        setMessage('Error: ' + error.message);
      });
  }, []);

  return (
    <div className="App">
      <h1>Todo App</h1>
      <p>{message}</p>
    </div>
  );
}

export default App;
`,
    );

    // Start the app in FullStack mode
    await startApp(page, appId, "main");

    // Wait for some output to appear in the system messages
    await page.waitForSelector(".system-messages-container", {
      state: "visible",
    });
    await page.waitForTimeout(10000); // Give time for logs to accumulate

    // Check if logs appear in the system console (Playwright can't directly access Node.js console,
    // but we can check the UI's system messages which should reflect console logs)
    const systemMessages = await getAppOutput(page, appId);
    expect(systemMessages).toContain("Backend stdout: Hello from Flask!");
    expect(systemMessages).toContain(
      "Backend stderr: This is an error message.",
    );
    expect(systemMessages).toContain("Frontend stdout: App started.");
    expect(systemMessages).toContain(
      "Frontend stdout: Backend message received.",
    );

    // Switch to backend terminal and check logs
    await switchTerminal(page, "backend");
    const backendTerminalOutput = await getTerminalOutput(
      page,
      appId,
      "backend",
    );
    expect(backendTerminalOutput).toContain(
      "Backend stdout: Hello from Flask!",
    );
    expect(backendTerminalOutput).toContain(
      "Backend stderr: This is an error message.",
    );

    // Switch to frontend terminal and check logs
    await switchTerminal(page, "frontend");
    const frontendTerminalOutput = await getTerminalOutput(
      page,
      appId,
      "frontend",
    );
    expect(frontendTerminalOutput).toContain("Frontend stdout: App started.");
    expect(frontendTerminalOutput).toContain(
      "Frontend stdout: Backend message received.",
    );
    expect(frontendTerminalOutput).toContain(
      "Backend stdout: Hello from Flask!",
    ); // Should also see backend logs in frontend for fullstack
    expect(frontendTerminalOutput).toContain(
      "Backend stderr: This is an error message.",
    ); // Should also see backend errors in frontend for fullstack

    await stopApp(page, appId);
  });

  test("should stream logs to system terminal and frontend terminal in Frontend mode", async ({
    page,
  }) => {
    test.setTimeout(60000);

    // Start the app in Frontend mode
    await startApp(page, appId, "frontend");
    await page.waitForTimeout(5000); // Give time for logs

    const systemMessages = await getAppOutput(page, appId);
    expect(systemMessages).toContain("Frontend stdout: App started.");
    expect(systemMessages).not.toContain("Backend stdout:"); // Should not contain backend logs

    await switchTerminal(page, "frontend");
    const frontendTerminalOutput = await getTerminalOutput(
      page,
      appId,
      "frontend",
    );
    expect(frontendTerminalOutput).toContain("Frontend stdout: App started.");
    expect(frontendTerminalOutput).not.toContain("Backend stdout:");

    await stopApp(page, appId);
  });

  test("should stream logs to system terminal and backend terminal in Backend mode", async ({
    page,
  }) => {
    test.setTimeout(60000);

    // Start the app in Backend mode
    await startApp(page, appId, "backend");
    await page.waitForTimeout(5000); // Give time for logs

    const systemMessages = await getAppOutput(page, appId);
    expect(systemMessages).toContain("Backend stdout: Hello from Flask!");
    expect(systemMessages).toContain(
      "Backend stderr: This is an error message.",
    );
    expect(systemMessages).not.toContain("Frontend stdout:"); // Should not contain frontend logs

    await switchTerminal(page, "backend");
    const backendTerminalOutput = await getTerminalOutput(
      page,
      appId,
      "backend",
    );
    expect(backendTerminalOutput).toContain(
      "Backend stdout: Hello from Flask!",
    );
    expect(backendTerminalOutput).toContain(
      "Backend stderr: This is an error message.",
    );
    expect(backendTerminalOutput).not.toContain("Frontend stdout:");

    await stopApp(page, appId);
  });
});
