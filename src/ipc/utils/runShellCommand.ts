import { spawn } from "child_process";
import log from "electron-log";
import { executeComplexCommand, getShellEnv } from "../handlers/app_handlers";

const logger = log.scope("runShellCommand");

export function runShellCommand(command: string, workingDir?: string): Promise<string | null> {
  logger.log(`Running command: ${command}`);
  return new Promise(async (resolve) => {
    let output = "";
    const cwd = workingDir || process.cwd();

    // Check if the command contains shell operators that require script execution
    const hasShellOperators = /(&&|\|\||source|\||;|\$\(|`.*`)/.test(command);

    let childProcess;
    if (hasShellOperators) {
      logger.debug(`Using executeComplexCommand for complex command: ${command}`);
      childProcess = await executeComplexCommand(command, cwd, getShellEnv());
    } else {
      logger.debug(`Using spawn for simple command: ${command}`);
      childProcess = spawn(command, {
        shell: true,
        stdio: ["ignore", "pipe", "pipe"], // ignore stdin, pipe stdout/stderr
        cwd,
        env: getShellEnv(),
      });
    }

    childProcess.stdout?.on("data", (data) => {
      output += data.toString();
    });

    childProcess.stderr?.on("data", (data) => {
      // Log stderr but don't treat it as a failure unless the exit code is non-zero
      logger.warn(`Stderr from "${command}": ${data.toString().trim()}`);
    });

    childProcess.on("error", (error) => {
      logger.error(`Error executing command "${command}":`, error.message);
      resolve(null); // Command execution failed
    });

    childProcess.on("close", (code) => {
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
  });
}
