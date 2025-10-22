# Changelog v0.0.5

## 🚀 Features

### Dependency Management System
- **System Dependency Detection**: Added automatic detection of missing system dependencies (uvicorn, npx) in release binaries
- **Permission Request Dialog**: Implemented user-friendly permission dialog that appears when system dependencies are missing
- **Auto-Installation**: Added automatic installation of missing dependencies with user approval
- **PATH Environment Capture**: Enhanced PATH environment variable capture using login shells in packaged applications

### Build Fixes
- **Vite Configuration**: Fixed Node.js module bundling issues in electron-forge builds
- **External Modules**: Properly externalized Node.js fs and path modules for renderer builds
- **Syntax Error Resolution**: Fixed misplaced export statements and import issues in TypeScript files

## 🐛 Bug Fixes

- **Release Binary Startup**: Fixed "command not found" errors for uvicorn and npx in packaged Electron applications
- **Import Errors**: Resolved Node.js fs module import issues in Vite builds
- **Build Configuration**: Updated renderer config to prevent bundling conflicts with Node.js modules

## 🔧 Technical Improvements

- **Error Handling**: Enhanced error detection and user feedback for missing system dependencies
- **Cross-Platform Support**: Improved compatibility across different operating systems
- **User Experience**: Better error messages and permission request flows

## 📦 Files Changed

- `vite.renderer.config.mts`: Added external module configuration
- `vite.main.config.mts`: Updated external modules list
- `src/ipc/utils/file_utils.ts`: Fixed Node.js import syntax
- `src/ipc/handlers/app_handlers.ts`: Added dependency detection logic
- Various dependency management files added for system dependency handling

---

*This version resolves critical issues with system dependency availability in packaged Electron applications, ensuring smooth startup and operation across different user environments.*