# Build Scripts

Unified build scripts for creating AliFullStack binaries across all platforms (macOS, Windows, Linux).

## Quick Start

```bash
# Build for current platform
pnpm build

# Build for all platforms
pnpm build:all

# Clean and build for all platforms
pnpm build:clean

# Build for specific platform
pnpm build:mac
pnpm build:win
pnpm build:linux
```

## Scripts

### `build.sh` (macOS/Linux)
Bash script for Unix-like systems.

### `build.bat` (Windows)
Batch script for Windows systems.

## Usage

### Direct Script Usage

#### macOS/Linux
```bash
# Build for current platform (auto-detected)
./scripts/build.sh

# Build for all platforms
./scripts/build.sh --all

# Clean and build for all platforms
./scripts/build.sh --clean

# Build for specific platform(s)
./scripts/build.sh mac
./scripts/build.sh win
./scripts/build.sh linux
./scripts/build.sh mac win

# Show help
./scripts/build.sh --help
```

#### Windows
```cmd
REM Build for current platform (Windows)
scripts\build.bat

REM Build for all platforms
scripts\build.bat --all

REM Clean and build for all platforms
scripts\build.bat --clean

REM Build for specific platform(s)
scripts\build.bat mac
scripts\build.bat win
scripts\build.bat linux
scripts\build.bat mac win

REM Show help
scripts\build.bat --help
```

### Via npm/pnpm Scripts

```bash
# Build for current platform
pnpm build

# Clean and build
pnpm build:clean

# Build for all platforms
pnpm build:all

# Build for specific platform
pnpm build:mac
pnpm build:win
pnpm build:linux
```

## Command-Line Options

| Option | Description |
|--------|-------------|
| `--clean` | Clean previous builds before building |
| `--help`, `-h` | Show help message |
| `mac`, `darwin` | Build for macOS |
| `win`, `windows`, `win32` | Build for Windows |
| `linux` | Build for Linux |
| `all` | Build for all platforms |

## Features

- **Platform Detection**: Automatically detects current platform if none specified
- **Prerequisites Validation**: Checks for Node.js, package manager, and required files
- **Clean Option**: Removes previous build artifacts before building
- **Error Handling**: Clear error messages and build status reporting
- **Progress Indicators**: Colored output showing build progress
- **Cross-Platform**: Works on macOS, Linux, and Windows

## Build Output

All build artifacts are placed in the `out/` directory:
- `out/make/` - Platform-specific installers and packages
- `out/AliFullStack-*.dmg` - macOS disk image
- `out/AliFullStack Setup *.exe` - Windows installer
- `out/AliFullStack-*.AppImage` - Linux AppImage
- `out/AliFullStack-*.deb` - Debian package
- `out/AliFullStack-*.rpm` - RPM package

## Prerequisites

- Node.js >= 20
- pnpm (recommended) or npm
- All dependencies installed (`pnpm install`)
- Platform-specific signing certificates (for macOS notarization)

## Examples

### Build for current platform only
```bash
./scripts/build.sh
```

### Build for macOS and Windows
```bash
./scripts/build.sh mac win
```

### Clean everything and build for all platforms
```bash
./scripts/build.sh --clean --all
```

### CI/CD Usage
```bash
# In GitHub Actions or other CI
./scripts/build.sh --clean --all
```

## Troubleshooting

### "Node.js not found"
Ensure Node.js is installed and in your PATH.

### "package.json not found"
Run the script from the project root directory.

### "node_modules not found"
Install dependencies first: `pnpm install`

### Build fails for specific platform
- **macOS**: Ensure you have the required signing certificates and environment variables set
- **Windows**: Run from a machine with Windows, or use Wine for cross-compilation (not recommended)
- **Linux**: Ensure you have the required packaging tools installed

## Notes

- Cross-platform builds (e.g., building Windows binaries on macOS) are not officially supported by Electron Forge
- For production releases, build on the target platform or use CI/CD services like GitHub Actions
- The `--clean` option removes the `out/` and `scaffold/node_modules/` directories
