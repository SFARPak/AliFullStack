import { spawn } from "child_process";
import log from "electron-log";
import { executeComplexCommand, getShellEnv } from "../handlers/app_handlers";

const logger = log.scope("runShellCommand");

export function runShellCommand(
  command: string,
  workingDir?: string,
): Promise<string | null> {
  logger.log(`Running command: ${command}`);
  return new Promise((resolve) => {
    let output = "";
    const cwd = workingDir || process.cwd();

    // Check if the command contains shell operators that require script execution
    const hasShellOperators = /(&&|\|\||source|\||;|\$\(|`.*`)/.test(command);

    const setupProcessHandlers = (childProcess: any) => {
      childProcess.stdout?.on("data", (data: Buffer) => {
        output += data.toString();
      });

      childProcess.stderr?.on("data", (data: Buffer) => {
        // Log stderr but don't treat it as a failure unless the exit code is non-zero
        logger.warn(`Stderr from "${command}": ${data.toString().trim()}`);
      });

      childProcess.on("error", (error: Error) => {
        logger.error(`Error executing command "${command}":`, error.message);
        resolve(null); // Command execution failed
      });

      childProcess.on("close", (code: number | null) => {
        if (code === 0) {
          logger.debug(
            `Command "${command}" succeeded with code ${code}: ${output.trim()}`,
          );
          resolve(output.trim()); // Command succeeded, return trimmed output
        } else {
          logger.error(`Command "${command}" failed with code ${code}`);
          resolve(null); // Command failed
        }
      });
    };

    let childProcess: any;
    if (hasShellOperators) {
      logger.debug(
        `Using executeComplexCommand for complex command: ${command}`,
      );
      executeComplexCommand(command, cwd, getShellEnv()).then(
        (cp) => {
          childProcess = cp;
          setupProcessHandlers(childProcess);
        },
        (err) => {
          logger.error("Failed to execute complex command:", err);
        },
      );
    } else {
      logger.debug(`Using spawn for simple command: ${command}`);
      childProcess = spawn(command, {
        shell: true,
        stdio: ["ignore", "pipe", "pipe"], // ignore stdin, pipe stdout/stderr
        cwd,
        env: getShellEnv(),
      });
      setupProcessHandlers(childProcess);
    }
  });
}
