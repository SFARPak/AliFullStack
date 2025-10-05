import path from "path";
import fs from "fs-extra";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import { app } from "electron";
import { readSettings } from "@/main/settings";
import { getTemplateOrThrow } from "../utils/template_utils";
import log from "electron-log";

const logger = log.scope("createFromTemplate");

/**
 * Create essential files immediately to ensure basic functionality
 */
async function createEssentialFilesImmediately(frontendPath: string): Promise<void> {
  logger.info(`🔧 Creating essential files immediately in ${frontendPath}`);

  // Debug: Confirm function was called
  try {
    const functionDebugContent = `DEBUG: createEssentialFilesImmediately called at ${new Date().toISOString()}\nfrontendPath: ${frontendPath}`;
    await fs.writeFile(path.join(frontendPath, 'DEBUG_FUNCTION_CALLED.txt'), functionDebugContent);
    logger.info(`✅ DEBUG: Function called debug file created`);
  } catch (debugError) {
    logger.error('❌ DEBUG: Failed to create function called debug file:', debugError);
  }

  // Create package.json first (most critical)
  const packageJson = `{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.56.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.3",
    "vite": "^6.3.4"
  }
}`;

  try {
    await fs.writeFile(path.join(frontendPath, 'package.json'), packageJson);
    logger.info(`✅ package.json created successfully`);

    // Debug: Confirm package.json was written
    try {
      const packageDebugContent = `DEBUG: package.json created at ${new Date().toISOString()}`;
      await fs.writeFile(path.join(frontendPath, 'DEBUG_PACKAGE_JSON.txt'), packageDebugContent);
    } catch (debugError) {
      logger.warn('⚠️ Failed to create package.json debug file');
    }
  } catch (error) {
    logger.error(`❌ Failed to create package.json:`, error instanceof Error ? error.message : String(error));
    throw error;
  }

  // Create AI_RULES.md
  const aiRulesContent = `# Tech Stack
- You are building a React application.
- Use TypeScript.
- Use React Router. KEEP the routes in src/App.tsx
- Always put source code in the src folder.
- Put pages into src/pages/
- Put components into src/components/
- The main page (default page) is src/pages/Index.tsx
- UPDATE the main page to include the new components. OTHERWISE, the user can NOT see any components!
- ALWAYS try to use the shadcn/ui library.
- Tailwind CSS: always use Tailwind CSS for styling components. Utilize Tailwind classes extensively for layout, spacing, colors, and other design aspects.

Available packages and libraries:

- The lucide-react package is installed for icons.
- You ALREADY have ALL the shadcn/ui components and their dependencies installed. So you don't need to install them again.
- You have ALL the necessary Radix UI components installed.
- Use prebuilt components from the shadcn/ui library after importing them. Note that these files shouldn't be edited, so make new components if you need to change them.`;
  await fs.writeFile(path.join(frontendPath, 'AI_RULES.md'), aiRulesContent);

  // Create vite.config.ts
  const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`;

  try {
    await fs.writeFile(path.join(frontendPath, 'vite.config.ts'), viteConfig.trim());
    logger.info(`✅ vite.config.ts created successfully`);
  } catch (error) {
    logger.error(`❌ Failed to create vite.config.ts:`, error instanceof Error ? error.message : String(error));
    throw error;
  }

  // Create index.html
  const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AliFullStack App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

  await fs.writeFile(path.join(frontendPath, 'index.html'), indexHtml);

  logger.info(`✅ Essential files created successfully`);
}

/**
 * Copy critical files individually as fallback when bulk copy fails
 */
async function copyCriticalFilesIndividually(scaffoldPath: string, frontendPath: string): Promise<void> {
  logger.info(`📋 Starting individual file copy fallback from ${scaffoldPath} to ${frontendPath}`);

  // First ensure frontend directory structure exists
  await fs.ensureDir(frontendPath);

  const criticalFiles = [
    'AI_RULES.md',
    'package.json',
    'vite.config.ts',
    'tailwind.config.ts',
    'tsconfig.json',
    'tsconfig.app.json',
    'tsconfig.node.json',
    'eslint.config.js',
    'postcss.config.js',
    'components.json',
    'index.html',
    'README.md',
    'vercel.json'
  ];

  // Copy critical files and directories using robust approach
  // Get all files and directories from scaffold
  const scaffoldContents = await fs.readdir(scaffoldPath, { withFileTypes: true });

  // Copy each item individually for better control and error handling
  for (const item of scaffoldContents) {
    const srcPath = path.join(scaffoldPath, item.name);
    const destPath = path.join(frontendPath, item.name);

    // Skip node_modules and .git directories
    if (item.name === 'node_modules' || item.name === '.git') {
      logger.debug(`Skipping ${item.name} directory`);
      continue;
    }

    try {
      if (item.isDirectory()) {
        logger.debug(`Copying directory: ${item.name}`);
        await fs.ensureDir(destPath);
        await fs.copy(srcPath, destPath, {
          overwrite: true,
          recursive: true,
          filter: (src, dest) => {
            // Exclude .git and node_modules from subdirectories too
            const relativePath = path.relative(srcPath, src);
            return !relativePath.includes('.git') && !relativePath.includes('node_modules') && !relativePath.includes('.DS_Store');
          }
        });
        logger.info(`✅ Copied directory ${item.name}`);
      } else {
        logger.debug(`Copying file: ${item.name}`);
        await fs.copy(srcPath, destPath, { overwrite: true });
        logger.info(`✅ Copied file ${item.name}`);
      }
    } catch (itemError) {
      logger.warn(`⚠️ Failed to copy ${item.name}:`, itemError instanceof Error ? itemError.message : String(itemError));
      // Continue with other files
    }
  }

  logger.info(`📋 Individual file copy fallback completed`);
}

/**
 * Create minimal React files as last resort when all copy methods fail
 */
async function createMinimalReactFiles(frontendPath: string): Promise<void> {
  logger.info(`🔧 Creating minimal React files in ${frontendPath}`);

  // Ensure directories exist
  const srcPath = path.join(frontendPath, 'src');
  const pagesPath = path.join(srcPath, 'pages');
  const publicPath = path.join(frontendPath, 'public');

  await fs.ensureDir(srcPath);
  await fs.ensureDir(pagesPath);
  await fs.ensureDir(publicPath);

  // Create AI_RULES.md (defaulting to React for fallback)
  const aiRulesContent = `# Tech Stack
- You are building a React application.
- Use TypeScript.
- Use React Router. KEEP the routes in src/App.tsx
- Always put source code in the src folder.
- Put pages into src/pages/
- Put components into src/components/
- The main page (default page) is src/pages/Index.tsx
- UPDATE the main page to include the new components. OTHERWISE, the user can NOT see any components!
- ALWAYS try to use the shadcn/ui library.
- Tailwind CSS: always use Tailwind CSS for styling components. Utilize Tailwind classes extensively for layout, spacing, colors, and other design aspects.

Available packages and libraries:

- The lucide-react package is installed for icons.
- You ALREADY have ALL the shadcn/ui components and their dependencies installed. So you don't need to install them again.
- You have ALL the necessary Radix UI components installed.
- Use prebuilt components from the shadcn/ui library after importing them. Note that these files shouldn't be edited, so make new components if you need to change them.`;
  try {
    await fs.writeFile(path.join(frontendPath, 'AI_RULES.md'), aiRulesContent);
    logger.info(`✅ AI_RULES.md created successfully`);

    // Debug: Confirm AI_RULES.md was written
    try {
      const aiRulesDebugContent = `DEBUG: AI_RULES.md created at ${new Date().toISOString()}`;
      await fs.writeFile(path.join(frontendPath, 'DEBUG_AI_RULES.txt'), aiRulesDebugContent);
    } catch (debugError) {
      logger.warn('⚠️ Failed to create AI_RULES.md debug file');
    }
  } catch (error) {
    logger.error(`❌ Failed to create AI_RULES.md:`, error instanceof Error ? error.message : String(error));
    throw error;
  }

  // Create package.json
  const packageJson = `{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@tanstack/react-query": "^5.56.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2",
    "typescript": "^5.5.3"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^6.3.4"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}`;
  await fs.writeFile(path.join(frontendPath, 'package.json'), packageJson);

  // Create index.html
  const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AliFullStack App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
  await fs.writeFile(path.join(frontendPath, 'index.html'), indexHtml);

  // Create main.tsx
  const mainTsx = `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)`;
  await fs.writeFile(path.join(srcPath, 'main.tsx'), mainTsx);

  // Create App.tsx
  const appTsx = `import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;`;
  await fs.writeFile(path.join(srcPath, 'App.tsx'), appTsx);

  // Create Index.tsx
  const indexTsx = `const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Your Frontend App</h1>
        <p className="text-xl text-gray-600">
          Start building your amazing project here!
        </p>
      </div>
    </div>
  );
};

export default Index;`;
  await fs.writeFile(path.join(pagesPath, 'Index.tsx'), indexTsx);

  // Create NotFound.tsx
  const notFoundTsx = `const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
        <a href="/" className="text-blue-500 hover:text-blue-700 underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;`;
  await fs.writeFile(path.join(pagesPath, 'NotFound.tsx'), notFoundTsx);

  // Create vite.config.ts
  const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`;
  await fs.writeFile(path.join(frontendPath, 'vite.config.ts'), viteConfig);

  logger.info('✅ Minimal React files created successfully');
}

/**
 * Synchronously verify that scaffold files were copied correctly
 */
function verifyScaffoldCopySync(frontendPath: string, scaffoldPath: string): boolean {
  logger.info(`🔍 Starting synchronous scaffold copy verification for ${frontendPath}`);

  try {
    // Check if frontend directory exists
    if (!fs.existsSync(frontendPath)) {
      logger.error(`❌ Frontend directory not found: ${frontendPath}`);
      return false;
    }

    // Check critical files
    const criticalFiles = [
      'AI_RULES.md',
      'package.json',
      'src',
      'vite.config.ts'
    ];

    let allCriticalFilesPresent = true;
    for (const file of criticalFiles) {
      const filePath = path.join(frontendPath, file);
      const exists = fs.existsSync(filePath);

      if (exists) {
        try {
          const stats = fs.statSync(filePath);
          logger.info(`✅ ${file} exists (${stats.size} bytes)`);

          // For files, ensure they have content
          if (!stats.isDirectory() && stats.size === 0) {
            logger.warn(`⚠️ ${file} is empty`);
          }
        } catch (statError) {
          logger.warn(`⚠️ Could not stat ${file}: ${statError instanceof Error ? statError.message : String(statError)}`);
        }
      } else {
        logger.error(`❌ Critical file missing: ${file}`);
        allCriticalFilesPresent = false;
      }
    }

    // Check src directory structure
    const srcPath = path.join(frontendPath, 'src');
    if (fs.existsSync(srcPath)) {
      const srcContents = fs.readdirSync(srcPath);
      logger.info(`📁 src contents: ${srcContents.join(', ')}`);

      const expectedSrcFiles = ['App.tsx', 'main.tsx'];
      for (const file of expectedSrcFiles) {
        if (!srcContents.includes(file)) {
          logger.error(`❌ Missing src file: ${file}`);
          allCriticalFilesPresent = false;
        } else {
          logger.info(`✅ ${file} found in src`);
        }
      }

      // Check pages directory
      const pagesPath = path.join(srcPath, 'pages');
      if (fs.existsSync(pagesPath)) {
        const pagesContents = fs.readdirSync(pagesPath);
        logger.info(`📁 pages contents: ${pagesContents.join(', ')}`);

        const expectedPages = ['Index.tsx', 'NotFound.tsx'];
        for (const page of expectedPages) {
          if (!pagesContents.includes(page)) {
            logger.error(`❌ Missing page: ${page}`);
            allCriticalFilesPresent = false;
          }
        }
      } else {
        logger.error('❌ pages directory not found');
        allCriticalFilesPresent = false;
      }
    } else {
      logger.error('❌ src directory not found');
      allCriticalFilesPresent = false;
    }

    // Final verification
    if (allCriticalFilesPresent) {
      logger.info('✅ Scaffold copy verification PASSED');
      return true;
    } else {
      logger.error('❌ Scaffold copy verification FAILED');
      return false;
    }

  } catch (error) {
    logger.error('❌ Error during scaffold copy verification:', error);
    return false;
  }
}

export async function createFromTemplate({
  fullAppPath,
  selectedTemplateId,
  selectedBackendFramework,
  isFullStack,
}: {
  fullAppPath: string;
  selectedTemplateId?: string;
  selectedBackendFramework?: string | null;
  isFullStack?: boolean;
}) {
  const templateId = selectedTemplateId || readSettings().selectedTemplateId;
  logger.info(`Creating app with template: ${templateId}, backend: ${selectedBackendFramework}, isFullStack: ${isFullStack}`);

  // Create frontend directory
  const frontendPath = path.join(fullAppPath, "frontend");
  logger.info(`Creating frontend directory: ${frontendPath}`);
  await fs.ensureDir(frontendPath);

  // For full stack, always create both frontend and backend
  // For frontend-only, create frontend and optionally backend
  // For backend-only, create backend
  let backendPath: string | null = null;

  if (isFullStack || selectedBackendFramework) {
    backendPath = path.join(fullAppPath, "backend");
    logger.info(`Creating backend directory: ${backendPath}`);
    await fs.ensureDir(backendPath);
  }

  // Set up selected backend framework if specified
  if ((isFullStack || selectedBackendFramework) && backendPath) {
    logger.info(`Setting up backend framework: ${selectedBackendFramework}`);
    await setupBackendFramework(backendPath, selectedBackendFramework!);
  }

  // For full stack, skip template processing and use scaffold copying directly
  if (isFullStack) {
    if (!selectedBackendFramework) {
      throw new Error("Backend framework must be selected for Full Stack app creation. Please select a backend framework in the Hub first.");
    }
    // Use scaffold copying for frontend (React/Vue) and backend framework setup
    logger.info(`Full stack mode: Using scaffold for frontend and ${selectedBackendFramework} for backend`);

    // Determine which scaffold to use based on templateId
    // Use Electron's app.getAppPath() to get the correct app directory
    const appPath = app.getAppPath();
    let scaffoldPath: string;
    if (templateId === "vue") {
      scaffoldPath = path.join(appPath, "scaffold-vue");
      logger.info(`Setting up Vue scaffold in frontend folder`);
    } else {
      scaffoldPath = path.join(appPath, "scaffold");
      logger.info(`Setting up React scaffold in frontend folder`);
    }

    // EMERGENCY DEBUG: Create a debug file immediately
    try {
      const debugContent = `DEBUG: Full stack scaffold section reached at ${new Date().toISOString()}\nBackend Framework: ${selectedBackendFramework}\nTemplate: ${templateId}\nScaffold Path: ${scaffoldPath}`;
      await fs.writeFile(path.join(frontendPath, 'DEBUG_FULL_STACK.txt'), debugContent);
      logger.info('✅ DEBUG: Full stack debug file created');
    } catch (debugError) {
      logger.error('❌ DEBUG: Failed to create debug file:', debugError);
    }

    logger.info(`Using scaffold path: ${scaffoldPath}`);
    logger.info(`Scaffold exists: ${fs.existsSync(scaffoldPath)}`);
    logger.info(`Frontend path: ${frontendPath}`);
    logger.info(`Frontend directory exists: ${fs.existsSync(frontendPath)}`);

    // Check if scaffold exists
    if (!fs.existsSync(scaffoldPath)) {
      logger.error(`Scaffold directory not found at: ${scaffoldPath}`);
      throw new Error(`Scaffold directory not found at: ${scaffoldPath}`);
    }

    // Verify scaffold contents before copying
    try {
      const scaffoldContents = fs.readdirSync(scaffoldPath);
      logger.info(`Scaffold contents: ${scaffoldContents.join(', ')}`);

      // Check for critical scaffold files
      const criticalFiles = ['AI_RULES.md', 'package.json', 'src'];
      for (const file of criticalFiles) {
        const filePath = path.join(scaffoldPath, file);
        if (!fs.existsSync(filePath)) {
          logger.error(`Critical scaffold file missing: ${file}`);
          throw new Error(`Critical scaffold file missing: ${file}`);
        }
        try {
          const stats = fs.statSync(filePath);
          logger.info(`${file} size: ${stats.size} bytes`);
        } catch (statError) {
          logger.warn(`Could not stat ${file}: ${statError instanceof Error ? statError.message : String(statError)}`);
        }
      }
    } catch (scaffoldError) {
      logger.error(`Error verifying scaffold contents:`, scaffoldError);
      throw scaffoldError;
    }

    const actualScaffoldPath = scaffoldPath;

    // IMMEDIATE FALLBACK: Create essential files right away to ensure they exist
    logger.info(`🔄 Creating essential files immediately as fallback`);

    // Add debug file to confirm we reached this point
    try {
      const immediateDebugContent = `DEBUG: Immediate fallback reached at ${new Date().toISOString()}\nFrontend path: ${frontendPath}`;
      await fs.writeFile(path.join(frontendPath, 'DEBUG_IMMEDIATE_FALLBACK.txt'), immediateDebugContent);
      logger.info(`✅ DEBUG: Immediate fallback debug file created`);
    } catch (debugError) {
      logger.error('❌ DEBUG: Failed to create immediate fallback debug file:', debugError);
    }

    try {
      await createEssentialFilesImmediately(frontendPath);
      logger.info(`✅ Essential files created immediately`);

      // Add debug file to confirm immediate creation worked
      try {
        const successDebugContent = `DEBUG: Immediate file creation successful at ${new Date().toISOString()}`;
        await fs.writeFile(path.join(frontendPath, 'DEBUG_IMMEDIATE_SUCCESS.txt'), successDebugContent);
        logger.info(`✅ DEBUG: Immediate success debug file created`);
      } catch (debugError) {
        logger.error('❌ DEBUG: Failed to create success debug file:', debugError);
      }
    } catch (immediateError) {
      logger.warn(`⚠️ Immediate file creation failed:`, immediateError instanceof Error ? immediateError.message : String(immediateError));

      // Add debug file to show failure
      try {
        const failDebugContent = `DEBUG: Immediate file creation FAILED at ${new Date().toISOString()}\nError: ${immediateError instanceof Error ? immediateError.message : String(immediateError)}`;
        await fs.writeFile(path.join(frontendPath, 'DEBUG_IMMEDIATE_FAILED.txt'), failDebugContent);
        logger.info(`✅ DEBUG: Immediate failure debug file created`);
      } catch (debugError) {
        logger.error('❌ DEBUG: Failed to create failure debug file:', debugError);
      }
    }

    try {
      logger.info(`Starting scaffold copy from ${actualScaffoldPath} to ${frontendPath}`);

      // Use a more robust copying approach - copy entire directory contents
      await fs.ensureDir(frontendPath);

      // Get all files and directories from scaffold
      const scaffoldContents = await fs.readdir(actualScaffoldPath, { withFileTypes: true });

      // Copy each item individually for better control and error handling
      for (const item of scaffoldContents) {
        const srcPath = path.join(actualScaffoldPath, item.name);
        const destPath = path.join(frontendPath, item.name);

        // Skip node_modules and .git directories
        if (item.name === 'node_modules' || item.name === '.git') {
          logger.debug(`Skipping ${item.name} directory`);
          continue;
        }

        try {
          if (item.isDirectory()) {
            logger.debug(`Copying directory: ${item.name}`);
            await fs.copy(srcPath, destPath, {
              overwrite: true,
              recursive: true,
              filter: (src, dest) => {
                // Exclude .git and node_modules from subdirectories too
                const relativePath = path.relative(srcPath, src);
                return !relativePath.includes('.git') && !relativePath.includes('node_modules');
              }
            });
          } else {
            logger.debug(`Copying file: ${item.name}`);
            await fs.copy(srcPath, destPath, { overwrite: true });
          }
        } catch (itemError) {
          logger.warn(`Failed to copy ${item.name}:`, itemError instanceof Error ? itemError.message : String(itemError));
          // Continue with other files
        }
      }

      logger.info(`Successfully completed scaffold copy operation`);

      logger.info(`Successfully completed scaffold copy operation`);

      // Add a small delay to ensure file system operations are complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Comprehensive verification of the copy operation
      logger.info(`Starting comprehensive copy verification...`);

      const verificationResults = {
        frontendDir: false,
        criticalFiles: [] as string[],
        srcStructure: false,
        fileSizes: {} as Record<string, number>
      };

      // 1. Verify frontend directory exists
      verificationResults.frontendDir = fs.existsSync(frontendPath);
      logger.info(`Frontend directory exists: ${verificationResults.frontendDir}`);

      if (!verificationResults.frontendDir) {
        throw new Error(`Frontend directory not created: ${frontendPath}`);
      }

      // 2. Check critical files
      const criticalFiles = [
        'AI_RULES.md',
        'package.json',
        'src',
        'vite.config.ts',
        'tailwind.config.ts'
      ];

      for (const file of criticalFiles) {
        const filePath = path.join(frontendPath, file);
        const exists = fs.existsSync(filePath);

        if (exists) {
          verificationResults.criticalFiles.push(file);
          try {
            const stats = fs.statSync(filePath);
            verificationResults.fileSizes[file] = stats.size;
            logger.info(`${file} exists (${stats.size} bytes)`);
          } catch (statError) {
            logger.warn(`Could not stat ${file}: ${statError instanceof Error ? statError.message : String(statError)}`);
          }
        } else {
          logger.error(`Critical file missing: ${file}`);
        }
      }

      // 3. Verify src structure
      const srcPath = path.join(frontendPath, 'src');
      if (fs.existsSync(srcPath)) {
        const srcContents = fs.readdirSync(srcPath);
        logger.info(`src directory contents: ${srcContents.join(', ')}`);

        const expectedSrcFiles = ['App.tsx', 'main.tsx', 'pages', 'components'];
        const missingSrcFiles = expectedSrcFiles.filter(file => !srcContents.includes(file));

        if (missingSrcFiles.length === 0) {
          verificationResults.srcStructure = true;
          logger.info('✅ src structure verification passed');
        } else {
          logger.error(`Missing src files: ${missingSrcFiles.join(', ')}`);
        }
      } else {
        logger.error('src directory not found');
      }

      // 4. List all files in frontend directory
      try {
        const allFiles = fs.readdirSync(frontendPath);
        logger.info(`All files in frontend directory: ${allFiles.join(', ')}`);
      } catch (listError) {
        logger.error(`Could not list files in frontend directory:`, listError);
      }

      // 5. Check if we have minimum viable files
      const hasMinimumFiles = verificationResults.criticalFiles.length >= 3; // AI_RULES.md, package.json, src
      const hasBasicStructure = verificationResults.srcStructure;

      if (!hasMinimumFiles || !hasBasicStructure) {
        logger.error('Copy verification failed - missing critical files or structure');
        logger.error(`Verification results:`, JSON.stringify(verificationResults, null, 2));
        throw new Error('Scaffold copy verification failed - missing critical files or structure');
      }

      // Run synchronous verification
      const verificationPassed = verifyScaffoldCopySync(frontendPath, actualScaffoldPath);

      if (!verificationPassed) {
        logger.warn('Scaffold copy verification failed, attempting individual file copy fallback');

        // Try to copy critical files individually as fallback
        try {
          await copyCriticalFilesIndividually(actualScaffoldPath, frontendPath);
          logger.info('✅ Fallback individual file copy completed');

          // Verify again after fallback
          const fallbackVerification = verifyScaffoldCopySync(frontendPath, actualScaffoldPath);
          if (!fallbackVerification) {
            throw new Error('Fallback copy verification also failed');
          }
        } catch (fallbackError) {
          logger.error('Fallback copy also failed:', fallbackError);
          throw new Error(`Both primary and fallback copy methods failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
        }
      }

      logger.info('✅ Scaffold copy verification PASSED');
      logger.info(`Successfully copied scaffold from ${actualScaffoldPath} to ${frontendPath}`);

    } catch (copyError) {
      logger.error(`Failed to copy scaffold directory:`, copyError);
      logger.error(`Copy error details:`, JSON.stringify(copyError, null, 2));

      // Try to provide more context about what went wrong
      if (copyError && typeof copyError === 'object' && 'code' in copyError) {
        logger.error(`Error code: ${copyError.code}`);
      }
      if (copyError && typeof copyError === 'object' && 'errno' in copyError) {
        logger.error(`Error number: ${copyError.errno}`);
      }

      // Last resort: try to create basic files manually
      logger.warn('Attempting manual file creation as last resort');
      try {
        await createMinimalReactFiles(frontendPath);
        logger.info('✅ Manual file creation completed');
      } catch (manualError) {
        logger.error('Manual file creation also failed:', manualError instanceof Error ? manualError.message : String(manualError));
      }

      throw new Error(`Failed to copy scaffold: ${copyError instanceof Error ? copyError.message : String(copyError)}`);
    }

    // Install npm dependencies for React scaffold
    try {
      const packageJsonPath = path.join(frontendPath, "package.json");
      logger.info(`Checking for package.json at: ${packageJsonPath}`);
      if (fs.existsSync(packageJsonPath)) {
        logger.info(`Found package.json, installing React scaffold dependencies in ${frontendPath}`);
        await installDependenciesForFramework(frontendPath, "nodejs");
      } else {
        logger.error(`package.json not found at ${packageJsonPath} after copying scaffold`);
        // List files in frontend directory to debug
        try {
          const files = fs.readdirSync(frontendPath);
          logger.info(`Files in frontend directory: ${files.join(', ')}`);
        } catch (listError) {
          logger.error(`Could not list files in frontend directory:`, listError);
        }

        // Create a fallback package.json if the copy failed
        logger.info(`Creating fallback package.json for React scaffold`);
        const fallbackPackageJson = `{
  "name": "vite_react_shadcn_ts",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.9.0",
    "@radix-ui/react-accordion": "^1.2.0",
    "@radix-ui/react-alert-dialog": "^1.1.1",
    "@radix-ui/react-aspect-ratio": "^1.1.0",
    "@radix-ui/react-avatar": "^1.1.0",
    "@radix-ui/react-checkbox": "^1.1.1",
    "@radix-ui/react-collapsible": "^1.1.0",
    "@radix-ui/react-context-menu": "^2.2.1",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.1",
    "@radix-ui/react-hover-card": "^1.1.1",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-menubar": "^1.1.1",
    "@radix-ui/react-navigation-menu": "^1.2.0",
    "@radix-ui/react-popover": "^1.1.1",
    "@radix-ui/react-progress": "^1.1.0",
    "@radix-ui/react-radio-group": "^1.2.0",
    "@radix-ui/react-scroll-area": "^1.1.0",
    "@radix-ui/react-select": "^2.1.1",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slider": "^1.2.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-switch": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-toast": "^1.2.1",
    "@radix-ui/react-toggle": "^1.1.0",
    "@radix-ui/react-toggle-group": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.4",
    "@tanstack/react-query": "^5.56.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.0.0",
    "embla-carousel-react": "^8.3.0",
    "input-otp": "^1.2.4",
    "lucide-react": "^0.462.0",
    "next-themes": "^0.3.0",
    "react": "^18.3.1",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.53.0",
    "react-resizable-panels": "^2.1.3",
    "react-router-dom": "^6.26.2",
    "recharts": "^2.12.7",
    "sonner": "^1.5.0",
    "tailwind-merge": "^2.5.2",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^0.9.3",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@dyad-sh/react-vite-component-tagger": "^0.8.0",
    "@eslint/js": "^9.9.0",
    "@tailwindcss/typography": "^0.5.15",
    "@types/node": "^22.5.5",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react-swc": "^3.9.0",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.9.0",
    "eslint-plugin-react-hooks": "^5.1.0-rc.0",
    "eslint-plugin-react-refresh": "^0.4.9",
    "globals": "^15.9.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.11",
    "typescript": "^5.5.3",
    "typescript-eslint": "^8.0.1",
    "vite": "^6.3.4"
  }
}`;

        try {
          await fs.writeFile(packageJsonPath, fallbackPackageJson);
          logger.info(`Created fallback package.json at ${packageJsonPath}`);

          // Create AI_RULES.md file
          const aiRulesContent = `# Tech Stack
- You are building a React application.
- Use TypeScript.
- Use React Router. KEEP the routes in src/App.tsx
- Always put source code in the src folder.
- Put pages into src/pages/
- Put components into src/components/
- The main page (default page) is src/pages/Index.tsx
- UPDATE the main page to include the new components. OTHERWISE, the user can NOT see any components!
- ALWAYS try to use the shadcn/ui library.
- Tailwind CSS: always use Tailwind CSS for styling components. Utilize Tailwind classes extensively for layout, spacing, colors, and other design aspects.

Available packages and libraries:

- The lucide-react package is installed for icons.
- You ALREADY have ALL the shadcn/ui components and their dependencies installed. So you don't need to install them again.
- You have ALL the necessary Radix UI components installed.
- Use prebuilt components from the shadcn/ui library after importing them. Note that these files shouldn't be edited, so make new components if you need to change them.`;
          await fs.writeFile(path.join(frontendPath, "AI_RULES.md"), aiRulesContent);
          logger.info(`Created AI_RULES.md file`);

          // Create basic React files
          await createBasicReactFiles(frontendPath);

          // Now try to install dependencies
          await installDependenciesForFramework(frontendPath, "nodejs");
        } catch (fallbackError) {
          logger.error(`Failed to create fallback files:`, fallbackError);
        }
      }
    } catch (installError) {
      logger.warn(`Failed to install React scaffold dependencies:`, installError);
      // Continue even if installation fails
    }

    return;
  }

  const template = await getTemplateOrThrow(templateId);
  logger.info(`Template found: ${template.title}, isFrontend: ${template.isFrontend}, githubUrl: ${template.githubUrl}`);

  // For templates without GitHub URL (like "react", "vue", "next"), use scaffold copying
  if (!template.githubUrl) {
    if (templateId === "react" || templateId === "vue" || templateId === "next") {
      logger.info(`Template ${templateId} has no GitHub URL, using scaffold copying`);
      // Use scaffold copying for React/Vue/Next.js templates
      // Use Electron's app.getAppPath() to get the correct app directory
      const appPath = app.getAppPath();
      let scaffoldPath: string;
      if (templateId === "vue") {
        scaffoldPath = path.join(appPath, "scaffold-vue");
      } else if (templateId === "next") {
        scaffoldPath = path.join(appPath, "scaffold-nextjs");
      } else {
        scaffoldPath = path.join(appPath, "scaffold");
      }

      logger.info(`Using scaffold path: ${scaffoldPath}`);
      if (!fs.existsSync(scaffoldPath)) {
        logger.error(`Scaffold directory not found at: ${scaffoldPath}`);
        throw new Error(`Scaffold directory not found at: ${scaffoldPath}`);
      }

      // Copy scaffold to frontend using robust approach
      await fs.ensureDir(frontendPath);

      // Get all files and directories from scaffold
      const scaffoldContents = await fs.readdir(scaffoldPath, { withFileTypes: true });

      // Copy each item individually for better control and error handling
      for (const item of scaffoldContents) {
        const srcPath = path.join(scaffoldPath, item.name);
        const destPath = path.join(frontendPath, item.name);

        // Skip node_modules and .git directories
        if (item.name === 'node_modules' || item.name === '.git') {
          logger.debug(`Skipping ${item.name} directory`);
          continue;
        }

        try {
          if (item.isDirectory()) {
            logger.debug(`Copying directory: ${item.name}`);
            await fs.copy(srcPath, destPath, {
              overwrite: true,
              recursive: true,
              filter: (src, dest) => {
                // Exclude .git and node_modules from subdirectories too
                const relativePath = path.relative(srcPath, src);
                return !relativePath.includes('.git') && !relativePath.includes('node_modules');
              }
            });
          } else {
            logger.debug(`Copying file: ${item.name}`);
            await fs.copy(srcPath, destPath, { overwrite: true });
          }
        } catch (itemError) {
          logger.warn(`Failed to copy ${item.name}:`, itemError instanceof Error ? itemError.message : String(itemError));
          // Continue with other files
        }
      }

      logger.info(`Successfully copied scaffold to ${frontendPath}`);

      // Install frontend dependencies
      try {
        const packageJsonPath = path.join(frontendPath, "package.json");
        if (fs.existsSync(packageJsonPath)) {
          logger.info(`Installing React scaffold dependencies in ${frontendPath}`);
          await installDependenciesForFramework(frontendPath, "nodejs");
        }
      } catch (installError) {
        logger.warn(`Failed to install React scaffold dependencies:`, installError);
      }

      return;
    } else {
      throw new Error(`Template ${templateId} has no GitHub URL`);
    }
  }

  const repoCachePath = await cloneRepo(template.githubUrl);
  logger.info(`Repository cloned to: ${repoCachePath}`);

  if (template.isFrontend) {
    // For frontend templates (like Next.js), put code in frontend folder
    logger.info(`Copying frontend template to frontend folder: ${frontendPath}`);

    // Add debug information for Next.js template issues
    if (templateId === 'next') {
      logger.info(`🔍 DEBUG: Processing Next.js template`);
      logger.info(`🔍 DEBUG: Repo cache path: ${repoCachePath}`);
      logger.info(`🔍 DEBUG: Frontend path: ${frontendPath}`);
      logger.info(`🔍 DEBUG: Repo cache exists: ${fs.existsSync(repoCachePath)}`);

      if (fs.existsSync(repoCachePath)) {
        try {
          const repoContents = fs.readdirSync(repoCachePath).slice(0, 10); // First 10 items
          logger.info(`🔍 DEBUG: Repo cache contents (first 10): ${repoContents.join(', ')}`);
        } catch (listError) {
          logger.error(`🔍 DEBUG: Could not list repo cache contents:`, listError);
        }
      }
    }

    try {
      await copyRepoToApp(repoCachePath, frontendPath);

      // Verify the copy worked
      if (fs.existsSync(frontendPath)) {
        const destContents = fs.readdirSync(frontendPath);
        logger.info(`Frontend template copied successfully, ${destContents.length} items in destination`);

        if (templateId === 'next') {
          logger.info(`🔍 DEBUG: Next.js template copied successfully, contents: ${destContents.join(', ')}`);
        }

        // Check for package.json
        const packageJsonPath = path.join(frontendPath, "package.json");
        if (!fs.existsSync(packageJsonPath)) {
          logger.warn(`WARNING: Frontend template ${template.title} does not have package.json`);
        } else {
          logger.info(`Found package.json in frontend template`);
        }
      } else {
        throw new Error(`Frontend directory ${frontendPath} not found after copy`);
      }
    } catch (copyError) {
      logger.error(`Failed to copy frontend template:`, copyError);

      if (templateId === 'next') {
        logger.error(`🔍 DEBUG: Next.js template copy failed:`, copyError instanceof Error ? copyError.message : String(copyError));
      }

      // As fallback, create basic React files (since this is frontend development)
      logger.warn(`Falling back to basic React scaffold for frontend template ${template.title}`);
      await createBasicReactFiles(frontendPath);
    }

    // Install frontend dependencies
    try {
      const packageJsonPath = path.join(frontendPath, "package.json");
      if (fs.existsSync(packageJsonPath)) {
        logger.info(`Installing frontend template dependencies in ${frontendPath}`);
        await installDependenciesForFramework(frontendPath, "nodejs");
      } else {
        logger.warn(`No package.json found for frontend template ${template.title}, skipping dependency installation`);
      }
    } catch (installError) {
      logger.warn(`Failed to install frontend template dependencies:`, installError);
      // Continue even if installation fails
    }
  } else {
    // For backend/fullstack templates, put code in backend folder
    if (backendPath) {
      logger.info(`Copying backend/fullstack template to backend folder: ${backendPath}`);
      await copyRepoToApp(repoCachePath, backendPath);

      // Install backend dependencies if requirements.txt or package.json exists
      try {
        const requirementsPath = path.join(backendPath, "requirements.txt");
        const packageJsonPath = path.join(backendPath, "package.json");

        if (fs.existsSync(packageJsonPath)) {
          logger.info(`Installing backend Node.js dependencies in ${backendPath}`);
          await installDependenciesForFramework(backendPath, "nodejs");
        } else if (fs.existsSync(requirementsPath)) {
          logger.info(`Installing backend Python dependencies in ${backendPath}`);
          await installDependenciesForFramework(backendPath, "python");
        }
      } catch (installError) {
        logger.warn(`Failed to install backend template dependencies:`, installError);
        // Continue even if installation fails
      }
    } else {
      logger.warn(`Backend template selected but no backend framework chosen. Skipping backend setup.`);
    }
  }
}

async function cloneRepo(repoUrl: string): Promise<string> {
  let orgName: string;
  let repoName: string;

  const url = new URL(repoUrl);
  if (url.protocol !== "https:") {
    throw new Error("Repository URL must use HTTPS.");
  }
  if (url.hostname !== "github.com") {
    throw new Error("Repository URL must be a github.com URL.");
  }

  // Pathname will be like "/org/repo" or "/org/repo.git"
  const pathParts = url.pathname.split("/").filter((part) => part.length > 0);

  if (pathParts.length !== 2) {
    throw new Error(
      "Invalid repository URL format. Expected 'https://github.com/org/repo'",
    );
  }

  orgName = pathParts[0];
  repoName = path.basename(pathParts[1], ".git"); // Remove .git suffix if present

  if (!orgName || !repoName) {
    // This case should ideally be caught by pathParts.length !== 2
    throw new Error(
      "Failed to parse organization or repository name from URL.",
    );
  }
  logger.info(`Parsed org: ${orgName}, repo: ${repoName} from ${repoUrl}`);

  const cachePath = path.join(
    app.getPath("userData"),
    "templates",
    orgName,
    repoName,
  );

  if (fs.existsSync(cachePath)) {
    try {
      logger.info(
        `Repo ${repoName} already exists in cache at ${cachePath}. Checking for updates.`,
      );

      // Construct GitHub API URL
      const apiUrl = `https://api.github.com/repos/${orgName}/${repoName}/commits/HEAD`;
      logger.info(`Fetching remote SHA from ${apiUrl}`);

      let remoteSha: string | undefined;

      const response = await http.request({
        url: apiUrl,
        method: "GET",
        headers: {
          "User-Agent": "Dyad", // GitHub API requires a User-Agent
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (response.statusCode === 200 && response.body) {
        // Convert AsyncIterableIterator<Uint8Array> to string
        const chunks: Uint8Array[] = [];
        for await (const chunk of response.body) {
          chunks.push(chunk);
        }
        const responseBodyStr = Buffer.concat(chunks).toString("utf8");
        const commitData = JSON.parse(responseBodyStr);
        remoteSha = commitData.sha;
        if (!remoteSha) {
          throw new Error("SHA not found in GitHub API response.");
        }
        logger.info(`Successfully fetched remote SHA: ${remoteSha}`);
      } else if (response.statusCode === 401) {
        // GitHub API returns 401 for unauthenticated requests or rate limiting
        logger.warn(`GitHub API authentication failed (401). Skipping update check for ${repoName}.`);
        return cachePath; // Use cached version
      } else if (response.statusCode === 403) {
        // Rate limiting or other access issues
        logger.warn(`GitHub API access denied (403). Skipping update check for ${repoName}.`);
        return cachePath; // Use cached version
      } else if (response.statusCode === 404) {
        // Repository not found
        logger.warn(`GitHub repository not found (404). Skipping update check for ${repoName}.`);
        return cachePath; // Use cached version
      } else {
        logger.warn(`GitHub API request failed with status ${response.statusCode}. Skipping update check for ${repoName}.`);
        return cachePath; // Use cached version as fallback
      }

      const localSha = await git.resolveRef({
        fs,
        dir: cachePath,
        ref: "HEAD",
      });

      if (remoteSha === localSha) {
        logger.info(
          `Local cache for ${repoName} is up to date (SHA: ${localSha}). Skipping clone.`,
        );
        return cachePath;
      } else {
        logger.info(
          `Local cache for ${repoName} (SHA: ${localSha}) is outdated (Remote SHA: ${remoteSha}). Removing and re-cloning.`,
        );
        fs.rmSync(cachePath, { recursive: true, force: true });
        // Proceed to clone
      }
    } catch (err) {
      logger.warn(
        `Error checking for updates or comparing SHAs for ${repoName} at ${cachePath}. Will attempt to re-clone. Error: `,
        err,
      );
      return cachePath;
    }
  }

  fs.ensureDirSync(path.dirname(cachePath));

  logger.info(`Cloning ${repoUrl} to ${cachePath}`);

  // Add special debug for Next.js template
  if (repoUrl.includes('nextjs-template')) {
    logger.info(`🔍 DEBUG: Cloning Next.js template`);
    logger.info(`🔍 DEBUG: Cache path exists before clone: ${fs.existsSync(cachePath)}`);
    logger.info(`🔍 DEBUG: Cache directory exists: ${fs.existsSync(path.dirname(cachePath))}`);
  }

  try {
    await git.clone({
      fs,
      http,
      dir: cachePath,
      url: repoUrl,
      singleBranch: true,
      depth: 1,
    });
    logger.info(`Successfully cloned ${repoUrl} to ${cachePath}`);

    // Debug: Check what was cloned
    if (repoUrl.includes('nextjs-template')) {
      try {
        const clonedContents = fs.readdirSync(cachePath);
        logger.info(`🔍 DEBUG: Next.js template cloned contents: ${clonedContents.join(', ')}`);

        // Check for critical files
        const criticalFiles = ['package.json', 'next.config.js', 'src', 'app'];
        for (const file of criticalFiles) {
          const filePath = path.join(cachePath, file);
          const exists = fs.existsSync(filePath);
          logger.info(`🔍 DEBUG: ${file} exists: ${exists}`);
        }
      } catch (debugError) {
        logger.error(`🔍 DEBUG: Error checking cloned contents:`, debugError);
      }
    }

  } catch (err) {
    logger.error(`Failed to clone ${repoUrl} to ${cachePath}: `, err);

    if (repoUrl.includes('nextjs-template')) {
      logger.error(`🔍 DEBUG: Next.js template cloning failed:`, err instanceof Error ? err.message : String(err));
    }

    throw err; // Re-throw the error after logging
  }
  return cachePath;
}

export async function setupBackendFramework(backendPath: string, framework: string) {
  logger.info(`Setting up ${framework} framework in ${backendPath}`);

  try {
    // Check if scaffold-backend exists for this framework
    // Use Electron's app.getAppPath() to get the correct app directory
    const appPath = app.getAppPath();
    const scaffoldPath = path.join(appPath, "scaffold-backend", framework);

    if (fs.existsSync(scaffoldPath)) {
      logger.info(`Found scaffold for ${framework} at ${scaffoldPath}, copying to ${backendPath}`);

      // Copy the scaffold-backend directory to backendPath
      await fs.copy(scaffoldPath, backendPath, {
        overwrite: true,
        filter: (src, dest) => {
          // Exclude .DS_Store and other unwanted files
          const relativePath = path.relative(scaffoldPath, src);
          const shouldExclude = relativePath === '.DS_Store' || relativePath.includes('.git');
          if (shouldExclude) {
            logger.debug(`Excluding ${src} from copy`);
          }
          return !shouldExclude;
        }
      });

      logger.info(`Successfully copied ${framework} scaffold from ${scaffoldPath} to ${backendPath}`);
    } else {
      logger.warn(`Scaffold not found for ${framework} at ${scaffoldPath}, falling back to programmatic setup`);

      // Fallback to programmatic setup if scaffold doesn't exist
      switch (framework) {
        case 'django':
          await setupDjango(backendPath);
          break;
        case 'fastapi':
          await setupFastAPI(backendPath);
          break;
        case 'flask':
          await setupFlask(backendPath);
          break;
        case 'nodejs':
          await setupNodeJS(backendPath);
          break;
        default:
          logger.warn(`Unknown backend framework: ${framework}`);
      }
    }

    // Install dependencies after setting up the framework
    try {
      logger.info(`Installing dependencies for ${framework} in ${backendPath}`);
      await installDependenciesForFramework(backendPath, framework);
    } catch (installError) {
      logger.warn(`Failed to install dependencies for ${framework}:`, installError);
      // Continue even if installation fails
    }

    // Initialize database for the framework
    try {
      logger.info(`Initializing database for ${framework} in ${backendPath}`);
      await initializeDatabaseForFramework(backendPath, framework);
    } catch (dbError) {
      logger.warn(`Failed to initialize database for ${framework}:`, dbError);
      // Continue even if database initialization fails
    }

    // Auto-start the backend server after dependency installation
    try {
      logger.info(`Auto-starting ${framework} backend server in ${backendPath}`);
      // Note: appId is not available in this context, so terminal output won't be shown
      // This is called during app creation, before the app is fully set up
      await startBackendServer(backendPath, framework);
    } catch (startError) {
      logger.warn(`Failed to auto-start ${framework} backend server:`, startError);
      // Continue even if server start fails - user can start manually
    }
  } catch (error) {
    logger.error(`Error setting up ${framework} framework:`, error);
  }
}
async function setupDjango(backendPath: string) {
  const requirementsPath = path.join(backendPath, 'requirements.txt');
  const managePath = path.join(backendPath, 'manage.py');
  const settingsPath = path.join(backendPath, 'mysite', 'settings.py');
  const urlsPath = path.join(backendPath, 'mysite', 'urls.py');
  const viewsPath = path.join(backendPath, 'mysite', 'views.py');
  const modelsPath = path.join(backendPath, 'mysite', 'models.py');

  // Create requirements.txt
  await fs.writeFile(requirementsPath, 'Django==4.2.7\ndjango-cors-headers==4.3.1\n');

  // Create manage.py
  const manageContent = `#!/usr/bin/env python
import os
import sys

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mysite.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)
`;

  await fs.writeFile(managePath, manageContent);

  // Create directory structure
  await fs.ensureDir(path.join(backendPath, 'mysite'));

  // Create __init__.py files
  await fs.writeFile(path.join(backendPath, 'mysite', '__init__.py'), '');
  await fs.writeFile(path.join(backendPath, 'mysite', 'wsgi.py'), `import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')

application = get_wsgi_application()
`);
  await fs.writeFile(path.join(backendPath, 'mysite', 'asgi.py'), `import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')

application = get_asgi_application()
`);

  // Create settings.py
  const settingsContent = `import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'your-secret-key-here-change-in-production'

DEBUG = True

ALLOWED_HOSTS = ['*']  # Allow all hosts for development

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# CORS settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:32100",
    "http://127.0.0.1:32100",
]
CORS_ALLOW_CREDENTIALS = True

ROOT_URLCONF = 'mysite.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'mysite.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

STATIC_URL = 'static/'
`;
  await fs.writeFile(settingsPath, settingsContent);

  // Create urls.py
  const urlsContent = `from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from . import views

def api_health(request):
    return JsonResponse({"status": "healthy", "database": "SQLite"})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.home, name='home'),
    path('api/health/', api_health, name='api_health'),
    path('api/items/', include('mysite.urls_items')),
]
`;
  await fs.writeFile(urlsPath, urlsContent);

  // Create models.py
  const modelsContent = `from django.db import models

class Item(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-created_at']
`;
  await fs.writeFile(modelsPath, modelsContent);

  // Create views.py
  const viewsContent = `from django.http import JsonResponse
from django.shortcuts import render
from .models import Item

def home(request):
    return JsonResponse({"message": "Welcome to Django API!", "database": "SQLite configured"})

# API Views for items
def get_items(request):
    items = Item.objects.all().values()
    return JsonResponse(list(items), safe=False)

def create_item(request):
    if request.method == 'POST':
        name = request.POST.get('name')
        description = request.POST.get('description', '')
        if name:
            item = Item.objects.create(name=name, description=description)
            return JsonResponse({
                'id': item.id,
                'name': item.name,
                'description': item.description,
                'created_at': item.created_at.isoformat(),
            }, status=201)
        return JsonResponse({'error': 'Name is required'}, status=400)
    return JsonResponse({'error': 'Method not allowed'}, status=405)
`;
  await fs.writeFile(viewsPath, viewsContent);

  // Create separate URLs for items API
  const itemsUrlsPath = path.join(backendPath, 'mysite', 'urls_items.py');
  const itemsUrlsContent = `from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_items, name='get_items'),
    path('create/', views.create_item, name='create_item'),
]`;
  await fs.writeFile(itemsUrlsPath, itemsUrlsContent);

  // Create AI_RULES.md for Django backend development
  const aiRulesContent = `# Tech Stack
- You are building a Django backend application.
- Use Python 3.x.
- Follow Django best practices and conventions.
- Always put source code in the appropriate Django app folders.

## Project Structure
- \`mysite/\`: Main Django project directory
- \`mysite/settings.py\`: Project settings (database, installed apps, middleware, etc.)
- \`mysite/urls.py\`: Main URL configuration
- \`mysite/views.py\`: Basic views (consider moving to separate apps for larger projects)
- \`manage.py\`: Django management commands

## Development Guidelines
- Create Django apps for different features using \`python manage.py startapp <app_name>\`
- Use Django's ORM for database operations
- Implement proper URL routing in urls.py files
- Use Django's built-in authentication system when needed
- Follow REST API conventions for API endpoints
- Use Django REST Framework for complex APIs (add to requirements.txt if needed)

## Database
- Default database is SQLite (db.sqlite3)
- Use migrations for database schema changes: \`python manage.py makemigrations\` and \`python manage.py migrate\`
- Define models in models.py files within each app

## Best Practices
- Use class-based views for complex logic
- Implement proper error handling and logging
- Use Django's forms for data validation
- Implement proper security measures (CSRF protection, authentication, authorization)
- Write comprehensive tests in tests.py files
- Use Django's caching framework for performance optimization`;
  await fs.writeFile(path.join(backendPath, 'AI_RULES.md'), aiRulesContent);
}

async function setupFastAPI(backendPath: string) {
  const requirementsPath = path.join(backendPath, 'requirements.txt');
  const mainPath = path.join(backendPath, 'main.py');
  const modelsPath = path.join(backendPath, 'models.py');
  const databasePath = path.join(backendPath, 'database.py');
  const crudPath = path.join(backendPath, 'crud.py');

  // Create requirements.txt
  await fs.writeFile(requirementsPath, 'fastapi==0.104.1\nuvicorn==0.24.0\nsqlalchemy==2.0.23\nalembic==1.12.1\n');

  // Create database.py
  const databaseContent = `from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
`;
  await fs.writeFile(databasePath, databaseContent);

  // Create models.py
  const modelsContent = `from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from .database import Base

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
`;
  await fs.writeFile(modelsPath, modelsContent);

  // Create crud.py
  const crudContent = `from sqlalchemy.orm import Session
from . import models, schemas

def get_items(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Item).offset(skip).limit(limit).all()

def create_item(db: Session, item: schemas.ItemCreate):
    db_item = models.Item(name=item.name, description=item.description)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item
`;
  await fs.writeFile(crudPath, crudContent);

  // Create schemas.py
  const schemasPath = path.join(backendPath, 'schemas.py');
  const schemasContent = `from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None

class ItemCreate(ItemBase):
    pass

class Item(ItemBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
`;
  await fs.writeFile(schemasPath, schemasContent);

  // Create main.py
  const mainContent = `from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from . import crud, models, schemas
from .database import SessionLocal, engine, get_db
from fastapi.middleware.cors import CORSMiddleware
import os

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="FastAPI with Database", description="A FastAPI app with SQLite database")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:32100", "http://127.0.0.1:32100"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def read_root():
    return {"message": "FastAPI with Database is running!", "database": "SQLite configured"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "database": "SQLite"}

@app.get("/api/items", response_model=list[schemas.Item])
async def read_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    items = crud.get_items(db, skip=skip, limit=limit)
    return items

@app.post("/api/items", response_model=schemas.Item)
async def create_item(item: schemas.ItemCreate, db: Session = Depends(get_db)):
    return crud.create_item(db=db, item=item)
`;
  await fs.writeFile(mainPath, mainContent);

  // Create alembic configuration for migrations
  const alembicIni = path.join(backendPath, 'alembic.ini');
  const alembicContent = `[alembic]
script_location = alembic
sqlalchemy.url = sqlite:///./app.db

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic
qualname =

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
`;
  await fs.writeFile(alembicIni, alembicContent);

  // Create AI_RULES.md for FastAPI backend development
  const aiRulesContent = `# Tech Stack
- You are building a FastAPI backend application.
- Use Python 3.8+.
- Follow FastAPI best practices and async/await patterns.
- Always put source code in appropriate modules and packages.

## Project Structure
- \`main.py\`: Main FastAPI application entry point
- \`requirements.txt\`: Python dependencies
- Consider creating separate modules for:
  - \`models/\`: Pydantic models and data structures
  - \`routers/\`: API route handlers
  - \`services/\`: Business logic
  - \`database/\`: Database connection and operations

## Development Guidelines
- Use Pydantic models for request/response validation
- Implement proper async/await patterns for I/O operations
- Use dependency injection with FastAPI's Depends()
- Implement proper error handling with HTTPException
- Use FastAPI's automatic API documentation (/docs)
- Follow REST API conventions or GraphQL if specified
- Use SQLAlchemy or similar ORM for database operations
- Implement authentication and authorization as needed

## API Design
- Use meaningful HTTP status codes
- Implement proper request/response models
- Add comprehensive API documentation with docstrings
- Use path parameters, query parameters, and request bodies appropriately
- Implement pagination for list endpoints
- Use consistent JSON response formats

## Best Practices
- Use type hints throughout the codebase
- Write comprehensive tests using pytest
- Implement proper logging
- Use environment variables for configuration
- Implement CORS middleware for frontend integration
- Use background tasks for long-running operations
- Implement rate limiting and security measures`;
  await fs.writeFile(path.join(backendPath, 'AI_RULES.md'), aiRulesContent);
}

async function setupFlask(backendPath: string) {
  const requirementsPath = path.join(backendPath, 'requirements.txt');
  const appPath = path.join(backendPath, 'app.py');
  const modelsPath = path.join(backendPath, 'models.py');

  // Create requirements.txt
  await fs.writeFile(requirementsPath, 'Flask==3.0.0\nFlask-SQLAlchemy==3.0.5\nFlask-CORS==4.0.0\n');

  // Create models.py
  const modelsContent = `from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
`;
  await fs.writeFile(modelsPath, modelsContent);

  // Create app.py
  const appContent = `from flask import Flask, request, jsonify
from flask_cors import CORS
from models import db, Item
import os

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
db.init_app(app)

# Create database tables
with app.app_context():
    db.create_all()

@app.route('/')
def hello_world():
    return jsonify({
        "message": "Flask API with Database is running!",
        "database": "SQLite configured"
    })

@app.route('/api/health')
def health():
    return jsonify({
        "status": "healthy",
        "database": "SQLite"
    })

@app.route('/api/items', methods=['GET'])
def get_items():
    items = Item.query.all()
    return jsonify([item.to_dict() for item in items])

@app.route('/api/items', methods=['POST'])
def create_item():
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({"error": "Name is required"}), 400

    new_item = Item(name=data['name'], description=data.get('description', ''))
    db.session.add(new_item)
    db.session.commit()
    return jsonify(new_item.to_dict()), 201

@app.route('/api/items/<int:item_id>', methods=['GET'])
def get_item(item_id):
    item = Item.query.get_or_404(item_id)
    return jsonify(item.to_dict())

@app.route('/api/items/<int:item_id>', methods=['PUT'])
def update_item(item_id):
    item = Item.query.get_or_404(item_id)
    data = request.get_json()

    if 'name' in data:
        item.name = data['name']
    if 'description' in data:
        item.description = data['description']

    db.session.commit()
    return jsonify(item.to_dict())

@app.route('/api/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    item = Item.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Item deleted successfully"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
`;
  await fs.writeFile(appPath, appContent);

  // Create AI_RULES.md for Flask backend development
  const aiRulesContent = `# Tech Stack
- You are building a Flask backend application.
- Use Python 3.x.
- Follow Flask best practices and patterns.
- Always put source code in appropriate modules and packages.

## Project Structure
- \`app.py\`: Main Flask application entry point
- \`requirements.txt\`: Python dependencies
- Consider creating separate modules for larger applications:
  - \`models/\`: Data models and database operations
  - \`routes/\`: API route handlers
  - \`services/\`: Business logic
  - \`templates/\`: Jinja2 HTML templates (if using server-side rendering)
  - \`static/\`: CSS, JavaScript, and other static files

## Development Guidelines
- Use Flask blueprints for larger applications to organize routes
- Implement proper error handling with Flask's error handlers
- Use Flask-WTF for form handling and validation
- Implement proper JSON responses for API endpoints
- Use Flask-SQLAlchemy or similar ORM for database operations
- Configure Flask properly for different environments (development, production)
- Use Flask's application factory pattern for larger apps

## API Design
- Use meaningful HTTP status codes
- Implement proper request/response handling
- Add comprehensive API documentation
- Use Flask-RESTful or similar extensions for complex APIs
- Implement authentication and authorization as needed
- Use consistent JSON response formats

## Best Practices
- Use environment variables for configuration (consider python-dotenv)
- Implement proper logging with Flask's logger
- Write comprehensive tests using pytest or Flask's testing client
- Use Flask's before_request and after_request decorators for middleware-like functionality
- Implement CORS handling for frontend integration
- Use Flask's session management for user sessions
- Implement security measures (input validation, XSS protection, CSRF protection)`;
  await fs.writeFile(path.join(backendPath, 'AI_RULES.md'), aiRulesContent);
}

async function setupNodeJS(backendPath: string) {
  const packagePath = path.join(backendPath, 'package.json');
  const serverPath = path.join(backendPath, 'server.js');
  const dbPath = path.join(backendPath, 'db.js');
  const modelsPath = path.join(backendPath, 'models.js');
  const routesPath = path.join(backendPath, 'routes.js');

  // Create package.json
  const packageContent = `{
  "name": "backend-api",
  "version": "1.0.0",
  "description": "Node.js backend API with SQLite database",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "better-sqlite3": "^9.4.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}`;
  await fs.writeFile(packagePath, packageContent);

  // Create db.js
  const dbContent = `const Database = require('better-sqlite3');
const path = require('path');

// Create database file in the backend directory
const dbPath = path.join(__dirname, 'app.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create items table
const createTable = db.prepare(\`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
\`);
createTable.run();

// Prepare statements for CRUD operations
const statements = {
  getAllItems: db.prepare('SELECT * FROM items ORDER BY created_at DESC'),
  getItemById: db.prepare('SELECT * FROM items WHERE id = ?'),
  createItem: db.prepare('INSERT INTO items (name, description) VALUES (?, ?)'),
  updateItem: db.prepare('UPDATE items SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
  deleteItem: db.prepare('DELETE FROM items WHERE id = ?')
};

module.exports = {
  db,
  statements
};
`;
  await fs.writeFile(dbPath, dbContent);

  // Create models.js
  const modelsContent = `const { statements } = require('./db');

class Item {
  static getAll() {
    const rows = statements.getAllItems.all();
    return rows.map(row => new Item(row));
  }

  static getById(id) {
    const row = statements.getItemById.get(id);
    return row ? new Item(row) : null;
  }

  static create(name, description = '') {
    const result = statements.createItem.run(name, description);
    return new Item({
      id: result.lastInsertRowid,
      name,
      description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  static update(id, name, description = '') {
    const result = statements.updateItem.run(name, description, id);
    if (result.changes > 0) {
      return Item.getById(id);
    }
    return null;
  }

  static delete(id) {
    const result = statements.deleteItem.run(id);
    return result.changes > 0;
  }

  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = { Item };
`;
  await fs.writeFile(modelsPath, modelsContent);

  // Create routes.js
  const routesContent = `const express = require('express');
const { Item } = require('./models');

const router = express.Router();

// GET /api/items - Get all items
router.get('/items', (req, res) => {
  try {
    const items = Item.getAll();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// GET /api/items/:id - Get item by ID
router.get('/items/:id', (req, res) => {
  try {
    const item = Item.getById(parseInt(req.params.id));
    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ error: 'Item not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// POST /api/items - Create new item
router.post('/items', (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const item = Item.create(name, description || '');
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// PUT /api/items/:id - Update item
router.put('/items/:id', (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const item = Item.update(parseInt(req.params.id), name, description || '');
    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ error: 'Item not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE /api/items/:id - Delete item
router.delete('/items/:id', (req, res) => {
  try {
    const deleted = Item.delete(parseInt(req.params.id));
    if (deleted) {
      res.json({ message: 'Item deleted successfully' });
    } else {
      res.status(404).json({ error: 'Item not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;
`;
  await fs.writeFile(routesPath, routesContent);

  // Create server.js
  const serverContent = `const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:32100', 'http://127.0.0.1:32100'],
  credentials: true
}));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Node.js API with SQLite Database is running!',
    database: 'SQLite configured',
    endpoints: {
      health: '/api/health',
      items: '/api/items'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: 'SQLite',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(\`🚀 Node.js server with SQLite database running on http://0.0.0.0:\${port}\`);
  console.log(\`📊 Database file: \${path.join(__dirname, 'app.db')}\`);
});`;
  await fs.writeFile(serverPath, serverContent);

  // Create AI_RULES.md for Node.js backend development
  const aiRulesContent = `# Tech Stack
- You are building a Node.js backend application.
- Use modern JavaScript (ES6+) or TypeScript.
- Follow Node.js best practices and Express.js patterns.
- Always put source code in appropriate modules and directories.

## Project Structure
- \`server.js\`: Main Express application entry point
- \`package.json\`: Node.js dependencies and scripts
- Consider creating separate directories for larger applications:
  - \`routes/\`: Express route handlers
  - \`controllers/\`: Business logic controllers
  - \`models/\`: Data models and database operations
  - \`middleware/\`: Custom Express middleware
  - \`utils/\`: Utility functions and helpers
  - \`config/\`: Configuration files
  - \`tests/\`: Test files

## Development Guidelines
- Use Express.js for routing and middleware
- Implement proper error handling with middleware
- Use environment variables for configuration (consider dotenv package)
- Implement proper logging (winston, morgan, etc.)
- Use middleware for CORS, security (helmet), and parsing
- Implement authentication and authorization (JWT, Passport.js, etc.)
- Use proper HTTP status codes and JSON responses
- Implement input validation and sanitization

## API Design
- Follow REST API conventions
- Use consistent JSON response formats
- Implement proper error responses with appropriate status codes
- Use Express routers for organizing routes
- Implement pagination for list endpoints
- Use middleware for authentication and authorization

## Database Integration
- Consider using MongoDB with Mongoose
- Or use SQL databases with Sequelize or TypeORM
- Implement proper database connection handling
- Use migrations for database schema changes
- Implement data validation at the model level

## Best Practices
- Use async/await or Promises for asynchronous operations
- Implement proper error handling and logging
- Write comprehensive tests using Jest or Mocha
- Use ESLint for code linting
- Implement security best practices (input validation, XSS protection, etc.)
- Use environment-specific configurations
- Implement rate limiting and other security measures
- Use clustering or PM2 for production deployment`;
  await fs.writeFile(path.join(backendPath, 'AI_RULES.md'), aiRulesContent);
}

async function copyRepoToApp(repoCachePath: string, appPath: string) {
  logger.info(`Copying from ${repoCachePath} to ${appPath}`);
  try {
    // First ensure destination directory exists
    await fs.ensureDir(appPath);

    // Get all files and directories from repository cache
    const repoContents = await fs.readdir(repoCachePath, { withFileTypes: true });

    logger.info(`Found ${repoContents.length} items in repository cache`);

    // Copy each item individually for better control and error handling
    for (const item of repoContents) {
      const srcPath = path.join(repoCachePath, item.name);
      const destPath = path.join(appPath, item.name);

      // Skip node_modules and .git directories
      if (item.name === 'node_modules' || item.name === '.git') {
        logger.debug(`Skipping ${item.name} directory`);
        continue;
      }

      try {
        if (item.isDirectory()) {
          logger.debug(`Copying directory: ${item.name}`);
          await fs.copy(srcPath, destPath, {
            overwrite: true,
            recursive: true,
            filter: (src, dest) => {
              // Exclude .git and node_modules from subdirectories too
              const relativePath = path.relative(srcPath, src);
              return !relativePath.includes('.git') && !relativePath.includes('node_modules') && !relativePath.includes('.DS_Store');
            }
          });
          logger.info(`✅ Copied directory ${item.name}`);
        } else {
          logger.debug(`Copying file: ${item.name}`);
          await fs.copy(srcPath, destPath, { overwrite: true });
          logger.info(`✅ Copied file ${item.name}`);
        }
      } catch (itemError) {
        logger.warn(`⚠️ Failed to copy ${item.name}:`, itemError instanceof Error ? itemError.message : String(itemError));
        // Continue with other files - don't fail the entire operation
      }
    }

    logger.info(`✅ Finished copying repository contents from ${repoCachePath} to ${appPath}`);

    // Verify the copy worked
    try {
      const copiedContents = fs.readdirSync(appPath);
      logger.info(`✅ Verification: ${copiedContents.length} items copied successfully`);
    } catch (verifyError) {
      logger.warn(`⚠️ Could not verify copied contents:`, verifyError instanceof Error ? verifyError.message : String(verifyError));
    }

  } catch (err) {
    logger.error(
      `Error copying repository from ${repoCachePath} to ${appPath}: `,
      err,
    );
    throw err; // Re-throw the error after logging
  }
}

async function installDependenciesForFramework(projectPath: string, framework: string) {
  const installCommand = getInstallCommandForFramework(framework);

  return new Promise<void>((resolve, reject) => {
    const { spawn } = require('child_process');
    const installProcess = spawn(installCommand, [], {
      cwd: projectPath,
      shell: true,
      stdio: "pipe",
    });

    logger.info(`Running install command: ${installCommand} in ${projectPath}`);

    let installOutput = "";
    let installError = "";

    installProcess.stdout?.on("data", (data: Buffer) => {
      installOutput += data.toString();
    });

    installProcess.stderr?.on("data", (data: Buffer) => {
      installError += data.toString();
    });

    installProcess.on("close", (code: number | null) => {
      if (code === 0) {
        logger.info(`Successfully installed dependencies for ${framework}`);
        resolve();
      } else {
        logger.warn(`Dependency installation failed for ${framework} (code: ${code}): ${installError}`);
        // Don't reject here - we want to continue even if installation fails
        // as the framework files are still created and user can install manually
        resolve();
      }
    });

    installProcess.on("error", (err: Error) => {
      logger.error(`Failed to start dependency installation for ${framework}:`, err);
      // Don't reject here for the same reason as above
      resolve();
    });
  });
}

export async function startBackendServer(projectPath: string, framework: string, appId?: number) {
  const startCommand = getStartCommandForFramework(framework);

  return new Promise<void>((resolve, reject) => {
    const { spawn } = require('child_process');
    const serverProcess = spawn(startCommand, [], {
      cwd: projectPath,
      shell: true,
      stdio: "pipe",
      detached: true, // Allow the process to run independently
    });

    logger.info(`Starting ${framework} server with command: ${startCommand} in ${projectPath}`);

    let serverOutput = "";
    let serverError = "";

    serverProcess.stdout?.on("data", (data: Buffer) => {
      serverOutput += data.toString();
      logger.info(`[${framework} server] ${data.toString().trim()}`);
    });

    serverProcess.stderr?.on("data", (data: Buffer) => {
      serverError += data.toString();
      logger.info(`[${framework} server] ${data.toString().trim()}`);
    });

    serverProcess.on("close", (code: number | null) => {
      if (code === 0) {
        logger.info(`Successfully started ${framework} server`);
        resolve();
      } else {
        logger.warn(`${framework} server exited with code: ${code}. Error: ${serverError}`);
        // Don't reject here - server might have started successfully and exited normally
        resolve();
      }
    });

    serverProcess.on("error", (err: Error) => {
      logger.error(`Failed to start ${framework} server:`, err);
      // Don't reject here - user can start server manually
      resolve();
    });

    // Give the server a moment to start up, then unref to let it run in background
    setTimeout(() => {
      serverProcess.unref();
      logger.info(`${framework} server started in background`);

      // If appId is provided, add startup message to backend terminal
      if (appId) {
        const { addTerminalOutput } = require('../handlers/terminal_handlers');
        addTerminalOutput(appId, "backend", `🚀 Starting ${framework} server...`, "command");

        // Add server output to terminal if any
        if (serverOutput.trim()) {
          addTerminalOutput(appId, "backend", serverOutput.trim(), "output");
        }

        addTerminalOutput(appId, "backend", `✅ ${framework} server started successfully (${startCommand})`, "success");
      }

      resolve();
    }, 2000);
  });
}

function getInstallCommandForFramework(framework: string): string {
  switch (framework) {
    case "nodejs":
      return "npm install";
    case "python":
    case "django":
    case "fastapi":
    case "flask":
      return "pip install -r requirements.txt";
    default:
      logger.warn(`Unknown framework for dependency installation: ${framework}`);
      return "";
  }
}

export async function startFrontendServer(projectPath: string, appId?: number) {
  const startCommand = "npm run dev";

  return new Promise<void>((resolve, reject) => {
    const { spawn } = require('child_process');
    const serverProcess = spawn(startCommand, [], {
      cwd: projectPath,
      shell: true,
      stdio: "pipe",
      detached: true, // Allow the process to run independently
    });

    logger.info(`Starting frontend server with command: ${startCommand} in ${projectPath}`);

    let serverOutput = "";
    let serverError = "";

    serverProcess.stdout?.on("data", (data: Buffer) => {
      serverOutput += data.toString();
      logger.info(`[frontend server] ${data.toString().trim()}`);
    });

    serverProcess.stderr?.on("data", (data: Buffer) => {
      serverError += data.toString();
      logger.info(`[frontend server] ${data.toString().trim()}`);
    });

    serverProcess.on("close", (code: number | null) => {
      if (code === 0) {
        logger.info("Successfully started frontend server");
        resolve();
      } else {
        logger.warn(`Frontend server exited with code: ${code}. Error: ${serverError}`);
        // Don't reject here - server might have started successfully and exited normally
        resolve();
      }
    });

    serverProcess.on("error", (err: Error) => {
      logger.error("Failed to start frontend server:", err);
      // Don't reject here - user can start server manually
      resolve();
    });

    // Give the server a moment to start up, then unref to let it run in background
    setTimeout(() => {
      serverProcess.unref();
      logger.info("Frontend server started in background");

      // If appId is provided, add startup message to frontend terminal
      if (appId) {
        const { addTerminalOutput } = require('../handlers/terminal_handlers');
        addTerminalOutput(appId, "frontend", `🚀 Starting frontend development server...`, "command");

        // Add server output to terminal if any
        if (serverOutput.trim()) {
          addTerminalOutput(appId, "frontend", serverOutput.trim(), "output");
        }

        addTerminalOutput(appId, "frontend", `✅ Frontend server started successfully (npm run dev)`, "success");
      }

      resolve();
    }, 3000); // Give more time for frontend server to start
  });
}

// Function to find an available port starting from a preferred port
async function findAvailablePort(preferredPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const net = require('net');

    const server = net.createServer();

    server.listen(preferredPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        // Port is in use, try the next port
        logger.info(`Port ${preferredPort} is in use, trying next port...`);
        findAvailablePort(preferredPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

async function initializeDatabaseForFramework(backendPath: string, framework: string): Promise<void> {
  switch (framework) {
    case "django":
      // For Django, run migrations to create database tables
      try {
        logger.info(`Running Django migrations in ${backendPath}`);
        await runCommandInDirectory(backendPath, "python manage.py makemigrations");
        await runCommandInDirectory(backendPath, "python manage.py migrate");
        logger.info(`Django database initialized successfully`);
      } catch (error) {
        logger.warn(`Failed to run Django migrations:`, error);
        throw error;
      }
      break;

    case "fastapi":
      // For FastAPI, the database tables are created automatically when the app starts
      // due to the models.Base.metadata.create_all(bind=engine) call in main.py
      logger.info(`FastAPI database will be initialized when server starts`);
      break;

    case "flask":
      // For Flask, the database tables are created automatically when the app starts
      // due to the db.create_all() call in app.py
      logger.info(`Flask database will be initialized when server starts`);
      break;

    case "nodejs":
      // For Node.js, the database tables are created automatically when the server starts
      // due to the CREATE TABLE IF NOT EXISTS statement in db.js
      logger.info(`Node.js SQLite database will be initialized when server starts`);
      break;

    default:
      logger.warn(`Unknown framework for database initialization: ${framework}`);
  }
}

async function runCommandInDirectory(directory: string, command: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const { spawn } = require('child_process');
    const process = spawn(command, [], {
      cwd: directory,
      shell: true,
      stdio: "pipe",
    });

    logger.info(`Running command: ${command} in ${directory}`);

    let stdout = "";
    let stderr = "";

    process.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    process.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    process.on("close", (code: number | null) => {
      if (code === 0) {
        logger.info(`Command completed successfully: ${command}`);
        resolve();
      } else {
        const error = new Error(`Command failed with code ${code}: ${stderr}`);
        logger.error(`Command failed: ${command}`, error);
        reject(error);
      }
    });

    process.on("error", (err: Error) => {
      logger.error(`Failed to start command: ${command}`, err);
      reject(err);
    });
  });
}

export async function getStartCommandForFramework(framework: string): Promise<string> {
  switch (framework) {
    case "nodejs":
      const nodePort = await findAvailablePort(3000);
      return `npm start -- --port ${nodePort}`;
    case "django":
      const djangoPort = await findAvailablePort(8000);
      return `python manage.py runserver 0.0.0.0:${djangoPort}`;
    case "fastapi":
      const fastapiPort = await findAvailablePort(8000);
      return `uvicorn main:app --reload --host 0.0.0.0 --port ${fastapiPort}`;
    case "flask":
      const flaskPort = await findAvailablePort(5000);
      return `PORT=${flaskPort} bash -c 'if command -v python3 >/dev/null 2>&1; then python3 app.py; elif command -v python >/dev/null 2>&1; then python app.py; else echo "Python not found. Please install Python 3."; exit 1; fi'`;
    default:
      logger.warn(`Unknown framework for server start: ${framework}`);
      return "";
  }
}

async function createBasicReactFiles(frontendPath: string) {
  logger.info(`Creating basic React files in ${frontendPath}`);

  try {
    // Create src directory
    const srcPath = path.join(frontendPath, "src");
    await fs.ensureDir(srcPath);

    // Create public directory
    const publicPath = path.join(frontendPath, "public");
    await fs.ensureDir(publicPath);

    // Create index.html
    const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AliFullStack App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
    await fs.writeFile(path.join(frontendPath, "index.html"), indexHtml);

    // Create src/main.tsx
    const mainTsx = `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)`;
    await fs.writeFile(path.join(srcPath, "main.tsx"), mainTsx);

    // Create src/App.tsx
    const appTsx = `import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>AliFullStack + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App`;
    await fs.writeFile(path.join(srcPath, "App.tsx"), appTsx);

    // Create src/index.css
    const indexCss = `:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

a {
  font-weight: 500;
  color: #646cff;
  text-decoration: inherit;
}
a:hover {
  color: #535bf2;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.25s;
}
button:hover {
  border-color: #646cff;
}
button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}

@media (prefers-color-scheme: light) {
  :root {
    color: #213547;
    background-color: #ffffff;
  }
  a:hover {
    color: #747bff;
  }
  button {
    background-color: #f9f9f9;
  }
}`;
    await fs.writeFile(path.join(srcPath, "index.css"), indexCss);

    // Create src/App.css
    const appCss = `#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}`;
    await fs.writeFile(path.join(srcPath, "App.css"), appCss);

    // Create src/vite-env.d.ts
    const viteEnv = `/// <reference types="vite/client" />`;
    await fs.writeFile(path.join(srcPath, "vite-env.d.ts"), viteEnv);

    logger.info(`Created all basic React files in ${frontendPath}`);

    // Create public/vite.svg
    const viteSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="31.88" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 257"><defs><linearGradient id="IconifyId1813088fe1fbc01fb466" x1="-.828%" x2="57.636%" y1="7.652%" y2="78.411%"><stop offset="0%" stop-color="#41D1FF"></stop><stop offset="100%" stop-color="#BD34FE"></stop></linearGradient><linearGradient id="IconifyId1813088fe1fbc01fb467" x1="43.376%" x2="50.316%" y1="2.242%" y2="89.03%"><stop offset="0%" stop-color="#FFEA83"></stop><stop offset="8.333%" stop-color="#FFDD35"></stop><stop offset="100%" stop-color="#FFA800"></stop></linearGradient></defs><path fill="url(#IconifyId1813088fe1fbc01fb466)" d="M255.153 37.938L134.897 252.976c-2.483 4.44-8.862 4.466-11.382.048L.875 37.958c-2.746-4.814 1.371-10.646 6.827-9.67l120.385 21.517a6.537 6.537 0 0 0 2.322-.004l117.867-21.483c5.438-.991 9.574 4.796 6.877 9.62Z"></path><path fill="url(#IconifyId1813088fe1fbc01fb467)" d="M185.432.063L96.44 17.501a3.268 3.268 0 0 0-2.634 3.014l-5.474 92.456a3.268 3.268 0 0 0 3.997 3.378l24.777-5.718c2.318-.535 4.413 1.507 3.936 3.838l-7.361 36.047c-.495 2.426 1.782 4.5 4.151 3.78l15.304-4.649c2.372-.72 4.652 1.36 4.15 3.788l-11.698 56.621c-.732 3.542 3.979 5.473 5.943 2.437l1.313-2.028l72.516-144.72c1.215-2.423-.88-5.186-3.54-4.672l-25.505 4.922c-2.396.462-4.435-1.77-3.759-4.114l16.646-57.705c.677-2.35-1.37-4.583-3.769-4.113Z"></path></svg>`;
    await fs.writeFile(path.join(publicPath, "vite.svg"), viteSvg);

    // Create src/assets/react.svg
    const assetsPath = path.join(srcPath, "assets");
    await fs.ensureDir(assetsPath);
    const reactSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="35.93" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 228"><path fill="#00D8FF" d="M210.483 73.824a171.49 171.49 0 0 0-8.24-2.597c.465-1.9.893-3.777 1.273-5.621c8.877-42.925-.571-69.08-27.523-69.08c-15.62 0-27.603 8.348-32.927 25.365c-3.765 12.055-1.838 25.884 5.293 39.847a171.034 171.034 0 0 0-7.38-1.634c-.771-2.163-1.539-4.316-2.295-6.454c-8.912-25.365-25.179-39.847-46.784-39.847c-21.604 0-37.97 14.482-46.882 39.847c-.764 2.138-1.509 4.291-2.245 6.454a171.092 171.092 0 0 0-7.379 1.634c7.128-13.963 9.055-27.792 5.292-39.847C78.894 12.692 66.91 4.345 51.29 4.345c-26.953 0-36.4 26.155-27.523 69.08c.38 1.844.808 3.721 1.273 5.621a171.572 171.572 0 0 0-8.241 2.597C4.596 83.687.003 108.718.003 135.5c0 52.886 32.035 93.262 78.08 93.262c21.604 0 37.97-14.482 46.882-39.847c.748-2.122 1.488-4.232 2.245-6.331a170.964 170.964 0 0 0 7.379 1.634c-7.129 13.963-9.056 27.792-5.292 39.847C103.167 218.318 115.15 226.665 130.77 226.665c46.046 0 78.08-40.376 78.08-93.262c-.001-26.782-4.593-51.813-14.356-61.676ZM78.08 188.973c-25.243 0-42.682-23.915-42.682-53.473c0-23.832 11.276-42.115 29.021-52.646c-2.637 8.704-3.923 18.202-3.923 28.189c0 7.32.665 14.558 1.96 21.624a75.404 75.404 0 0 1 14.663-1.959c27.154 0 48.6 16.466 48.6 44.831c0 28.365-21.446 44.831-48.6 44.831c-7.415 0-14.176-.901-19.785-2.552c5.375 9.472 12.865 16.341 22.346 20.605Zm42.667 0c5.375-9.472 12.865-16.341 22.346-20.605c-5.609 1.651-12.37 2.552-19.785 2.552c-27.154 0-48.6-16.466-48.6-44.831c0-28.365 21.446-44.831 48.6-44.831a75.404 75.404 0 0 1 14.663 1.959c1.295-7.066 1.96-14.304 1.96-21.624c0-9.987-1.286-19.485-3.923-28.189c17.745 10.531 29.021 28.814 29.021 52.646c.001 29.558-17.439 53.473-42.682 53.473Z"></path></svg>`;
    await fs.writeFile(path.join(assetsPath, "react.svg"), reactSvg);

    logger.info(`Created basic React files in ${frontendPath}`);
  } catch (error) {
    logger.error(`Failed to create basic React files:`, error);
  }
}
