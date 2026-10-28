# Build Script Documentation

This document describes the build configuration for creating distributable binaries of AliFullStack.

## Overview

The project uses **Electron Forge** as the build/packaging tool. The build configuration has been updated to support creating binaries for multiple platforms:

- **macOS** - DMG installer
- **Windows** - NSIS installer (EXE)
- **Linux** - AppImage, DEB, and RPM packages

## Changes Made

### 1. Updated `package.json`

Added new build scripts and maker dependencies:

**New Scripts:**

- `make:all` - Build for all platforms (macOS, Windows, Linux)
- `make:mac` - Build for macOS only (DMG)
- `make:win` - Build for Windows only (NSIS/EXE)
- `make:linux` - Build for Linux only (AppImage/DEB/RPM)

**New Dependencies:**

- `@electron-forge/maker-dmg` - macOS DMG maker
- `@electron-forge/maker-nsis` - Windows NSIS installer maker
- `@electron-forge/maker-appimage` - Linux AppImage maker

### 2. Updated `forge.config.ts`

Added platform-specific makers with proper configuration:

- **MakerDMG** - Creates macOS DMG with custom icon from `assets/icon/logo.icns`
- **MakerNSIS** - Creates Windows EXE installer with custom icon from `assets/icon/logo.ico`
- **MakerAppImage** - Creates Linux AppImage with custom icon from `assets/icon/logo.png`

## Prerequisites

### Required Dependencies

Before building, ensure you have the following installed:

1. **Node.js** >= 20 (as specified in `engines` field)
2. **pnpm** (project uses pnpm as package manager)
3. **Platform-specific build tools:**

#### For macOS builds:

- Xcode Command Line Tools: `xcode-select --install`
- For notarization (optional): Apple Developer account with valid credentials

#### For Windows builds:

- Visual Studio Build Tools or Visual Studio Community
- Windows SDK

#### For Linux builds:

- `fakeroot` (for AppImage)
- `xz-utils` (for AppImage compression)
- `patchelf` (for AppImage)
- `libfuse2` (for AppImage runtime)

Install Linux dependencies on Ubuntu/Debian:

```bash
sudo apt-get install fakeroot xz-utils patchelf libfuse2
```

### Install Project Dependencies

```bash
pnpm install
```

## Building Binaries

### Build for All Platforms

```bash
pnpm make:all
```

This will create binaries for macOS, Windows, and Linux. Note: Cross-platform builds require running on the target platform or using CI/CD with appropriate runners.

### Build for Specific Platform

**macOS (DMG):**

```bash
pnpm make:mac
```

Output: `out/AliFullStack-<version>.dmg`

**Windows (NSIS/EXE):**

```bash
pnpm make:win
```

Output: `out/AliFullStack Setup <version>.exe`

**Linux (AppImage/DEB/RPM):**

```bash
pnpm make:linux
```

Output:

- `out/AliFullStack-<version>.AppImage`
- `out/alifullstack_<version>_amd64.deb`
- `out/alifullstack-<version>.x86_64.rpm`

### Standard Build Commands

The existing commands are still available:

```bash
# Package the app (creates unpacked distribution)
pnpm package

# Make distributable binaries (uses current platform)
pnpm make

# Clean build artifacts
pnpm clean
```

## Build Output

All build artifacts are placed in the `out/` directory:

```
out/
├── AliFullStack-darwin-x64/           # macOS unpacked
├── AliFullStack-darwin-arm64/         # macOS ARM unpacked
├── AliFullStack-win32-x64/            # Windows unpacked
├── AliFullStack-linux-x64/            # Linux unpacked
├── AliFullStack-<version>.dmg         # macOS installer
├── AliFullStack Setup <version>.exe   # Windows installer
├── AliFullStack-<version>.AppImage    # Linux AppImage
├── alifullstack_<version>_amd64.deb   # Debian package
└── alifullstack-<version>.x86_64.rpm  # RPM package
```

## Icon Assets

The build configuration references the following icon files in `assets/icon/`:

- **macOS**: `logo.icns` (used by MakerDMG)
- **Windows**: `logo.ico` (used by MakerNSIS)
- **Linux**: `logo.png` (used by MakerAppImage)

These icons are already present in the repository and are automatically picked up by the build configuration.

## App Metadata

The application metadata is defined in `package.json`:

- **Name**: `alifullstack`
- **Product Name**: `AliFullStack`
- **Version**: `0.1.0` (update as needed)
- **Description**: "Free, local, open-source AI app builder"
- **Author**: Will Chen (willchen90@gmail.com)
- **License**: MIT

## Code Signing

### macOS Code Signing

For production macOS builds, code signing is configured in `forge.config.ts`. Set the following environment variables:

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_PASSWORD="your-app-specific-password"
export APPLE_TEAM_ID="your-team-id"
```

For development or testing builds, set `E2E_TEST_BUILD=true` to skip signing:

```bash
E2E_TEST_BUILD=true pnpm make:mac
```

### Windows Code Signing

Windows code signing is not currently configured. To add code signing, you would need to:

1. Obtain a code signing certificate
2. Configure signing in `forge.config.ts` using `win32Metadata` or a custom sign tool

## CI/CD Integration

For automated builds in CI/CD, consider using:

- **GitHub Actions** with `electron-forge` action or custom workflow
- **Build on native runners** (macOS builds must run on macOS, Windows builds on Windows)
- **Cross-platform strategy**: Use separate jobs for each platform

Example GitHub Actions workflow structure:

```yaml
jobs:
  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm make:mac
      - uses: actions/upload-artifact@v4
        with:
          name: mac-build
          path: out/*.dmg

  build-win:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: pnpm make:win
      - uses: actions/upload-artifact@v4
        with:
          name: win-build
          path: out/*.exe

  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: sudo apt-get install -y fakeroot xz-utils patchelf libfuse2
      - run: pnpm install
      - run: pnpm make:linux
      - uses: actions/upload-artifact@v4
        with:
          name: linux-build
          path: out/*.AppImage
```

## Troubleshooting

### Common Issues

1. **"Command not found: electron-forge"**

   - Run `pnpm install` to install dependencies
   - Ensure `node_modules/.bin` is in your PATH

2. **macOS build fails with signing errors**

   - Set `E2E_TEST_BUILD=true` to skip signing for testing
   - Verify Apple ID credentials are correct
   - Ensure you have a valid Apple Developer account

3. **Linux AppImage fails to run**

   - Ensure `libfuse2` is installed on the target system
   - Make the AppImage executable: `chmod +x AliFullStack-*.AppImage`

4. **Windows build fails with MSI/NSIS errors**
   - Install Visual Studio Build Tools
   - Ensure Windows SDK is installed

## Publishing

The project is configured to publish to GitHub Releases using `@electron-forge/publisher-github`. To publish:

```bash
pnpm publish
```

This requires:

1. `GITHUB_TOKEN` environment variable with repo permissions
2. A git tag matching the version in `package.json`

## Additional Notes

- The build uses **Vite** for bundling the renderer process
- **ASAR** packaging is enabled for better performance
- Native modules like `better-sqlite3` are automatically unpacked
- The `ignore` function in `forge.config.ts` excludes unnecessary files from the build

## References

- [Electron Forge Documentation](https://www.electronforge.io/)
- [Electron Forge Makers](https://www.electronforge.io/configuration/makers)
- [Electron Forge Publishers](https://www.electronforge.io/configuration/publishers)
